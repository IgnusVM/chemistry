import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/dal";
import { CreateGroupForm } from "./create-group-form";
import { buttonClass } from "@/components/button";

export default async function AssetGroupsPage() {
  await requireCurrentUser();
  const groups = await prisma.assetGroup.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { members: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-neutral-900">Asset groups</h1>
          <p className="text-sm text-neutral-500">Batches created together — for bulk updates and QR sheets.</p>
        </div>
        <Link href="/assets/bulk-new" className={buttonClass()}>
          + Bulk create
        </Link>
      </div>

      <CreateGroupForm />

      <table className="w-full overflow-hidden rounded-md border border-neutral-200 bg-white text-sm">
        <thead className="bg-neutral-100 text-left text-xs uppercase text-neutral-500">
          <tr>
            <th className="px-4 py-2">Name</th>
            <th className="px-4 py-2">Description</th>
            <th className="px-4 py-2">Members</th>
            <th className="px-4 py-2">Created</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200">
          {groups.map((group) => (
            <tr key={group.id} className="hover:bg-neutral-50">
              <td className="px-4 py-2">
                <Link href={`/asset-groups/${group.id}`} className="font-medium text-neutral-900 hover:underline">
                  {group.name}
                </Link>
              </td>
              <td className="px-4 py-2 text-neutral-500">{group.description ?? "—"}</td>
              <td className="px-4 py-2">{group._count.members}</td>
              <td className="px-4 py-2 text-neutral-500">{group.createdAt.toLocaleDateString()}</td>
            </tr>
          ))}
          {groups.length === 0 && (
            <tr>
              <td colSpan={4} className="px-4 py-6 text-center text-neutral-500">
                No asset groups yet. Bulk-create a batch to make one.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
