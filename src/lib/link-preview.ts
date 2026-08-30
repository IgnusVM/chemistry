import "server-only";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/**
 * Fetch the Open Graph metadata for a pasted link.
 *
 * This is the one place in the application that makes an outbound HTTP request
 * to an address a user chose, which makes it the one place that can be pointed
 * at the server's own network. That is not theoretical here: this process holds
 * AWS credentials, and cloud metadata services answer on 169.254.169.254 to
 * anything that can reach them. An unguarded preview fetcher is a credential
 * exfiltration primitive.
 *
 * So every hop is checked, not just the first:
 *   - http/https only (no file:, no gopher:, no data:)
 *   - the hostname is resolved and the resulting ADDRESS is checked, because
 *     a name under someone else's control can point at a private range
 *   - redirects are followed by hand, re-resolving and re-checking each time,
 *     since a public URL that 302s to metadata defeats a first-hop-only check
 *   - a timeout, a redirect cap and a response size cap, so a hostile or merely
 *     enormous page cannot hold a request open or exhaust memory
 *
 * It runs once, when an admin writes the post, and the result is stored. The
 * feed never fetches anything while someone scrolls.
 */

const TIMEOUT_MS = 6000;
const MAX_REDIRECTS = 3;
const MAX_BYTES = 512 * 1024;

export type LinkPreview = {
  url: string;
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  siteName: string | null;
};

/** Private, loopback, link-local and other ranges no user link should reach. */
function isBlockedAddress(ip: string): boolean {
  if (isIP(ip) === 6) {
    const v6 = ip.toLowerCase();
    if (v6 === "::1" || v6 === "::") return true;
    if (v6.startsWith("fe80") || v6.startsWith("fc") || v6.startsWith("fd")) return true;
    // IPv4-mapped (::ffff:169.254.169.254) — unwrap and check as v4.
    const mapped = v6.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isBlockedAddress(mapped[1]);
    return false;
  }

  const p = ip.split(".").map(Number);
  if (p.length !== 4 || p.some((n) => Number.isNaN(n))) return true;
  const [a, b] = p;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;             // link-local, incl. cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;   // carrier-grade NAT
  if (a >= 224) return true;                            // multicast and reserved
  return false;
}

async function assertPublicUrl(raw: string): Promise<URL> {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    throw new Error("That doesn't look like a link.");
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    throw new Error("Only http and https links can be previewed.");
  }

  const host = u.hostname.replace(/^\[|\]$/g, "");
  if (isIP(host)) {
    if (isBlockedAddress(host)) throw new Error("That address isn't reachable from here.");
    return u;
  }
  // Resolve every address the name has, and refuse if ANY is private: a name
  // that answers with both a public and a private address would otherwise be a
  // coin flip.
  const results = await lookup(host, { all: true }).catch(() => {
    throw new Error("Couldn't look up that address.");
  });
  if (!results.length) throw new Error("Couldn't look up that address.");
  if (results.some((r) => isBlockedAddress(r.address))) {
    throw new Error("That address isn't reachable from here.");
  }
  return u;
}

/** Read at most MAX_BYTES of the body, so an endless response can't exhaust us. */
async function readCapped(res: Response): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > MAX_BYTES) { await reader.cancel(); break; }
    chunks.push(value);
  }
  return Buffer.concat(chunks.map((c) => Buffer.from(c))).toString("utf8");
}

function meta(html: string, keys: string[]): string | null {
  for (const key of keys) {
    const re = new RegExp(
      `<meta[^>]+(?:property|name)\\s*=\\s*["']${key}["'][^>]*>`,
      "i",
    );
    const tag = html.match(re)?.[0];
    const content = tag?.match(/content\s*=\s*["']([^"']*)["']/i)?.[1];
    if (content?.trim()) return decodeEntities(content.trim()).slice(0, 500);
  }
  return null;
}

function decodeEntities(s: string) {
  return s
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&nbsp;/g, " ");
}

export async function fetchLinkPreview(raw: string): Promise<LinkPreview> {
  let current = await assertPublicUrl(raw);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    let res: Response | null = null;
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      res = await fetch(current, {
        redirect: "manual",
        signal: controller.signal,
        headers: {
          // Identify honestly; some sites serve different metadata to bots.
          "user-agent": "ChemistryLinkPreview/1.0",
          accept: "text/html,application/xhtml+xml",
        },
      });
      if (res.status >= 300 && res.status < 400) {
        const next = res.headers.get("location");
        if (!next) break;
        // Re-check the destination. A public URL that redirects into the
        // private range is the whole attack, and checking only the first hop
        // would wave it through.
        current = await assertPublicUrl(new URL(next, current).toString());
        continue;
      }
      break;
    }

    if (!res || !res.ok) return bare(current);
    const type = res.headers.get("content-type") ?? "";
    if (!type.includes("html")) return bare(current);

    const html = await readCapped(res);
    const docTitle = decodeEntities(
      html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? "",
    ).slice(0, 500);
    const title = meta(html, ["og:title", "twitter:title"]) ?? (docTitle || null);
    const imageRaw = meta(html, ["og:image", "twitter:image"]);
    let imageUrl: string | null = null;
    if (imageRaw) {
      try {
        const abs = new URL(imageRaw, current);
        if (abs.protocol === "http:" || abs.protocol === "https:") imageUrl = abs.toString();
      } catch { /* an unusable image URL is not worth failing the post over */ }
    }

    return {
      url: current.toString(),
      title,
      description: meta(html, ["og:description", "twitter:description", "description"]),
      imageUrl,
      siteName: meta(html, ["og:site_name"]) ?? current.hostname,
    };
  } catch {
    // A preview is a nicety. If the site is slow, blocking us, or gone, the
    // post still goes up with a plain link rather than failing.
    return bare(current);
  } finally {
    clearTimeout(timer);
  }
}

function bare(u: URL): LinkPreview {
  return { url: u.toString(), title: null, description: null, imageUrl: null, siteName: u.hostname };
}

/** Pull http(s) URLs out of post text, in order, de-duplicated. */
export function extractUrls(text: string): string[] {
  const found = text.match(/https?:\/\/[^\s<>"')]+/gi) ?? [];
  return [...new Set(found.map((u) => u.replace(/[.,;:!?]+$/, "")))].slice(0, 3);
}
