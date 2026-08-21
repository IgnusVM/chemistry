/**
 * Resolves a QR payload to an asset tag.
 *
 * Chemistry stickers encode the full scan URL (e.g. https://host/a/LL-0001),
 * but people also stick plain tags in QR generators, and a sticker read off a
 * different deployment will carry a different host — so accept a bare tag or
 * any URL whose path ends in /a/<tag> or /assets/<tag>, and ignore the origin.
 */
export function parseAssetTagFromScan(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;

  const fromPath = (pathname: string) => {
    const match = pathname.match(/\/(?:a|assets)\/([^/?#]+)/i);
    return match ? decodeURIComponent(match[1]) : null;
  };

  if (/^https?:\/\//i.test(value)) {
    try {
      const tag = fromPath(new URL(value).pathname);
      return tag && isPlausibleTag(tag) ? tag : null;
    } catch {
      return null;
    }
  }

  // Path-only payload, e.g. "/a/LL-0001"
  if (value.startsWith("/")) {
    const tag = fromPath(value);
    return tag && isPlausibleTag(tag) ? tag : null;
  }

  return isPlausibleTag(value) ? value : null;
}

/** Mirrors the character set allowed by assetTagSchema in src/lib/asset-tags.ts. */
function isPlausibleTag(tag: string) {
  return /^[A-Za-z0-9._-]{1,64}$/.test(tag);
}
