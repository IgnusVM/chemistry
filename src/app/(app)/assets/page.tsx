import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/dal";
import { Button, buttonClass } from "@/components/button";
import { Pagination } from "@/components/pagination";
import { parsePage, parsePageSize } from "@/lib/list-page";
import { SelectionProvider } from "@/components/selection/selection-context";
import { SelectAllHeaderCheckbox } from "@/components/selection/select-all-checkbox";
import { RowCheckbox } from "@/components/selection/row-checkbox";
import { SelectionToolbar } from "@/components/selection/selection-toolbar";
import { buildAssetWhere, type AssetListParams } from "./where";
import { ASSET_STATUS_STYLES as STATUS_STYLES } from "@/lib/status-styles";

export default async function AssetsPage({
  searchParams,
}: {
  searchParams: Promise<AssetListParams & { page?: string; pageSize?: string }>;
}) {
  await requireCurrentUser();
  const params = await searchParams;
  const { q, department, status, type } = params;
  const page = parsePage(params.page);
  const pageSize = parsePageSize(params.pageSize);

  const where = buildAssetWhere(params);

  const [assets, total, departments, assetTypes] = await Promise.all([
    prisma.asset.findMany({
      where,
      orderBy: { assetTag: "asc" },
      include: { owningDepartment: true, assetType: true, currentLocation: true },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.asset.count({ where }),
    prisma.department.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.assetType.findMany({ orderBy: { name: "asc" } }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-neutral-900">Assets</h1>
          <p className="text-sm text-neutral-500">{total} total</p>
        </div>
        <div className="flex gap-2">
          <Link href="/assets/bulk-new" className={buttonClass("secondary")}>
            + Bulk create
          </Link>
          <Link href="/assets/new" className={buttonClass()}>
            + New asset
          </Link>
        </div>
      </div>

      <form className="flex flex-wrap gap-2 rounded-md border border-neutral-200 bg-white p-3">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search tag or name…"
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
        <select name="department" defaultValue={department ?? ""} className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm">
          <option value="">All departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <select name="type" defaultValue={type ?? ""} className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm">
          <option value="">All types</option>
          {assetTypes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <select name="status" defaultValue={status ?? ""} className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm">
          <option value="">All statuses</option>
          {Object.keys(STATUS_STYLES).map((s) => (
            <option key={s} value={s}>
              {s.replace("_", " ")}
            </option>
          ))}
        </select>
        <Button type="submit" variant="secondary">
          Filter
        </Button>
      </form>

      <SelectionProvider pageIds={assets.map((a) => a.id)} totalMatching={total}>
        <SelectionToolbar
          entityType="Asset"
          filterParams={{ q, department, status, type }}
          actions={[
            { label: "Bulk edit selected", targetPath: "/assets/bulk-edit" },
            { label: "Create work orders for selected", targetPath: "/work-orders/bulk-new", variant: "secondary" },
            { label: "Print QR sheet for selected", targetPath: "/assets/qr-sheet", variant: "secondary" },
          ]}
        />

        <table className="w-full overflow-hidden rounded-md border border-neutral-200 bg-white text-sm">
          <thead className="bg-neutral-100 text-left text-xs uppercase text-neutral-500">
            <tr>
              <th className="w-8 px-4 py-2">
                <SelectAllHeaderCheckbox />
              </th>
              <th className="px-4 py-2">Tag</th>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2">Department</th>
              <th className="px-4 py-2">Location</th>
              <th className="px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {assets.map((asset) => (
              <tr key={asset.id} className="hover:bg-neutral-50">
                <td className="px-4 py-2">
                  <RowCheckbox id={asset.id} label={`Select ${asset.assetTag}`} />
                </td>
                <td className="px-4 py-2">
                  <Link href={`/assets/${asset.assetTag}`} className="font-medium text-neutral-900 hover:underline">
                    {asset.assetTag}
                  </Link>
                </td>
                <td className="px-4 py-2">{asset.name}</td>
                <td className="px-4 py-2 text-neutral-500">{asset.assetType.name}</td>
                <td className="px-4 py-2 text-neutral-500">{asset.owningDepartment.name}</td>
                <td className="px-4 py-2 text-neutral-500">
                  {asset.currentLocation?.name ??
                    (asset.customLocationText ? (
                      <>
                        {asset.customLocationText} <span className="text-amber-500">*</span>
                      </>
                    ) : (
                      "—"
                    ))}
                </td>
                <td className="px-4 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_STYLES[asset.status]}`}>
                    {asset.status.replace("_", " ")}
                  </span>
                </td>
              </tr>
            ))}
            {assets.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-neutral-500">
                  No assets match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </SelectionProvider>

      <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} basePath="/assets" params={params} />
    </div>
  );
}
