import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/dal";
import { bulkUpdateGroupStatus } from "../actions";
import { AddAssetsForm } from "./add-assets-form";
import { RemoveMemberButton } from "./remove-member-button";

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-800",
  IN_REPAIR: "bg-amber-100 text-amber-800",
  STORAGE: "bg-neutral-100 text-neutral-700",
  RETIRED: "bg-neutral-200 text-neutral-500",
  LOST: "bg-red-100 text-red-800",
  DESTROYED: "bg-red-100 text-red-800",
};

export default async function AssetGroupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireCurrentUser();
  const { id } = await params;

  const group = await prisma.assetGroup.findUnique({
    where: { id },
    include: {
      members: {
        orderBy: { asset: { assetTag: "asc" } },
        include: { asset: { include: { owningDepartment: true, currentLocation: true } } },
      },
    },
  });
  if (!group) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-neutral-900">{group.name}</h1>
          {group.description && <p className="text-sm text-neutral-500">{group.description}</p>}
          <p className="mt-1 text-sm text-neutral-500">{group.members.length} assets</p>
        </div>
        <Link
          href={`/assets/qr-sheet?group=${group.id}`}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
        >
          Print QR sheet
        </Link>
      </div>

      <form
        action={bulkUpdateGroupStatus}
        className="flex flex-wrap items-end gap-3 rounded-md border border-neutral-200 bg-white p-4"
      >
        <input type="hidden" name="assetGroupId" value={group.id} />
        <div>
          <label className="block text-xs font-medium text-neutral-600">Set status for all members</label>
          <select name="status" defaultValue="ACTIVE" className="mt-1 rounded-md border border-neutral-300 px-2 py-1.5 text-sm">
            {Object.keys(STATUS_STYLES).map((s) => (
              <option key={s} value={s}>
                {s.replace("_", " ")}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Apply to all {group.members.length}
        </button>
      </form>

      <AddAssetsForm assetGroupId={group.id} />

      <table className="w-full overflow-hidden rounded-md border border-neutral-200 bg-white text-sm">
        <thead className="bg-neutral-100 text-left text-xs uppercase text-neutral-500">
          <tr>
            <th className="px-4 py-2">Tag</th>
            <th className="px-4 py-2">Name</th>
            <th className="px-4 py-2">Department</th>
            <th className="px-4 py-2">Location</th>
            <th className="px-4 py-2">Status</th>
            <th className="px-4 py-2" />
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200">
          {group.members.map((member) => (
            <tr key={member.assetId} className="hover:bg-neutral-50">
              <td className="px-4 py-2">
                <Link href={`/assets/${member.asset.assetTag}`} className="font-medium text-neutral-900 hover:underline">
                  {member.asset.assetTag}
                </Link>
              </td>
              <td className="px-4 py-2">{member.asset.name}</td>
              <td className="px-4 py-2 text-neutral-500">{member.asset.owningDepartment.name}</td>
              <td className="px-4 py-2 text-neutral-500">{member.asset.currentLocation?.name ?? "—"}</td>
              <td className="px-4 py-2">
                <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_STYLES[member.asset.status]}`}>
                  {member.asset.status.replace("_", " ")}
                </span>
              </td>
              <td className="px-4 py-2 text-right">
                <RemoveMemberButton assetGroupId={group.id} assetId={member.assetId} />
              </td>
            </tr>
          ))}
          {group.members.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-6 text-center text-neutral-500">
                No assets in this group yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
