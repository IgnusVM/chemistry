"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/dal";
import { createBulkSelection, MAX_BULK_ITEMS } from "@/lib/bulk-selection";
import { buildAssetWhere } from "@/app/(app)/assets/where";
import { buildWorkOrderWhere } from "@/app/(app)/work-orders/where";

function filterParamsFromFormData(formData: FormData): Record<string, string> {
  const params: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("filter_") && typeof value === "string") {
      params[key.slice("filter_".length)] = value;
    }
  }
  return params;
}

export async function enterBulkSelection(formData: FormData) {
  const user = await requireCurrentUser();
  const entityType = String(formData.get("entityType") ?? "");
  const targetPath = String(formData.get("targetPath") ?? "");
  const selectAllMatching = formData.get("selectAllMatching") === "1";
  if (!entityType || !targetPath) throw new Error("Missing bulk selection target");

  let ids: string[];

  if (selectAllMatching) {
    const rawParams = filterParamsFromFormData(formData);
    if (entityType === "Asset") {
      const where = buildAssetWhere(rawParams);
      const rows = await prisma.asset.findMany({ where, select: { id: true }, take: MAX_BULK_ITEMS + 1 });
      ids = rows.map((r) => r.id);
    } else if (entityType === "WorkOrder") {
      const where = buildWorkOrderWhere(rawParams, { userId: user.id });
      const rows = await prisma.workOrder.findMany({ where, select: { id: true }, take: MAX_BULK_ITEMS + 1 });
      ids = rows.map((r) => r.id);
    } else {
      throw new Error(`Unknown bulk entity type: ${entityType}`);
    }
  } else {
    ids = formData.getAll("ids").map(String);
  }

  ids = Array.from(new Set(ids));
  if (ids.length === 0) throw new Error("No items selected");
  if (ids.length > MAX_BULK_ITEMS) {
    throw new Error(`Too many items selected (${ids.length}). Narrow your filter to ${MAX_BULK_ITEMS} or fewer.`);
  }

  const selectionId = await createBulkSelection(entityType, user.id, ids);
  redirect(`${targetPath}?selection=${selectionId}`);
}
