"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser, hasDepartmentAccess } from "@/lib/dal";
import { MAX_BULK_ITEMS } from "@/lib/bulk-selection";
import { CUSTOM_LOCATION_VALUE } from "@/lib/location-input";
import { ASSET_STATUSES } from "@/lib/constants";
import type { Prisma } from "@/generated/prisma/client";

const bulkEditSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(MAX_BULK_ITEMS),
  status: z.enum(ASSET_STATUSES).optional(),
  locationChange: z.enum(["none", "clear", "set"]),
  locationId: z.string().optional(),
  customLocationText: z.string().optional(),
});

export type BulkEditAssetsState = { error?: string } | undefined;

export async function bulkEditAssets(
  _prevState: BulkEditAssetsState,
  formData: FormData,
): Promise<BulkEditAssetsState> {
  const user = await requireCurrentUser();

  const parsed = bulkEditSchema.safeParse({
    ids: formData.getAll("ids").map(String),
    status: formData.get("status") || undefined,
    locationChange: formData.get("locationChange") || "none",
    locationId: formData.get("locationId") || undefined,
    customLocationText: formData.get("customLocationText") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  if (!parsed.data.status && parsed.data.locationChange === "none") {
    return { error: "Choose a status change and/or a location change." };
  }

  let locationId: string | null | undefined; // undefined = don't touch location at all
  let customLocationText: string | null | undefined;
  if (parsed.data.locationChange === "clear") {
    locationId = null;
    customLocationText = null;
  } else if (parsed.data.locationChange === "set") {
    if (parsed.data.locationId === CUSTOM_LOCATION_VALUE) {
      if (!parsed.data.customLocationText?.trim()) return { error: "Describe the custom location." };
      locationId = null;
      customLocationText = parsed.data.customLocationText.trim();
    } else if (parsed.data.locationId) {
      locationId = parsed.data.locationId;
      customLocationText = null;
    } else {
      return { error: "Choose a location to set." };
    }
  }

  const assets = await prisma.asset.findMany({ where: { id: { in: parsed.data.ids } } });
  if (assets.length === 0) return { error: "None of the selected assets could be found." };

  const departmentIds = [...new Set(assets.map((a) => a.owningDepartmentId))];
  for (const deptId of departmentIds) {
    const allowed = await hasDepartmentAccess(deptId, "MEMBER");
    if (!allowed) {
      return { error: "You don't have permission to edit assets in one or more of the selected departments." };
    }
  }

  const assetIds = assets.map((a) => a.id);

  await prisma.$transaction(async (tx) => {
    const data: Prisma.AssetUncheckedUpdateManyInput = {};
    if (parsed.data.status) data.status = parsed.data.status;
    if (locationId !== undefined) {
      data.currentLocationId = locationId;
      data.customLocationText = customLocationText;
    }
    await tx.asset.updateMany({ where: { id: { in: assetIds } }, data });

    if (locationId !== undefined) {
      await tx.assetLocationHistory.createMany({
        data: assetIds.map((id) => ({
          assetId: id,
          locationId,
          customLocationText,
          movedByUserId: user.id,
          notes: "Bulk location update",
        })),
      });
    }

    await tx.auditLog.createMany({
      data: assetIds.map((id) => ({
        entityType: "Asset",
        entityId: id,
        action: "bulk edited",
        userId: user.id,
        changes: {
          batchSize: assetIds.length,
          status: parsed.data.status ?? null,
          locationChange: parsed.data.locationChange,
        },
      })),
    });
  });

  revalidatePath("/assets");
  redirect("/assets");
}
