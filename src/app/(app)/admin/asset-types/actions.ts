"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireOrgAdmin } from "@/lib/dal";
import { recordAudit } from "@/lib/audit";
import { customFieldSchemaSchema } from "@/lib/custom-fields";
import { buildAssetTypeDocumentKey, uploadAttachment, deleteAttachmentObject } from "@/lib/s3";

const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024;
const ALLOWED_DOCUMENT_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

const assetTypeSchema = z.object({
  name: z.string().min(2),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  defaultDepartmentId: z.string().optional(),
  customFieldSchema: z.string(),
});

export type AssetTypeFormState = { error?: string } | undefined;

export async function createAssetType(
  _prevState: AssetTypeFormState,
  formData: FormData,
): Promise<AssetTypeFormState> {
  const admin = await requireOrgAdmin();

  const parsed = assetTypeSchema.safeParse({
    name: formData.get("name"),
    manufacturer: formData.get("manufacturer") || undefined,
    model: formData.get("model") || undefined,
    defaultDepartmentId: formData.get("defaultDepartmentId") || undefined,
    customFieldSchema: formData.get("customFieldSchema") || "[]",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  let fieldDefs;
  try {
    fieldDefs = customFieldSchemaSchema.parse(JSON.parse(parsed.data.customFieldSchema));
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Invalid custom field schema" };
  }

  const assetType = await prisma.assetType.create({
    data: {
      name: parsed.data.name,
      manufacturer: parsed.data.manufacturer,
      model: parsed.data.model,
      defaultDepartmentId: parsed.data.defaultDepartmentId || null,
      customFieldSchema: fieldDefs,
    },
  });

  await recordAudit({
    entityType: "AssetType",
    entityId: assetType.id,
    action: "created",
    userId: admin.id,
    changes: { name: parsed.data.name, fieldCount: fieldDefs.length },
  });

  revalidatePath("/admin/asset-types");
}

const updateAssetTypeSchema = assetTypeSchema.extend({
  id: z.string().min(1),
});

export async function updateAssetType(
  _prevState: AssetTypeFormState,
  formData: FormData,
): Promise<AssetTypeFormState> {
  const admin = await requireOrgAdmin();

  const parsed = updateAssetTypeSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    manufacturer: formData.get("manufacturer") || undefined,
    model: formData.get("model") || undefined,
    defaultDepartmentId: formData.get("defaultDepartmentId") || undefined,
    customFieldSchema: formData.get("customFieldSchema") || "[]",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  let fieldDefs;
  try {
    fieldDefs = customFieldSchemaSchema.parse(JSON.parse(parsed.data.customFieldSchema));
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Invalid custom field schema" };
  }

  const assetType = await prisma.assetType.update({
    where: { id: parsed.data.id },
    data: {
      name: parsed.data.name,
      manufacturer: parsed.data.manufacturer,
      model: parsed.data.model,
      defaultDepartmentId: parsed.data.defaultDepartmentId || null,
      customFieldSchema: fieldDefs,
    },
  });

  await recordAudit({
    entityType: "AssetType",
    entityId: assetType.id,
    action: "updated",
    userId: admin.id,
    changes: { name: parsed.data.name, fieldCount: fieldDefs.length },
  });

  revalidatePath("/admin/asset-types");
  revalidatePath(`/admin/asset-types/${assetType.id}`);
}

export async function deleteAssetType(assetTypeId: string) {
  const admin = await requireOrgAdmin();

  const assetType = await prisma.assetType.findUniqueOrThrow({
    where: { id: assetTypeId },
    include: { _count: { select: { assets: true } } },
  });
  if (assetType._count.assets > 0) {
    throw new Error("Can't delete an asset type that still has assets. Reassign or remove them first.");
  }

  await prisma.assetType.delete({ where: { id: assetTypeId } });

  await recordAudit({
    entityType: "AssetType",
    entityId: assetTypeId,
    action: "deleted",
    userId: admin.id,
    changes: { name: assetType.name },
  });

  revalidatePath("/admin/asset-types");
}

export type DocumentFormState = { error?: string } | undefined;

export async function uploadAssetTypeDocuments(
  _prevState: DocumentFormState,
  formData: FormData,
): Promise<DocumentFormState> {
  const admin = await requireOrgAdmin();
  const assetTypeId = String(formData.get("assetTypeId"));
  const assetType = await prisma.assetType.findUnique({ where: { id: assetTypeId } });
  if (!assetType) return { error: "Asset type not found." };

  const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return { error: "Choose at least one file." };

  for (const file of files) {
    if (!ALLOWED_DOCUMENT_TYPES.includes(file.type)) {
      return { error: `"${file.name}" is not a supported file type.` };
    }
    if (file.size > MAX_DOCUMENT_BYTES) {
      return { error: `"${file.name}" is over the 20MB limit.` };
    }
  }

  for (const file of files) {
    const key = buildAssetTypeDocumentKey(assetType.id, file.name);
    const buffer = Buffer.from(await file.arrayBuffer());
    try {
      await uploadAttachment(key, buffer, file.type);
    } catch {
      return { error: "Upload failed — storage isn't reachable right now. Try again in a bit." };
    }
    await prisma.assetTypeDocument.create({
      data: {
        assetTypeId: assetType.id,
        s3Key: key,
        filename: file.name,
        mimeType: file.type,
        uploadedByUserId: admin.id,
      },
    });
  }

  await recordAudit({
    entityType: "AssetType",
    entityId: assetType.id,
    action: "documents added",
    userId: admin.id,
    changes: { count: files.length },
  });

  revalidatePath(`/admin/asset-types/${assetType.id}`);
}

export async function deleteAssetTypeDocument(documentId: string) {
  const admin = await requireOrgAdmin();
  const doc = await prisma.assetTypeDocument.findUniqueOrThrow({ where: { id: documentId } });

  await deleteAttachmentObject(doc.s3Key);
  await prisma.assetTypeDocument.delete({ where: { id: doc.id } });

  await recordAudit({
    entityType: "AssetType",
    entityId: doc.assetTypeId,
    action: "document removed",
    userId: admin.id,
    changes: { filename: doc.filename },
  });

  revalidatePath(`/admin/asset-types/${doc.assetTypeId}`);
}
