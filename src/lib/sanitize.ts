import DOMPurify from "isomorphic-dompurify";

/**
 * The single sanitizer every block of user- or admin-authored HTML passes
 * through before `dangerouslySetInnerHTML` — notes (any department member) and
 * Help articles (org admins).
 *
 * DOMPurify's defaults already stop the classic vectors: `<script>`,
 * `<iframe>`, `on*` handlers and `javascript:` URLs are removed, and `target`
 * is dropped from links (so tabnabbing via `window.opener` is not reachable
 * and needs no `rel` fix-up).
 *
 * What the defaults do allow, and this application has no use for, is
 * `<form>` and its inputs. Nothing executes — it isn't XSS — but without this
 * a note could render a working credential-harvesting form on the real domain,
 * inside the authenticated app, posting wherever it likes. Notes are writable
 * by any department member, so the bar for planting one is low. Help articles
 * go through the same path for consistency; there is no reason for the two to
 * differ.
 */

const FORBID_TAGS = ["form", "input", "button", "textarea", "select", "option", "fieldset", "legend"];

export function sanitizeRichHtml(html: string): string {
  return DOMPurify.sanitize(html, { FORBID_TAGS });
}
