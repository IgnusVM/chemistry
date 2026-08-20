"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser, hasDepartmentAccess } from "@/lib/dal";
import { generateWorkOrderCodeBatch } from "@/lib/work-order-code";
import { MAX_BULK_ITEMS, createBulkSelection } from "@/lib/bulk-selection";
import { WO_TYPES, WO_PRIORITIES } from "@/lib/constants";

const bulkCreateSchema = z.object({
  assetIds: z.array(z.string().min(1)).min(1).max(MAX_BULK_ITEMS),
  description: z.string().min(1),
  type: z.enum(WO_TYPES),
  priority: z.enum(WO_PRIORITIES),
});

export type BulkCreateWorkOrdersState = { error?: string } | undefined;

export async function bulkCreateWorkOrders(
  _prevState: BulkCreateWorkOrdersState,
  formData: FormData,
): Promise<BulkCreateWorkOrdersState> {
  const user = await requireCurrentUser();

  const parsed = bulkCreateSchema.safeParse({
    assetIds: formData.getAll("assetIds").map(String),
    description: formData.get("description"),
    type: formData.get("type"),
    priority: formData.get("priority"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const assets = await prisma.asset.findMany({ where: { id: { in: parsed.data.assetIds } } });
  if (assets.length === 0) return { error: "None of the selected assets could be found." };

  const departmentIds = [...new Set(assets.map((a) => a.owningDepartmentId))];
  for (const deptId of departmentIds) {
    const allowed = await hasDepartmentAccess(deptId, "MEMBER");
    if (!allowed) {
      return { error: "You don't have permission to file work orders for one or more of the selected assets' departments." };
    }
  }

  let created: { id: string; code: string }[] | undefined;
  for (let attempt = 0; attempt < 3; attempt++) {
    const codes = await generateWorkOrderCodeBatch(parsed.data.type, assets.length);
    try {
      created = await prisma.workOrder.createManyAndReturn({
        data: assets.map((asset, i) => ({
          code: codes[i],
          description: parsed.data.description,
          assetId: asset.id,
          departmentId: asset.owningDepartmentId,
          type: parsed.data.type,
          priority: parsed.data.priority,
          reportedByUserId: user.id,
        })),
        select: { id: true, code: true },
      });
      break;
    } catch (e) {
      const isCodeCollision = e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
      if (!isCodeCollision || attempt === 2) throw e;
    }
  }
  if (!created) return { error: "Could not generate work order numbers. Try again." };

  await prisma.auditLog.createMany({
    data: created.map((wo) => ({
      entityType: "WorkOrder",
      entityId: wo.id,
      action: "bulk created",
      userId: user.id,
      changes: { batchSize: created!.length, type: parsed.data.type, priority: parsed.data.priority },
    })),
  });

  const selectionId = await createBulkSelection(
    "WorkOrder",
    user.id,
    created.map((wo) => wo.id),
  );
  redirect(`/work-orders/bulk-new/done?selection=${selectionId}`);
}
