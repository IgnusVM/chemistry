"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireOrgAdmin } from "@/lib/dal";
import { recordAudit } from "@/lib/audit";

const failureCodeSchema = z.object({
  code: z
    .string()
    .min(2)
    .regex(/^[A-Z0-9_]+$/, "code must be UPPER_SNAKE_CASE"),
  label: z.string().min(1),
  assetTypeId: z.string().optional(),
});

export type FailureCodeFormState = { error?: string } | undefined;

export async function createFailureCode(
  _prevState: FailureCodeFormState,
  formData: FormData,
): Promise<FailureCodeFormState> {
  const admin = await requireOrgAdmin();

  const parsed = failureCodeSchema.safeParse({
    code: formData.get("code"),
    label: formData.get("label"),
    assetTypeId: formData.get("assetTypeId") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const existing = await prisma.failureCode.findUnique({ where: { code: parsed.data.code } });
  if (existing) return { error: "That code already exists." };

  const failureCode = await prisma.failureCode.create({
    data: {
      code: parsed.data.code,
      label: parsed.data.label,
      assetTypeId: parsed.data.assetTypeId || null,
    },
  });

  await recordAudit({
    entityType: "FailureCode",
    entityId: failureCode.id,
    action: "created",
    userId: admin.id,
    changes: { code: failureCode.code },
  });

  revalidatePath("/admin/failure-codes");
}
