"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser, hasDepartmentAccess } from "@/lib/dal";
import { recordAudit } from "@/lib/audit";

const filenameSchema = z
  .string()
  .min(1)
  .regex(/^[A-Za-z0-9._-]+\.[A-Za-z0-9]+$/, "use a filename with an extension, e.g. charging-logic.py");

async function requireAssetAccess(assetId: string) {
  const asset = await prisma.asset.findUniqueOrThrow({ where: { id: assetId } });
  const allowed = await hasDepartmentAccess(asset.owningDepartmentId, "MEMBER");
  if (!allowed) throw new Error("Not authorized for this asset's department");
  return asset;
}

const createSchema = z.object({
  assetId: z.string().min(1),
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
  const user = await requireCurrentUser();
  const parsed = createSchema.safeParse({
    assetId: formData.get("assetId"),
    filename: formData.get("filename"),
    description: formData.get("description") || undefined,
    content: formData.get("content") || undefined,
    message: formData.get("message") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const asset = await requireAssetAccess(parsed.data.assetId);

  const existing = await prisma.assetCodeFile.findUnique({
    where: { assetId_filename: { assetId: asset.id, filename: parsed.data.filename } },
  });
  if (existing) return { error: `"${parsed.data.filename}" already exists on this asset.` };

  const codeFile = await prisma.$transaction(async (tx) => {
    const codeFile = await tx.assetCodeFile.create({
      data: {
        assetId: asset.id,
        filename: parsed.data.filename,
        description: parsed.data.description,
        createdByUserId: user.id,
      },
    });
    await tx.assetCodeFileVersion.create({
      data: {
        codeFileId: codeFile.id,
        content: parsed.data.content ?? "",
        message: parsed.data.message || "Initial version",
        createdByUserId: user.id,
      },
    });
    return codeFile;
  });

  await recordAudit({
    entityType: "Asset",
    entityId: asset.id,
    action: "code file created",
    userId: user.id,
    changes: { filename: codeFile.filename },
  });

  revalidatePath(`/assets/${asset.assetTag}`);
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
  const user = await requireCurrentUser();
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
    include: { asset: true },
  });
  const allowed = await hasDepartmentAccess(codeFile.asset.owningDepartmentId, "MEMBER");
  if (!allowed) return { error: "Not authorized for this asset's department" };

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
    entityType: "Asset",
    entityId: codeFile.assetId,
    action: "code file updated",
    userId: user.id,
    changes: { filename: codeFile.filename, workOrderId: parsed.data.workOrderId ?? null },
  });

  revalidatePath(`/assets/${codeFile.asset.assetTag}`);
  if (parsed.data.workOrderId) {
    const workOrder = await prisma.workOrder.findUnique({ where: { id: parsed.data.workOrderId } });
    if (workOrder) revalidatePath(`/work-orders/${workOrder.code}`);
  }
}

const rollbackSchema = z.object({
  codeFileId: z.string().min(1),
  targetVersionId: z.string().min(1),
});

export async function rollbackAssetCodeVersion(formData: FormData) {
  const user = await requireCurrentUser();
  const parsed = rollbackSchema.parse({
    codeFileId: formData.get("codeFileId"),
    targetVersionId: formData.get("targetVersionId"),
  });

  const codeFile = await prisma.assetCodeFile.findUniqueOrThrow({
    where: { id: parsed.codeFileId },
    include: { asset: true },
  });
  const allowed = await hasDepartmentAccess(codeFile.asset.owningDepartmentId, "MEMBER");
  if (!allowed) throw new Error("Not authorized for this asset's department");

  const target = await prisma.assetCodeFileVersion.findUniqueOrThrow({
    where: { id: parsed.targetVersionId },
  });
  if (target.codeFileId !== codeFile.id) throw new Error("Version does not belong to this file");

  await prisma.assetCodeFileVersion.create({
    data: {
      codeFileId: codeFile.id,
      content: target.content,
      message: `Rolled back to version from ${target.createdAt.toLocaleString()}`,
      createdByUserId: user.id,
    },
  });

  await recordAudit({
    entityType: "Asset",
    entityId: codeFile.assetId,
    action: "code file rolled back",
    userId: user.id,
    changes: { filename: codeFile.filename, targetVersionId: target.id },
  });

  revalidatePath(`/assets/${codeFile.asset.assetTag}`);
}

export async function deleteAssetCodeFile(codeFileId: string) {
  const user = await requireCurrentUser();
  const codeFile = await prisma.assetCodeFile.findUniqueOrThrow({
    where: { id: codeFileId },
    include: { asset: true },
  });
  const allowed = await hasDepartmentAccess(codeFile.asset.owningDepartmentId, "MEMBER");
  if (!allowed) throw new Error("Not authorized for this asset's department");

  await prisma.assetCodeFile.delete({ where: { id: codeFile.id } });

  await recordAudit({
    entityType: "Asset",
    entityId: codeFile.assetId,
    action: "code file deleted",
    userId: user.id,
    changes: { filename: codeFile.filename },
  });

  revalidatePath(`/assets/${codeFile.asset.assetTag}`);
}
