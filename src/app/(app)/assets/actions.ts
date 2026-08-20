"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser, hasDepartmentAccess } from "@/lib/dal";
import { recordAudit } from "@/lib/audit";
import { buildCustomFieldsSchema, type CustomFieldDef } from "@/lib/custom-fields";
import { parseLocationInput } from "@/lib/location-input";
import type { Prisma } from "@/generated/prisma/client";

const ASSET_STATUSES = ["ACTIVE", "IN_REPAIR", "STORAGE", "RETIRED", "LOST", "DESTROYED"] as const;
const ASSET_CONDITIONS = ["NEW", "GOOD", "FAIR", "POOR", "UNSERVICEABLE"] as const;

const baseAssetSchema = z.object({
  assetTag: z.string().min(1).regex(/^[A-Za-z0-9._-]+$/, "use letters, numbers, dot, dash, underscore"),
  name: z.string().min(1),
  description: z.string().optional(),
  assetTypeId: z.string().min(1),
  owningDepartmentId: z.string().min(1),
  status: z.enum(ASSET_STATUSES),
  condition: z.enum(ASSET_CONDITIONS),
  acquisitionCost: z.coerce.number().nonnegative().optional(),
  notes: z.string().optional(),
});

export type AssetFormState = { error?: string } | undefined;

export async function createAsset(
  _prevState: AssetFormState,
  formData: FormData,
): Promise<AssetFormState> {
  const user = await requireCurrentUser();

  const parsed = baseAssetSchema.safeParse({
    assetTag: formData.get("assetTag"),
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    assetTypeId: formData.get("assetTypeId"),
    owningDepartmentId: formData.get("owningDepartmentId"),
    status: formData.get("status"),
    condition: formData.get("condition"),
    acquisitionCost: formData.get("acquisitionCost") || undefined,
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const location = parseLocationInput(formData, "currentLocationId");
  if ("error" in location) return { error: location.error };

  const allowed = await hasDepartmentAccess(parsed.data.owningDepartmentId, "MEMBER");
  if (!allowed) {
    return { error: "You don't have permission to add assets for that department." };
  }

  const assetType = await prisma.assetType.findUnique({ where: { id: parsed.data.assetTypeId } });
  if (!assetType) return { error: "Asset type not found." };

  const fieldDefs = (assetType.customFieldSchema as unknown as CustomFieldDef[]) ?? [];
  const rawCustomFields: Record<string, unknown> = {};
  for (const def of fieldDefs) {
    const value = formData.get(`cf_${def.key}`);
    if (value !== null && value !== "") rawCustomFields[def.key] = value;
  }

  let customFields: Prisma.InputJsonValue;
  try {
    const parsedFields = buildCustomFieldsSchema(fieldDefs).parse(rawCustomFields);
    customFields = JSON.parse(JSON.stringify(parsedFields));
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Invalid custom field values" };
  }

  const existing = await prisma.asset.findUnique({ where: { assetTag: parsed.data.assetTag } });
  if (existing) return { error: "That asset tag is already in use." };

  const asset = await prisma.asset.create({
    data: {
      assetTag: parsed.data.assetTag,
      name: parsed.data.name,
      description: parsed.data.description,
      assetTypeId: parsed.data.assetTypeId,
      owningDepartmentId: parsed.data.owningDepartmentId,
      status: parsed.data.status,
      condition: parsed.data.condition,
      acquisitionCost: parsed.data.acquisitionCost,
      currentLocationId: location.locationId,
      customLocationText: location.customLocationText,
      notes: parsed.data.notes,
      customFields,
      createdByUserId: user.id,
    },
  });

  if (location.locationId || location.customLocationText) {
    await prisma.assetLocationHistory.create({
      data: {
        assetId: asset.id,
        locationId: location.locationId,
        customLocationText: location.customLocationText,
        movedByUserId: user.id,
        notes: "Initial location on creation",
      },
    });
  }

  await recordAudit({
    entityType: "Asset",
    entityId: asset.id,
    action: "created",
    userId: user.id,
    changes: { assetTag: asset.assetTag, status: asset.status },
  });

  redirect(`/assets/${asset.assetTag}`);
}

const statusChangeSchema = z.object({
  assetId: z.string().min(1),
  status: z.enum(ASSET_STATUSES),
});

export async function changeAssetStatus(formData: FormData) {
  const user = await requireCurrentUser();
  const parsed = statusChangeSchema.parse({
    assetId: formData.get("assetId"),
    status: formData.get("status"),
  });

  const asset = await prisma.asset.findUniqueOrThrow({ where: { id: parsed.assetId } });
  const allowed = await hasDepartmentAccess(asset.owningDepartmentId, "MEMBER");
  if (!allowed) throw new Error("Not authorized");

  await prisma.asset.update({ where: { id: asset.id }, data: { status: parsed.status } });
  await recordAudit({
    entityType: "Asset",
    entityId: asset.id,
    action: "status changed",
    userId: user.id,
    changes: { from: asset.status, to: parsed.status },
  });

  revalidatePath(`/assets/${asset.assetTag}`);
}

const valueSchema = z.object({
  assetId: z.string().min(1),
  acquisitionCost: z.coerce.number().nonnegative().optional(),
});

export async function updateAssetValue(formData: FormData) {
  const user = await requireCurrentUser();
  const parsed = valueSchema.parse({
    assetId: formData.get("assetId"),
    acquisitionCost: formData.get("acquisitionCost") || undefined,
  });

  const asset = await prisma.asset.findUniqueOrThrow({ where: { id: parsed.assetId } });
  const allowed = await hasDepartmentAccess(asset.owningDepartmentId, "MEMBER");
  if (!allowed) throw new Error("Not authorized");

  await prisma.asset.update({
    where: { id: asset.id },
    data: { acquisitionCost: parsed.acquisitionCost ?? null },
  });
  await recordAudit({
    entityType: "Asset",
    entityId: asset.id,
    action: "value updated",
    userId: user.id,
    changes: { acquisitionCost: parsed.acquisitionCost ?? null },
  });

  revalidatePath(`/assets/${asset.assetTag}`);
}

const moveSchema = z.object({
  assetId: z.string().min(1),
  notes: z.string().optional(),
});

export async function moveAsset(formData: FormData) {
  const user = await requireCurrentUser();
  const parsed = moveSchema.parse({
    assetId: formData.get("assetId"),
    notes: formData.get("notes") || undefined,
  });

  const location = parseLocationInput(formData, "locationId");
  if ("error" in location) throw new Error(location.error);

  const asset = await prisma.asset.findUniqueOrThrow({ where: { id: parsed.assetId } });
  const allowed = await hasDepartmentAccess(asset.owningDepartmentId, "MEMBER");
  if (!allowed) throw new Error("Not authorized");

  await prisma.$transaction([
    prisma.asset.update({
      where: { id: asset.id },
      data: { currentLocationId: location.locationId, customLocationText: location.customLocationText },
    }),
    prisma.assetLocationHistory.create({
      data: {
        assetId: asset.id,
        locationId: location.locationId,
        customLocationText: location.customLocationText,
        movedByUserId: user.id,
        notes: parsed.notes,
      },
    }),
  ]);

  await recordAudit({
    entityType: "Asset",
    entityId: asset.id,
    action: "moved",
    userId: user.id,
    changes: { locationId: location.locationId, customLocationText: location.customLocationText },
  });

  revalidatePath(`/assets/${asset.assetTag}`);
}
