import Link from "next/link";
import { requireOrgAdmin } from "@/lib/dal";
import { ArticleForm } from "../article-form";

export default async function NewHelpArticlePage() {
  await requireOrgAdmin();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/help/admin" className="text-xs text-neutral-500 hover:underline">
          ← Manage help articles
        </Link>
        <h1 className="text-lg font-semibold text-neutral-900">New article</h1>
      </div>
      <ArticleForm />
    </div>
  );
}
