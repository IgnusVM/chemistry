import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/dal";
import { bulkUpdateGroupStatus } from "../actions";
import { AddAssetsForm } from "./add-assets-form";
import { EditGroupHeader } from "./edit-group-header";
import { RemoveMemberButton } from "./remove-member-button";
import { RemoveSelectedButton } from "./remove-selected-button";
import { Button, buttonClass } from "@/components/button";
import { SelectionProvider } from "@/components/selection/selection-context";
import { SelectAllHeaderCheckbox } from "@/components/selection/select-all-checkbox";
import { RowCheckbox } from "@/components/selection/row-checkbox";
import { ASSET_STATUS_STYLES } from "@/lib/status-styles";

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
        <EditGroupHeader group={group} memberCount={group.members.length} />
        <Link href={`/assets/qr-sheet?group=${group.id}`} className={buttonClass("secondary")}>
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
            {Object.keys(ASSET_STATUS_STYLES).map((s) => (
              <option key={s} value={s}>
                {s.replace("_", " ")}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit">Apply to all {group.members.length}</Button>
      </form>

      <AddAssetsForm assetGroupId={group.id} />

      <SelectionProvider pageIds={group.members.map((m) => m.assetId)} totalMatching={group.members.length}>
        <div className="flex items-center">
          <RemoveSelectedButton assetGroupId={group.id} />
        </div>

        <div className="overflow-x-auto rounded-md border border-neutral-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-neutral-100 text-left text-xs uppercase text-neutral-500">
              <tr>
                <th className="w-8 px-3 py-2 sm:px-4">
                  <SelectAllHeaderCheckbox />
                </th>
                <th className="px-3 py-2 sm:px-4">Tag</th>
                <th className="px-3 py-2 sm:px-4">Name</th>
                <th className="hidden px-3 py-2 sm:px-4 md:table-cell">Department</th>
                <th className="hidden px-3 py-2 sm:px-4 md:table-cell">Location</th>
                <th className="px-3 py-2 sm:px-4">Status</th>
                <th className="px-3 py-2 sm:px-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {group.members.map((member) => (
                <tr key={member.assetId} className="hover:bg-neutral-50">
                  <td className="px-3 py-2 sm:px-4">
                    <RowCheckbox id={member.assetId} label={`Select ${member.asset.assetTag}`} />
                  </td>
                  <td className="px-3 py-2 sm:px-4">
                    <Link href={`/assets/${member.asset.assetTag}`} className="font-medium text-neutral-900 hover:underline">
                      {member.asset.assetTag}
                    </Link>
                  </td>
                  <td className="px-3 py-2 sm:px-4">{member.asset.name}</td>
                  <td className="hidden px-2 py-2 text-neutral-500 sm:px-4 md:table-cell">
                    {member.asset.owningDepartment.name}
                  </td>
                  <td className="hidden px-2 py-2 text-neutral-500 sm:px-4 md:table-cell">
                    {member.asset.currentLocation?.name ?? "—"}
                  </td>
                  <td className="px-3 py-2 sm:px-4">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${ASSET_STATUS_STYLES[member.asset.status]}`}>
                      {member.asset.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-3 py-2 sm:px-4 text-right">
                    <RemoveMemberButton assetGroupId={group.id} assetId={member.assetId} />
                  </td>
                </tr>
              ))}
              {group.members.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-neutral-500">
                    No assets in this group yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </SelectionProvider>
    </div>
  );
}
