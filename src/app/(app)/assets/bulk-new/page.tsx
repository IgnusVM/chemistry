import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/dal";
import { BulkAssetForm } from "./bulk-asset-form";
import type { CustomFieldDef } from "@/lib/custom-fields";

export default async function BulkNewAssetPage() {
  await requireCurrentUser();
  const [assetTypes, departments, locations] = await Promise.all([
    prisma.assetType.findMany({ orderBy: { name: "asc" } }),
    prisma.department.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.location.findMany({ orderBy: { name: "asc" } }),
  ]);

  const typesForForm = assetTypes.map((t) => ({
    id: t.id,
    name: t.name,
    defaultDepartmentId: t.defaultDepartmentId,
    fields: (t.customFieldSchema as unknown as CustomFieldDef[]) ?? [],
  }));

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-neutral-900">Bulk create assets</h1>
        <p className="text-sm text-neutral-500">
          Register many near-identical assets at once — up to 500 per batch. They&apos;ll be grouped
          together so you can bulk-update or print QR labels for the whole set later.
        </p>
      </div>
      <BulkAssetForm assetTypes={typesForForm} departments={departments} locations={locations} />
    </div>
  );
}
