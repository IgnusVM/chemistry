"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireOrgAdmin } from "@/lib/dal";
import { recordAudit } from "@/lib/audit";
import { customFieldSchemaSchema } from "@/lib/custom-fields";

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
