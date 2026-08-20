import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/dal";
import type { Prisma } from "@/generated/prisma/client";
import { Button, buttonClass } from "@/components/button";

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-800",
  IN_REPAIR: "bg-amber-100 text-amber-800",
  STORAGE: "bg-neutral-100 text-neutral-700",
  RETIRED: "bg-neutral-200 text-neutral-500",
  LOST: "bg-red-100 text-red-800",
  DESTROYED: "bg-red-100 text-red-800",
};

export default async function AssetsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; department?: string; status?: string; type?: string }>;
}) {
  await requireCurrentUser();
  const { q, department, status, type } = await searchParams;

  const where: Prisma.AssetWhereInput = {};
  if (department) where.owningDepartmentId = department;
  if (status) where.status = status as Prisma.EnumAssetStatusFilter["equals"];
  if (type) where.assetTypeId = type;
  if (q) {
    where.OR = [
      { assetTag: { contains: q, mode: "insensitive" } },
      { name: { contains: q, mode: "insensitive" } },
    ];
  }

  const [assets, departments, assetTypes] = await Promise.all([
    prisma.asset.findMany({
      where,
      orderBy: { assetTag: "asc" },
      include: { owningDepartment: true, assetType: true, currentLocation: true },
      take: 200,
    }),
    prisma.department.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.assetType.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-neutral-900">Assets</h1>
          <p className="text-sm text-neutral-500">{assets.length} shown</p>
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

      <form method="get" action="/assets/qr-sheet">
        <div className="mb-2 flex justify-end">
          <Button type="submit" variant="secondary">
            Print QR sheet for selected
          </Button>
        </div>
        <table className="w-full overflow-hidden rounded-md border border-neutral-200 bg-white text-sm">
          <thead className="bg-neutral-100 text-left text-xs uppercase text-neutral-500">
            <tr>
              <th className="w-8 px-4 py-2" />
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
                  <input type="checkbox" name="tags" value={asset.assetTag} aria-label={`Select ${asset.assetTag}`} />
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
      </form>
    </div>
  );
}
