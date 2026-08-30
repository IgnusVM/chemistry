"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireOrgAdmin } from "@/lib/dal";
import { recordAudit } from "@/lib/audit";
import { BOARD_COLORS } from "@/lib/board-colors";

/**
 * Tags are organization-wide, so their vocabulary is org-admin's to set.
 *
 * A team tag has to mean the same thing on every board or filtering by it is
 * meaningless — which is why these are not per-board and not editable by
 * department members.
 */

const tagSchema = z.object({
  name: z.string().trim().min(1, "Give the tag a name.").max(24, "Keep tag names short."),
  color: z.enum(BOARD_COLORS).optional(),
});

export type TagFormState = { error?: string } | undefined;

export async function createTag(_prev: TagFormState, formData: FormData): Promise<TagFormState> {
  const admin = await requireOrgAdmin();
  const parsed = tagSchema.safeParse({
    name: formData.get("name"),
    color: formData.get("color") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const existing = await prisma.tag.findUnique({ where: { name: parsed.data.name } });
  if (existing) return { error: `"${parsed.data.name}" already exists.` };

  const tag = await prisma.tag.create({ data: parsed.data });
  await recordAudit({ entityType: "Tag", entityId: tag.id, action: "created", userId: admin.id, changes: parsed.data });
  revalidatePath("/admin/tags");
  revalidatePath("/board");
}

export async function updateTag(_prev: TagFormState, formData: FormData): Promise<TagFormState> {
  const admin = await requireOrgAdmin();
  const tagId = String(formData.get("tagId") ?? "");
  if (!tagId) return { error: "Missing tag." };

  const parsed = tagSchema.safeParse({
    name: formData.get("name"),
    color: formData.get("color") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  // Renaming onto another tag's name would break the promise that a tag means
  // one thing org-wide.
  const clash = await prisma.tag.findUnique({ where: { name: parsed.data.name } });
  if (clash && clash.id !== tagId) return { error: `"${parsed.data.name}" already exists.` };

  await prisma.tag.update({ where: { id: tagId }, data: parsed.data });
  await recordAudit({ entityType: "Tag", entityId: tagId, action: "updated", userId: admin.id, changes: parsed.data });
  revalidatePath("/admin/tags");
  revalidatePath("/board");
}

export async function deleteTag(tagId: string): Promise<void> {
  const admin = await requireOrgAdmin();
  // Cards survive; only the assignments go. Deleting a tag should never
  // destroy the work it was attached to.
  await prisma.tag.delete({ where: { id: tagId } });
  await recordAudit({ entityType: "Tag", entityId: tagId, action: "deleted", userId: admin.id });
  revalidatePath("/admin/tags");
  revalidatePath("/board");
}
