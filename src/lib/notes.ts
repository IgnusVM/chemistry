import "server-only";
import { marked } from "marked";
import { sanitizeRichHtml } from "@/lib/sanitize";
import type { NoteFormat } from "@/generated/prisma/client";

/**
 * The one path every note (asset or work order) renders through before
 * dangerouslySetInnerHTML. Markdown-format notes go through the same
 * `marked` renderer already used for the Help wiki first; HTML-format notes
 * (authored via the rich-text editor) pass through as-is. Either way the
 * result is always sanitized here — this is the non-negotiable layer, since
 * notes are authored by any department member, not just admins like Help
 * articles are.
 */
export function renderNoteHtml(body: string, format: NoteFormat): string {
  const html = format === "MARKDOWN" ? (marked.parse(body, { async: false, gfm: true, breaks: false }) as string) : body;
  return sanitizeRichHtml(html);
}

/**
 * Write-time sanitization for HTML-format note bodies (rich-text editor
 * output), before they're stored. Defense-in-depth alongside the mandatory
 * read-time sanitize in renderNoteHtml — not a substitute for it. Markdown
 * bodies are stored as plain source text, nothing to sanitize until render.
 */
export function sanitizeNoteBody(body: string, format: NoteFormat): string {
  if (format === "MARKDOWN") return body;
  return sanitizeRichHtml(body);
}
