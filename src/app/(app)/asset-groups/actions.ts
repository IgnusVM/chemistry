"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser, hasDepartmentAccess } from "@/lib/dal";
import { recordAudit } from "@/lib/audit";

const ASSET_STATUSES = ["ACTIVE", "IN_REPAIR", "STORAGE", "RETIRED", "LOST", "DESTROYED"] as const;

const bulkStatusSchema = z.object({
  assetGroupId: z.string().min(1),
  status: z.enum(ASSET_STATUSES),
});

export async function bulkUpdateGroupStatus(formData: FormData) {
  const user = await requireCurrentUser();
  const parsed = bulkStatusSchema.parse({
    assetGroupId: formData.get("assetGroupId"),
    status: formData.get("status"),
  });

  const members = await prisma.assetGroupMember.findMany({
    where: { assetGroupId: parsed.assetGroupId },
    include: { asset: { select: { id: true, owningDepartmentId: true } } },
  });
  if (members.length === 0) return;

  const departmentIds = [...new Set(members.map((m) => m.asset.owningDepartmentId))];
  for (const deptId of departmentIds) {
    const allowed = await hasDepartmentAccess(deptId, "MEMBER");
    if (!allowed) throw new Error("Not authorized for one or more departments in this group");
  }

  const result = await prisma.asset.updateMany({
    where: { id: { in: members.map((m) => m.asset.id) } },
    data: { status: parsed.status },
  });

  await recordAudit({
    entityType: "AssetGroup",
    entityId: parsed.assetGroupId,
    action: "bulk status change",
    userId: user.id,
    changes: { count: result.count, status: parsed.status },
  });

  revalidatePath(`/asset-groups/${parsed.assetGroupId}`);
}
