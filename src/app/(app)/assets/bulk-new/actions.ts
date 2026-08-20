"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser, hasDepartmentAccess } from "@/lib/dal";
import { recordAudit } from "@/lib/audit";
import { buildCustomFieldsSchema, type CustomFieldDef } from "@/lib/custom-fields";
import { generateSequentialTags, parseTagList, sequentialTagRangeSchema } from "@/lib/asset-tags";
import { parseLocationInput } from "@/lib/location-input";
import type { Prisma } from "@/generated/prisma/client";

const ASSET_STATUSES = ["ACTIVE", "IN_REPAIR", "STORAGE", "RETIRED", "LOST", "DESTROYED"] as const;
const ASSET_CONDITIONS = ["NEW", "GOOD", "FAIR", "POOR", "UNSERVICEABLE"] as const;

const baseSchema = z.object({
  nameTemplate: z.string().min(1),
  assetTypeId: z.string().min(1),
  owningDepartmentId: z.string().min(1),
  status: z.enum(ASSET_STATUSES),
  condition: z.enum(ASSET_CONDITIONS),
  notes: z.string().optional(),
  groupName: z.string().min(1),
  groupDescription: z.string().optional(),
});

export type BulkAssetFormState = { error?: string } | undefined;

export async function createAssetBatch(
  _prevState: BulkAssetFormState,
  formData: FormData,
): Promise<BulkAssetFormState> {
  const user = await requireCurrentUser();

  const parsed = baseSchema.safeParse({
    nameTemplate: formData.get("nameTemplate"),
    assetTypeId: formData.get("assetTypeId"),
    owningDepartmentId: formData.get("owningDepartmentId"),
    status: formData.get("status"),
    condition: formData.get("condition"),
    notes: formData.get("notes") || undefined,
    groupName: formData.get("groupName"),
    groupDescription: formData.get("groupDescription") || undefined,
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

  const tagMode = formData.get("tagMode");
  let tags: string[];
  if (tagMode === "list") {
    tags = parseTagList(String(formData.get("tagList") ?? ""));
    if (tags.length === 0) return { error: "Paste at least one asset tag." };
    if (tags.length > 500) return { error: "Batches are capped at 500 assets at a time." };
  } else {
    const rangeParsed = sequentialTagRangeSchema.safeParse({
      prefix: formData.get("prefix"),
      start: formData.get("start"),
      count: formData.get("count"),
      pad: formData.get("pad"),
    });
    if (!rangeParsed.success) {
      return { error: rangeParsed.error.issues[0]?.message ?? "Invalid range" };
    }
    tags = generateSequentialTags(rangeParsed.data);
  }

  const duplicatesWithinBatch = tags.filter((t, i) => tags.indexOf(t) !== i);
  if (duplicatesWithinBatch.length > 0) {
    return { error: `Duplicate tags in this batch: ${[...new Set(duplicatesWithinBatch)].join(", ")}` };
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

  const existing = await prisma.asset.findMany({
    where: { assetTag: { in: tags } },
    select: { assetTag: true },
  });
  if (existing.length > 0) {
    return { error: `Already in use: ${existing.map((a) => a.assetTag).join(", ")}` };
  }

  const { group, createdAssets } = await prisma.$transaction(async (tx) => {
    const group = await tx.assetGroup.create({
      data: { name: parsed.data.groupName, description: parsed.data.groupDescription },
    });

    const createdAssets = await tx.asset.createManyAndReturn({
      data: tags.map((tag) => ({
        assetTag: tag,
        name: `${parsed.data.nameTemplate} ${tag}`,
        assetTypeId: parsed.data.assetTypeId,
        owningDepartmentId: parsed.data.owningDepartmentId,
        status: parsed.data.status,
        condition: parsed.data.condition,
        currentLocationId: location.locationId,
        customLocationText: location.customLocationText,
        notes: parsed.data.notes,
        customFields,
        createdByUserId: user.id,
      })),
      select: { id: true, assetTag: true },
    });

    await tx.assetGroupMember.createMany({
      data: createdAssets.map((a) => ({ assetGroupId: group.id, assetId: a.id })),
    });

    if (location.locationId || location.customLocationText) {
      await tx.assetLocationHistory.createMany({
        data: createdAssets.map((a) => ({
          assetId: a.id,
          locationId: location.locationId,
          customLocationText: location.customLocationText,
          movedByUserId: user.id,
          notes: "Initial location on bulk creation",
        })),
      });
    }

    return { group, createdAssets };
  });

  await recordAudit({
    entityType: "AssetGroup",
    entityId: group.id,
    action: "bulk created",
    userId: user.id,
    changes: { count: createdAssets.length, assetTypeId: parsed.data.assetTypeId, groupName: group.name },
  });

  redirect(`/asset-groups/${group.id}`);
}
