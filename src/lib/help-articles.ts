import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";

/**
 * The set of help articles that actually exist, as `category/slug`.
 *
 * A help control must not render a link to a deleted article, and articles are
 * admin-editable, so existence is a database fact rather than something that can
 * be settled at build time.
 *
 * The naive reading of that — one query per control — would put five to ten
 * queries on a page that previously ran two. `cache()` dedupes within a single
 * request, so a page with eight controls issues one query and the rest are set
 * lookups. Same pattern `dal.ts` already uses for the current user.
 *
 * Both halves of the key matter: `slug` is globally unique, but the route is
 * `/help/<category>/<slug>` and the article page 404s when the category doesn't
 * match. A control keyed on slug alone could therefore render a link that
 * resolves to nothing.
 */
export const existingHelpArticles = cache(async (): Promise<ReadonlySet<string>> => {
  const rows = await prisma.helpArticle.findMany({ select: { category: true, slug: true } });
  return new Set(rows.map((r) => `${r.category}/${r.slug}`));
});
