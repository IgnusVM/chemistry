import { prisma } from "@/lib/prisma";
import { getAccessibleDepartmentIds } from "@/lib/dal";
import { WorkOrderForm } from "./work-order-form";
import { HelpLink } from "@/components/help-link";

export default async function NewWorkOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ asset?: string }>;
}) {
  const { asset } = await searchParams;
  const memberDeptIds = await getAccessibleDepartmentIds("MEMBER");

  const [departments, prefillAsset] = await Promise.all([
    prisma.department.findMany({ where: { id: { in: memberDeptIds } }, orderBy: { name: "asc" } }),
    asset
      ? prisma.asset.findUnique({ where: { assetTag: asset }, include: { owningDepartment: true } })
      : null,
  ]);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <div className="flex items-center gap-1">
          <h1 className="text-lg font-semibold text-neutral-900">New work order</h1>
          <HelpLink topic="Creating a work order" article="work-orders/creating-a-work-order" />
        </div>
      </div>
      <WorkOrderForm departments={departments} prefillAsset={prefillAsset} />
    </div>
  );
}
