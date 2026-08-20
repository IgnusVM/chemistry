import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/dal";
import { HELP_CATEGORIES, categoryLabel, isValidCategory } from "@/lib/help";

const PAGE_SIZE = 20;

export default async function HelpCategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  await requireCurrentUser();
  const { category } = await params;
  if (!isValidCategory(category)) notFound();
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const [articles, total] = await Promise.all([
    prisma.helpArticle.findMany({
      where: { category },
      orderBy: [{ order: "asc" }, { title: "asc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.helpArticle.count({ where: { category } }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div>
        <Link href="/help" className="text-xs text-neutral-500 hover:underline">
          ← Help &amp; Guide
        </Link>
        <h1 className="text-lg font-semibold text-neutral-900">{categoryLabel(category)}</h1>
      </div>

      <div className="flex flex-wrap gap-2">
        {HELP_CATEGORIES.map((c) => (
          <Link
            key={c.slug}
            href={`/help/${c.slug}`}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              c.slug === category ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
            }`}
          >
            {c.label}
          </Link>
        ))}
      </div>

      <div className="space-y-3">
        {articles.map((article) => (
          <Link
            key={article.id}
            href={`/help/${category}/${article.slug}`}
            className="block rounded-md border border-neutral-200 bg-white p-4 hover:border-neutral-300 hover:bg-neutral-50"
          >
            <div className="font-medium text-neutral-900">{article.title}</div>
            {article.summary && <p className="mt-1 text-sm text-neutral-500">{article.summary}</p>}
          </Link>
        ))}
        {articles.length === 0 && <p className="text-sm text-neutral-500">No articles in this topic yet.</p>}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-3 text-sm">
          {page > 1 && (
            <Link href={`/help/${category}?page=${page - 1}`} className="text-neutral-700 hover:underline">
              ← Previous
            </Link>
          )}
          <span className="text-neutral-500">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <Link href={`/help/${category}?page=${page + 1}`} className="text-neutral-700 hover:underline">
              Next →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
