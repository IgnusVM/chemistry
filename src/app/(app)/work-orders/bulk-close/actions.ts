"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser, hasDepartmentAccess } from "@/lib/dal";
import { MAX_BULK_ITEMS } from "@/lib/bulk-selection";

const bulkCloseSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(MAX_BULK_ITEMS),
  resolutionCodeId: z.string().optional(),
  resolutionNotes: z.string().optional(),
  laborMinutes: z.string().optional(),
  partNumber: z.string().optional(),
  partDescription: z.string().optional(),
  partQuantity: z.string().optional(),
  confirmed: z.string().optional(),
});

export type BulkCloseState =
  | { error: string }
  | {
      confirmRequired: true;
      summary: {
        workOrderCount: number;
        assetTypeCount: number;
        newPartAssetTypeNames: string[];
      };
    }
  | undefined;

export async function bulkCloseWorkOrders(
  _prevState: BulkCloseState,
  formData: FormData,
): Promise<BulkCloseState> {
  const user = await requireCurrentUser();

  const parsed = bulkCloseSchema.safeParse({
    ids: formData.getAll("ids").map(String),
    resolutionCodeId: formData.get("resolutionCodeId") || undefined,
    resolutionNotes: formData.get("resolutionNotes") || undefined,
    laborMinutes: formData.get("laborMinutes") || undefined,
    partNumber: formData.get("partNumber") || undefined,
    partDescription: formData.get("partDescription") || undefined,
    partQuantity: formData.get("partQuantity") || undefined,
    confirmed: formData.get("confirmed") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;
  const partNumber = data.partNumber?.trim();

  const workOrders = await prisma.workOrder.findMany({
    where: { id: { in: data.ids } },
    select: { id: true, departmentId: true, status: true, assetId: true, asset: { select: { assetTypeId: true } } },
  });
  if (workOrders.length === 0) return { error: "None of the selected work orders could be found." };

  const departmentIds = [...new Set(workOrders.map((w) => w.departmentId))];
  for (const deptId of departmentIds) {
    const allowed = await hasDepartmentAccess(deptId, "MEMBER");
    if (!allowed) {
      return { error: "You don't have permission to close work orders in one or more of the selected departments." };
    }
  }

  const withAsset = workOrders.filter((w) => w.asset);
  const distinctAssetTypeIds = [...new Set(withAsset.map((w) => w.asset!.assetTypeId))];

  let newPartAssetTypeIds: string[] = [];
  let assetTypeNameById = new Map<string, string>();

  if (partNumber) {
    if (distinctAssetTypeIds.length === 0) {
      return { error: "None of the selected work orders have a linked asset, so a part can't be logged." };
    }
    const existingParts = await prisma.part.findMany({
      where: { assetTypeId: { in: distinctAssetTypeIds }, partNumber },
      select: { assetTypeId: true },
    });
    const assetTypeIdsWithPart = new Set(existingParts.map((p) => p.assetTypeId));
    newPartAssetTypeIds = distinctAssetTypeIds.filter((id) => !assetTypeIdsWithPart.has(id));

    if (newPartAssetTypeIds.length > 0 && !data.partDescription?.trim()) {
      return {
        error: `"${partNumber}" is a new part for ${newPartAssetTypeIds.length} of the asset type(s) involved — add a description to create it.`,
      };
    }

    if (data.confirmed !== "1") {
      const assetTypes = await prisma.assetType.findMany({
        where: { id: { in: newPartAssetTypeIds } },
        select: { id: true, name: true },
      });
      assetTypeNameById = new Map(assetTypes.map((t) => [t.id, t.name]));
      return {
        confirmRequired: true,
        summary: {
          workOrderCount: workOrders.length,
          assetTypeCount: distinctAssetTypeIds.length,
          newPartAssetTypeNames: newPartAssetTypeIds.map((id) => assetTypeNameById.get(id) ?? id),
        },
      };
    }
  }

  const now = new Date();
  const quantity = data.partQuantity ? Number(data.partQuantity) : 1;
  const allIds = workOrders.map((w) => w.id);

  await prisma.$transaction(async (tx) => {
    let partIdByAssetType = new Map<string, string>();

    if (partNumber) {
      const existingParts = await tx.part.findMany({
        where: { assetTypeId: { in: distinctAssetTypeIds }, partNumber },
        select: { id: true, assetTypeId: true },
      });
      partIdByAssetType = new Map(existingParts.map((p) => [p.assetTypeId, p.id]));

      const stillMissing = distinctAssetTypeIds.filter((id) => !partIdByAssetType.has(id));
      if (stillMissing.length > 0) {
        const created = await tx.part.createManyAndReturn({
          data: stillMissing.map((assetTypeId) => ({
            assetTypeId,
            partNumber,
            description: data.partDescription!.trim(),
          })),
          skipDuplicates: true,
          select: { id: true, assetTypeId: true },
        });
        for (const p of created) partIdByAssetType.set(p.assetTypeId, p.id);
      }

      const workOrderPartRows = withAsset
        .map((w) => ({ workOrderId: w.id, partId: partIdByAssetType.get(w.asset!.assetTypeId) }))
        .filter((row): row is { workOrderId: string; partId: string } => Boolean(row.partId));

      if (workOrderPartRows.length > 0) {
        await tx.workOrderPart.createMany({
          data: workOrderPartRows.map((row) => ({
            workOrderId: row.workOrderId,
            partId: row.partId,
            quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
            createdByUserId: user.id,
          })),
        });
      }
    }

    await tx.workOrder.updateMany({
      where: { id: { in: allIds } },
      data: {
        status: "CLOSED",
        closedAt: now,
        resolutionCodeId: data.resolutionCodeId || null,
        resolutionNotes: data.resolutionNotes,
        laborMinutes: data.laborMinutes ? Number(data.laborMinutes) : null,
      },
    });

    await tx.auditLog.createMany({
      data: allIds.map((id) => ({
        entityType: "WorkOrder",
        entityId: id,
        action: "bulk closed",
        userId: user.id,
        changes: { batchSize: allIds.length, resolutionCodeId: data.resolutionCodeId ?? null, partNumber: partNumber ?? null },
      })),
    });
  });

  revalidatePath("/work-orders");
  redirect("/work-orders");
}
