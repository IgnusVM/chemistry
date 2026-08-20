import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/dal";
import { categoryLabel, isValidCategory, renderHelpMarkdown } from "@/lib/help";
import { buttonClass } from "@/components/button";

export default async function HelpArticlePage({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}) {
  const user = await requireCurrentUser();
  const { category, slug } = await params;
  if (!isValidCategory(category)) notFound();

  const article = await prisma.helpArticle.findUnique({ where: { slug } });
  if (!article || article.category !== category) notFound();

  const related = await prisma.helpArticle.findMany({
    where: { category, NOT: { id: article.id } },
    orderBy: [{ order: "asc" }, { title: "asc" }],
    take: 8,
  });

  return (
    <div className="grid gap-6 lg:grid-cols-4">
      <div className="space-y-4 lg:col-span-3">
        <div className="flex items-start justify-between">
          <div>
            <Link href={`/help/${category}`} className="text-xs text-neutral-500 hover:underline">
              ← {categoryLabel(category)}
            </Link>
            <h1 className="text-xl font-semibold text-neutral-900">{article.title}</h1>
          </div>
          {user.isOrgAdmin && (
            <Link href={`/help/admin/${article.id}/edit`} className={buttonClass("secondary")}>
              Edit
            </Link>
          )}
        </div>

        <div
          className="prose prose-neutral prose-sm max-w-none rounded-md border border-neutral-200 bg-white p-6"
          dangerouslySetInnerHTML={{ __html: renderHelpMarkdown(article.body) }}
        />
      </div>

      <div className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
          More in {categoryLabel(category)}
        </h2>
        <ul className="space-y-1">
          {related.map((a) => (
            <li key={a.id}>
              <Link href={`/help/${category}/${a.slug}`} className="text-sm text-neutral-700 hover:underline">
                {a.title}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
