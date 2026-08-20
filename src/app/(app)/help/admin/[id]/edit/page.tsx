import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireOrgAdmin } from "@/lib/dal";
import { ArticleForm } from "../../article-form";
import { DeleteArticleButton } from "./delete-article-button";

export default async function EditHelpArticlePage({ params }: { params: Promise<{ id: string }> }) {
  await requireOrgAdmin();
  const { id } = await params;

  const article = await prisma.helpArticle.findUnique({ where: { id } });
  if (!article) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/help/admin" className="text-xs text-neutral-500 hover:underline">
            ← Manage help articles
          </Link>
          <h1 className="text-lg font-semibold text-neutral-900">Edit article</h1>
        </div>
        <DeleteArticleButton id={article.id} />
      </div>
      <ArticleForm article={article} />
    </div>
  );
}
