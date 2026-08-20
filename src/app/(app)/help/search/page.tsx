import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/dal";
import { categoryLabel } from "@/lib/help";
import { Button } from "@/components/button";

const PAGE_SIZE = 10;

export default async function HelpSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  await requireCurrentUser();
  const { q, page: pageParam } = await searchParams;
  const query = (q ?? "").trim();
  const page = Math.max(1, Number(pageParam) || 1);

  const where = query
    ? {
        OR: [
          { title: { contains: query, mode: "insensitive" as const } },
          { summary: { contains: query, mode: "insensitive" as const } },
          { body: { contains: query, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [results, total] = query
    ? await Promise.all([
        prisma.helpArticle.findMany({
          where,
          orderBy: [{ category: "asc" }, { order: "asc" }, { title: "asc" }],
          skip: (page - 1) * PAGE_SIZE,
          take: PAGE_SIZE,
        }),
        prisma.helpArticle.count({ where }),
      ])
    : [[], 0];

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div>
        <Link href="/help" className="text-xs text-neutral-500 hover:underline">
          ← Help &amp; Guide
        </Link>
        <h1 className="text-lg font-semibold text-neutral-900">Search results</h1>
      </div>

      <form action="/help/search" className="flex gap-2">
        <input
          name="q"
          defaultValue={query}
          placeholder="Search the help guide…"
          className="w-full max-w-md rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />
        <Button type="submit">Search</Button>
      </form>

      {query && <p className="text-sm text-neutral-500">{total} result{total === 1 ? "" : "s"} for &ldquo;{query}&rdquo;</p>}

      <div className="space-y-3">
        {results.map((article) => (
          <Link
            key={article.id}
            href={`/help/${article.category}/${article.slug}`}
            className="block rounded-md border border-neutral-200 bg-white p-4 hover:border-neutral-300 hover:bg-neutral-50"
          >
            <div className="text-xs uppercase tracking-wide text-neutral-400">{categoryLabel(article.category)}</div>
            <div className="font-medium text-neutral-900">{article.title}</div>
            {article.summary && <p className="mt-1 text-sm text-neutral-500">{article.summary}</p>}
          </Link>
        ))}
        {query && results.length === 0 && (
          <p className="text-sm text-neutral-500">No articles matched that search.</p>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-3 text-sm">
          {page > 1 && (
            <Link href={`/help/search?q=${encodeURIComponent(query)}&page=${page - 1}`} className="text-neutral-700 hover:underline">
              ← Previous
            </Link>
          )}
          <span className="text-neutral-500">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <Link href={`/help/search?q=${encodeURIComponent(query)}&page=${page + 1}`} className="text-neutral-700 hover:underline">
              Next →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
