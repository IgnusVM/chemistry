/**
 * Validates a caller-supplied `next` destination before redirecting to it.
 *
 * The obvious check — `value.startsWith("/")` — is not enough. A URL resolver
 * treats a leading `//` (and, in browsers, `/\`) as protocol-relative, so
 * `//evil.com` passes that test and resolves to a *different origin*:
 *
 *     new URL("//evil.com", "https://cmms.example.org")  ->  https://evil.com/
 *
 * That turns a legitimate sign-in link into a phishing tool: the victim visits
 * the real domain, sees the real certificate, authenticates for real, and is
 * then handed to an attacker's page — which is a very convincing place to show
 * a "your session expired, sign in again" form.
 *
 * Control characters matter too. URL parsers strip tabs and newlines *before*
 * resolving, so `"/\t/evil.com"` collapses to `"//evil.com"` and escapes the
 * origin even though its second character looked safe. Rather than trying to
 * replicate that normalization, reject anything containing a control character
 * or space outright — real paths encode those.
 */
export function safeNextPath(value: unknown, fallback = "/"): string {
  if (typeof value !== "string" || value === "") return fallback;

  // Control characters, DEL, and space — see the tab/newline note above.
  if (/[\u0000-\u0020\u007f]/.test(value)) return fallback;

  // Exactly one leading slash: a site-relative path and nothing else.
  // Rejects "//host", "///host", "/\host", "https://host", "javascript:...".
  if (!/^\/(?![/\\])/.test(value)) return fallback;

  return value;
}
