import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireOrgAdmin } from "@/lib/dal";
import { categoryLabel } from "@/lib/help";
import { buttonClass } from "@/components/button";

export default async function HelpAdminPage() {
  await requireOrgAdmin();

  const articles = await prisma.helpArticle.findMany({
    orderBy: [{ category: "asc" }, { order: "asc" }, { title: "asc" }],
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/help" className="text-xs text-neutral-500 hover:underline">
            ← Help &amp; Guide
          </Link>
          <h1 className="text-lg font-semibold text-neutral-900">Manage help articles</h1>
          <p className="text-sm text-neutral-500">{articles.length} article{articles.length === 1 ? "" : "s"}</p>
        </div>
        <Link href="/help/admin/new" className={buttonClass()}>
          + New article
        </Link>
      </div>

      <table className="w-full overflow-hidden rounded-md border border-neutral-200 bg-white text-sm">
        <thead className="bg-neutral-100 text-left text-xs uppercase text-neutral-500">
          <tr>
            <th className="px-4 py-2">Title</th>
            <th className="px-4 py-2">Category</th>
            <th className="px-4 py-2">Slug</th>
            <th className="px-4 py-2">Order</th>
            <th className="px-4 py-2">Updated</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200">
          {articles.map((a) => (
            <tr key={a.id} className="hover:bg-neutral-50">
              <td className="px-4 py-2">
                <Link href={`/help/admin/${a.id}/edit`} className="font-medium text-neutral-900 hover:underline">
                  {a.title}
                </Link>
              </td>
              <td className="px-4 py-2 text-neutral-500">{categoryLabel(a.category)}</td>
              <td className="px-4 py-2 text-neutral-500">{a.slug}</td>
              <td className="px-4 py-2 text-neutral-500">{a.order}</td>
              <td className="px-4 py-2 text-neutral-500">{a.updatedAt.toLocaleDateString()}</td>
            </tr>
          ))}
          {articles.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-6 text-center text-neutral-500">
                No articles yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
