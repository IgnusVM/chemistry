"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireOrgAdmin } from "@/lib/dal";
import { recordAudit } from "@/lib/audit";

/**
 * Code files belong to an AssetType — one program runs on every unit of a class
 * of machine. All of these are org-admin only: a code change ships to the whole
 * fleet at once, which is a materially different act from logging a repair on
 * one lantern, so it isn't gated on ordinary department membership.
 */

const filenameSchema = z
  .string()
  .min(1)
  .regex(/^[A-Za-z0-9._-]+\.[A-Za-z0-9]+$/, "use a filename with an extension, e.g. charging-logic.py");

/** Revalidate the type's own page plus the ticket a change was made from. */
async function revalidateFor(assetTypeId: string, workOrderId?: string) {
  revalidatePath(`/admin/asset-types/${assetTypeId}`);
  if (workOrderId) {
    const workOrder = await prisma.workOrder.findUnique({ where: { id: workOrderId } });
    if (workOrder) revalidatePath(`/work-orders/${workOrder.code}`);
  }
}

const createSchema = z.object({
  assetTypeId: z.string().min(1),
  filename: filenameSchema,
  description: z.string().optional(),
  content: z.string().optional(),
  message: z.string().optional(),
});

export type CreateCodeFileState = { error?: string } | undefined;

export async function createAssetCodeFile(
  _prevState: CreateCodeFileState,
  formData: FormData,
): Promise<CreateCodeFileState> {
  const user = await requireOrgAdmin();
  const parsed = createSchema.safeParse({
    assetTypeId: formData.get("assetTypeId"),
    filename: formData.get("filename"),
    description: formData.get("description") || undefined,
    content: formData.get("content") || undefined,
    message: formData.get("message") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const assetType = await prisma.assetType.findUniqueOrThrow({
    where: { id: parsed.data.assetTypeId },
  });

  const existing = await prisma.assetCodeFile.findUnique({
    where: {
      assetTypeId_filename: { assetTypeId: assetType.id, filename: parsed.data.filename },
    },
  });
  if (existing) return { error: `"${parsed.data.filename}" already exists on this asset type.` };

  const codeFile = await prisma.$transaction(async (tx) => {
    const created = await tx.assetCodeFile.create({
      data: {
        assetTypeId: assetType.id,
        filename: parsed.data.filename,
        description: parsed.data.description,
        createdByUserId: user.id,
      },
    });
    await tx.assetCodeFileVersion.create({
      data: {
        codeFileId: created.id,
        content: parsed.data.content ?? "",
        message: parsed.data.message || "Initial version",
        createdByUserId: user.id,
      },
    });
    return created;
  });

  await recordAudit({
    entityType: "AssetType",
    entityId: assetType.id,
    action: "code file created",
    userId: user.id,
    changes: { filename: codeFile.filename },
  });

  await revalidateFor(assetType.id);
}

const saveVersionSchema = z.object({
  codeFileId: z.string().min(1),
  content: z.string(),
  message: z.string().optional(),
  workOrderId: z.string().optional(),
});

export type SaveCodeVersionState = { error?: string } | undefined;

export async function saveAssetCodeVersion(
  _prevState: SaveCodeVersionState,
  formData: FormData,
): Promise<SaveCodeVersionState> {
  const user = await requireOrgAdmin();
  const parsed = saveVersionSchema.safeParse({
    codeFileId: formData.get("codeFileId"),
    content: formData.get("content"),
    message: formData.get("message") || undefined,
    workOrderId: formData.get("workOrderId") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const codeFile = await prisma.assetCodeFile.findUniqueOrThrow({
    where: { id: parsed.data.codeFileId },
  });

  await prisma.assetCodeFileVersion.create({
    data: {
      codeFileId: codeFile.id,
      content: parsed.data.content,
      message: parsed.data.message,
      createdByUserId: user.id,
      workOrderId: parsed.data.workOrderId,
    },
  });

  await recordAudit({
    entityType: "AssetType",
    entityId: codeFile.assetTypeId,
    action: "code file updated",
    userId: user.id,
    changes: { filename: codeFile.filename, workOrderId: parsed.data.workOrderId ?? null },
  });

  await revalidateFor(codeFile.assetTypeId, parsed.data.workOrderId);
}

const rollbackSchema = z.object({
  codeFileId: z.string().min(1),
  targetVersionId: z.string().min(1),
});

export async function rollbackAssetCodeVersion(formData: FormData) {
  const user = await requireOrgAdmin();
  const parsed = rollbackSchema.parse({
    codeFileId: formData.get("codeFileId"),
    targetVersionId: formData.get("targetVersionId"),
  });

  const codeFile = await prisma.assetCodeFile.findUniqueOrThrow({
    where: { id: parsed.codeFileId },
  });

  const target = await prisma.assetCodeFileVersion.findUniqueOrThrow({
    where: { id: parsed.targetVersionId },
  });
  if (target.codeFileId !== codeFile.id) throw new Error("Version does not belong to this file");

  // Rollback is a new version, never a rewrite — the history of what actually
  // happened stays intact, the same way `git revert` works.
  await prisma.assetCodeFileVersion.create({
    data: {
      codeFileId: codeFile.id,
      content: target.content,
      message: `Rolled back to version from ${target.createdAt.toLocaleString()}`,
      createdByUserId: user.id,
    },
  });

  await recordAudit({
    entityType: "AssetType",
    entityId: codeFile.assetTypeId,
    action: "code file rolled back",
    userId: user.id,
    changes: { filename: codeFile.filename, targetVersionId: target.id },
  });

  await revalidateFor(codeFile.assetTypeId);
}

export async function deleteAssetCodeFile(codeFileId: string) {
  const user = await requireOrgAdmin();
  const codeFile = await prisma.assetCodeFile.findUniqueOrThrow({ where: { id: codeFileId } });

  await prisma.assetCodeFile.delete({ where: { id: codeFile.id } });

  await recordAudit({
    entityType: "AssetType",
    entityId: codeFile.assetTypeId,
    action: "code file deleted",
    userId: user.id,
    changes: { filename: codeFile.filename },
  });

  await revalidateFor(codeFile.assetTypeId);
}
