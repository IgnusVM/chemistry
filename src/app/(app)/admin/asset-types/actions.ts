"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireOrgAdmin } from "@/lib/dal";
import { recordAudit } from "@/lib/audit";
import { customFieldSchemaSchema } from "@/lib/custom-fields";
import { buildAssetTypeDocumentKey, uploadAttachment, deleteAttachmentObject } from "@/lib/s3";
import { ALLOWED_ATTACHMENT_TYPES as ALLOWED_DOCUMENT_TYPES } from "@/lib/constants";

const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024;

const assetTypeSchema = z.object({
  name: z.string().min(2),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  defaultDepartmentId: z.string().optional(),
  defaultAcquisitionCost: z.coerce.number().nonnegative().optional(),
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
    defaultAcquisitionCost: formData.get("defaultAcquisitionCost") || undefined,
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
      defaultAcquisitionCost: parsed.data.defaultAcquisitionCost ?? null,
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
    defaultAcquisitionCost: formData.get("defaultAcquisitionCost") || undefined,
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
      defaultAcquisitionCost: parsed.data.defaultAcquisitionCost ?? null,
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

const partSchema = z.object({
  assetTypeId: z.string().min(1),
  partNumber: z.string().min(1),
  description: z.string().min(1),
});

export type PartFormState = { error?: string } | undefined;

export async function createPart(_prevState: PartFormState, formData: FormData): Promise<PartFormState> {
  const admin = await requireOrgAdmin();
  const parsed = partSchema.safeParse({
    assetTypeId: formData.get("assetTypeId"),
    partNumber: formData.get("partNumber"),
    description: formData.get("description"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const existing = await prisma.part.findUnique({
    where: { assetTypeId_partNumber: { assetTypeId: parsed.data.assetTypeId, partNumber: parsed.data.partNumber } },
  });
  if (existing) return { error: `Part number "${parsed.data.partNumber}" already exists for this asset type.` };

  const part = await prisma.part.create({ data: parsed.data });

  await recordAudit({
    entityType: "Part",
    entityId: part.id,
    action: "created",
    userId: admin.id,
    changes: { partNumber: part.partNumber },
  });

  revalidatePath(`/admin/asset-types/${parsed.data.assetTypeId}`);
}

export async function deletePart(partId: string) {
  const admin = await requireOrgAdmin();
  const part = await prisma.part.findUniqueOrThrow({
    where: { id: partId },
    include: { _count: { select: { workOrderUses: true } } },
  });
  if (part._count.workOrderUses > 0) {
    throw new Error("Can't delete a part that's already logged as used on a work order.");
  }

  await prisma.part.delete({ where: { id: partId } });

  await recordAudit({
    entityType: "Part",
    entityId: partId,
    action: "deleted",
    userId: admin.id,
    changes: { partNumber: part.partNumber },
  });

  revalidatePath(`/admin/asset-types/${part.assetTypeId}`);
}

const partOrderSchema = z.object({
  partId: z.string().min(1),
  price: z.coerce.number().nonnegative().optional(),
  purchaseLink: z.string().url().optional(),
  orderedAt: z.coerce.date().optional(),
});

export type PartOrderFormState = { error?: string } | undefined;

export async function addPartOrder(
  _prevState: PartOrderFormState,
  formData: FormData,
): Promise<PartOrderFormState> {
  const admin = await requireOrgAdmin();
  const parsed = partOrderSchema.safeParse({
    partId: formData.get("partId"),
    price: formData.get("price") || undefined,
    purchaseLink: formData.get("purchaseLink") || undefined,
    orderedAt: formData.get("orderedAt") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const part = await prisma.part.findUniqueOrThrow({ where: { id: parsed.data.partId } });
  await prisma.partOrder.create({
    data: {
      partId: part.id,
      price: parsed.data.price,
      purchaseLink: parsed.data.purchaseLink,
      orderedAt: parsed.data.orderedAt,
      createdByUserId: admin.id,
    },
  });

  await recordAudit({
    entityType: "Part",
    entityId: part.id,
    action: "order logged",
    userId: admin.id,
    changes: { price: parsed.data.price },
  });

  revalidatePath(`/admin/asset-types/${part.assetTypeId}`);
}

export async function deletePartOrder(orderId: string) {
  const admin = await requireOrgAdmin();
  const order = await prisma.partOrder.findUniqueOrThrow({ where: { id: orderId }, include: { part: true } });

  await prisma.partOrder.delete({ where: { id: orderId } });

  await recordAudit({
    entityType: "Part",
    entityId: order.partId,
    action: "order removed",
    userId: admin.id,
  });

  revalidatePath(`/admin/asset-types/${order.part.assetTypeId}`);
}
