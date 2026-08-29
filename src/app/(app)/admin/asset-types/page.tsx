import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireOrgAdminPage } from "@/lib/dal";
import { AssetTypeForm } from "./asset-type-form";
import type { CustomFieldDef } from "@/lib/custom-fields";

export default async function AssetTypesAdminPage() {
  await requireOrgAdminPage();
  const [assetTypes, departments] = await Promise.all([
    prisma.assetType.findMany({
      orderBy: { name: "asc" },
      include: { defaultDepartment: true, _count: { select: { assets: true } } },
    }),
    prisma.department.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-neutral-900">Asset Types</h1>
        <p className="text-sm text-neutral-500">
          Templates that define what a class of asset is and what custom fields it tracks.
        </p>
      </div>

      <AssetTypeForm departments={departments} />

      <div className="space-y-3">
        {assetTypes.map((type) => {
          const fields = (type.customFieldSchema as unknown as CustomFieldDef[]) ?? [];
          return (
            <Link
              key={type.id}
              href={`/admin/asset-types/${type.id}`}
              className="block rounded-md border border-neutral-200 bg-white p-4 hover:border-neutral-300 hover:bg-neutral-50"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-neutral-900">{type.name}</div>
                  <div className="text-sm text-neutral-500">
                    {[type.manufacturer, type.model].filter(Boolean).join(" · ") || "—"}
                    {type.defaultDepartment && ` · ${type.defaultDepartment.name}`}
                  </div>
                </div>
                <div className="text-sm text-neutral-500">{type._count.assets} assets</div>
              </div>
              {fields.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {fields.map((f) => (
                    <span
                      key={f.key}
                      className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600"
                    >
                      {f.label} ({f.type})
                    </span>
                  ))}
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
