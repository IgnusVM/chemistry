import { prisma } from "@/lib/prisma";
import { getAccessibleDepartmentIds } from "@/lib/dal";
import { WorkOrderForm } from "./work-order-form";

export default async function NewWorkOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ asset?: string }>;
}) {
  const { asset } = await searchParams;
  const memberDeptIds = await getAccessibleDepartmentIds("MEMBER");

  const [departments, failureCodes, prefillAsset] = await Promise.all([
    prisma.department.findMany({ where: { id: { in: memberDeptIds } }, orderBy: { name: "asc" } }),
    prisma.failureCode.findMany({ orderBy: { code: "asc" }, include: { assetType: true } }),
    asset
      ? prisma.asset.findUnique({ where: { assetTag: asset }, include: { owningDepartment: true } })
      : null,
  ]);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-neutral-900">New work order</h1>
        <p className="text-sm text-neutral-500">Report a failure, request maintenance, or log other work.</p>
      </div>
      <WorkOrderForm departments={departments} failureCodes={failureCodes} prefillAsset={prefillAsset} />
    </div>
  );
}
