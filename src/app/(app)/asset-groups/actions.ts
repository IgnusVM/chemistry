"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser, hasDepartmentAccess } from "@/lib/dal";
import { recordAudit } from "@/lib/audit";
import { parseTagList } from "@/lib/asset-tags";
import { ASSET_STATUSES } from "@/lib/constants";

const createGroupSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

export type CreateGroupFormState = { error?: string } | undefined;

export async function createGroup(
  _prevState: CreateGroupFormState,
  formData: FormData,
): Promise<CreateGroupFormState> {
  const user = await requireCurrentUser();
  const parsed = createGroupSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const group = await prisma.assetGroup.create({ data: parsed.data });
  await recordAudit({
    entityType: "AssetGroup",
    entityId: group.id,
    action: "created",
    userId: user.id,
    changes: { name: group.name },
  });

  redirect(`/asset-groups/${group.id}`);
}

const updateGroupSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
});

export async function updateGroup(
  _prevState: CreateGroupFormState,
  formData: FormData,
): Promise<CreateGroupFormState> {
  const user = await requireCurrentUser();
  const parsed = updateGroupSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    description: formData.get("description") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { id, ...data } = parsed.data;
  await prisma.assetGroup.update({ where: { id }, data });
  await recordAudit({
    entityType: "AssetGroup",
    entityId: id,
    action: "updated",
    userId: user.id,
    changes: data,
  });

  revalidatePath(`/asset-groups/${id}`);
}

export type AddToGroupFormState = { error?: string; message?: string } | undefined;

export async function addAssetsToGroup(
  _prevState: AddToGroupFormState,
  formData: FormData,
): Promise<AddToGroupFormState> {
  const user = await requireCurrentUser();
  const assetGroupId = String(formData.get("assetGroupId"));
  const tags = parseTagList(String(formData.get("tagList") ?? ""));
  if (tags.length === 0) return { error: "Enter at least one asset tag." };

  const assets = await prisma.asset.findMany({ where: { assetTag: { in: tags } } });
  const foundTags = new Set(assets.map((a) => a.assetTag));
  const notFound = tags.filter((t) => !foundTags.has(t));

  const departmentIds = [...new Set(assets.map((a) => a.owningDepartmentId))];
  for (const deptId of departmentIds) {
    const allowed = await hasDepartmentAccess(deptId, "MEMBER");
    if (!allowed) return { error: "You don't have permission to add assets from one or more of those departments." };
  }

  const existingMembers = await prisma.assetGroupMember.findMany({
    where: { assetGroupId, assetId: { in: assets.map((a) => a.id) } },
    select: { assetId: true },
  });
  const alreadyIn = new Set(existingMembers.map((m) => m.assetId));
  const toAdd = assets.filter((a) => !alreadyIn.has(a.id));

  if (toAdd.length > 0) {
    await prisma.assetGroupMember.createMany({
      data: toAdd.map((a) => ({ assetGroupId, assetId: a.id })),
    });
    await recordAudit({
      entityType: "AssetGroup",
      entityId: assetGroupId,
      action: "assets added",
      userId: user.id,
      changes: { count: toAdd.length, tags: toAdd.map((a) => a.assetTag) },
    });
  }

  revalidatePath(`/asset-groups/${assetGroupId}`);

  const skipped = tags.length - toAdd.length;
  if (notFound.length === 0 && skipped === 0) {
    return { message: `Added ${toAdd.length} asset${toAdd.length === 1 ? "" : "s"}.` };
  }
  const parts = [`Added ${toAdd.length}`];
  if (notFound.length > 0) parts.push(`not found: ${notFound.join(", ")}`);
  const alreadyCount = skipped - notFound.length;
  if (alreadyCount > 0) parts.push(`already in group: ${alreadyCount}`);
  return { message: parts.join(" — ") };
}

export async function removeAssetFromGroup(assetGroupId: string, assetId: string) {
  const user = await requireCurrentUser();
  const asset = await prisma.asset.findUniqueOrThrow({ where: { id: assetId } });
  const allowed = await hasDepartmentAccess(asset.owningDepartmentId, "MEMBER");
  if (!allowed) throw new Error("Not authorized");

  await prisma.assetGroupMember.delete({
    where: { assetGroupId_assetId: { assetGroupId, assetId } },
  });
  await recordAudit({
    entityType: "AssetGroup",
    entityId: assetGroupId,
    action: "asset removed",
    userId: user.id,
    changes: { assetTag: asset.assetTag },
  });

  revalidatePath(`/asset-groups/${assetGroupId}`);
}

export async function removeAssetsFromGroup(assetGroupId: string, assetIds: string[]) {
  const user = await requireCurrentUser();
  if (assetIds.length === 0) return;

  const assets = await prisma.asset.findMany({ where: { id: { in: assetIds } } });
  const departmentIds = [...new Set(assets.map((a) => a.owningDepartmentId))];
  for (const deptId of departmentIds) {
    const allowed = await hasDepartmentAccess(deptId, "MEMBER");
    if (!allowed) throw new Error("Not authorized for one or more departments among the selected assets");
  }

  const result = await prisma.assetGroupMember.deleteMany({
    where: { assetGroupId, assetId: { in: assetIds } },
  });

  await recordAudit({
    entityType: "AssetGroup",
    entityId: assetGroupId,
    action: "assets removed",
    userId: user.id,
    changes: { count: result.count },
  });

  revalidatePath(`/asset-groups/${assetGroupId}`);
}

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
