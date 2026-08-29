import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/dal";
import { AssetForm } from "./asset-form";
import type { CustomFieldDef } from "@/lib/custom-fields";
import { HelpLink } from "@/components/help-link";

export default async function NewAssetPage() {
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
    defaultAcquisitionCost: t.defaultAcquisitionCost?.toString() ?? null,
    fields: (t.customFieldSchema as unknown as CustomFieldDef[]) ?? [],
  }));

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <div className="flex items-center gap-1">
          <h1 className="text-lg font-semibold text-neutral-900">New asset</h1>
          <HelpLink topic="Creating an asset" article="assets/creating-an-asset" />
        </div>
      </div>
      <AssetForm assetTypes={typesForForm} departments={departments} locations={locations} />
    </div>
  );
}
