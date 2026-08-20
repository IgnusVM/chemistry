import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/dal";
import { HELP_CATEGORIES, renderHelpMarkdown } from "@/lib/help";
import { Button, buttonClass } from "@/components/button";

export default async function HelpLandingPage() {
  const user = await requireCurrentUser();

  const [quickGuide, counts] = await Promise.all([
    prisma.helpArticle.findFirst({ where: { slug: "quick-guide" } }),
    prisma.helpArticle.groupBy({ by: ["category"], _count: { _all: true } }),
  ]);

  const countByCategory = new Map(counts.map((c) => [c.category, c._count._all]));

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-semibold text-neutral-900">Help &amp; Guide</h1>
          <p className="text-sm text-neutral-500">Everything you need to know about using Chemistry.</p>
        </div>
        {user.isOrgAdmin && (
          <Link href="/help/admin" className={buttonClass("secondary")}>
            Manage articles
          </Link>
        )}
      </div>

      <form action="/help/search" className="flex gap-2">
        <input
          name="q"
          placeholder="Search the help guide…"
          className="w-full max-w-md rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />
        <Button type="submit">Search</Button>
      </form>

      {quickGuide ? (
        <div className="rounded-md border border-neutral-200 bg-white p-6">
          <div className="text-xs uppercase tracking-wide text-neutral-400">Quick guide</div>
          <h2 className="mt-1 text-lg font-semibold text-neutral-900">{quickGuide.title}</h2>
          <div
            className="prose prose-neutral prose-sm mt-3 max-w-none"
            dangerouslySetInnerHTML={{ __html: renderHelpMarkdown(quickGuide.body) }}
          />
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-neutral-300 bg-neutral-50 p-6 text-sm text-neutral-500">
          No quick guide has been written yet.
        </div>
      )}

      <div>
        <h2 className="text-sm font-semibold text-neutral-900">Browse by topic</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {HELP_CATEGORIES.map((cat) => (
            <Link
              key={cat.slug}
              href={`/help/${cat.slug}`}
              className="rounded-md border border-neutral-200 bg-white p-4 hover:border-neutral-300 hover:bg-neutral-50"
            >
              <div className="font-medium text-neutral-900">{cat.label}</div>
              <div className="text-sm text-neutral-500">
                {countByCategory.get(cat.slug) ?? 0} article{(countByCategory.get(cat.slug) ?? 0) === 1 ? "" : "s"}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
