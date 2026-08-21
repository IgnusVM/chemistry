"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireOrgAdmin } from "@/lib/dal";
import { recordAudit } from "@/lib/audit";

const resolutionCodeSchema = z.object({
  code: z
    .string()
    .min(2)
    .regex(/^[A-Z0-9_]+$/, "code must be UPPER_SNAKE_CASE"),
  label: z.string().min(1),
});

export type ResolutionCodeFormState = { error?: string } | undefined;

export async function createResolutionCode(
  _prevState: ResolutionCodeFormState,
  formData: FormData,
): Promise<ResolutionCodeFormState> {
  const admin = await requireOrgAdmin();

  const parsed = resolutionCodeSchema.safeParse({
    code: formData.get("code"),
    label: formData.get("label"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const existing = await prisma.resolutionCode.findUnique({ where: { code: parsed.data.code } });
  if (existing) return { error: "That code already exists." };

  const resolutionCode = await prisma.resolutionCode.create({ data: parsed.data });

  await recordAudit({
    entityType: "ResolutionCode",
    entityId: resolutionCode.id,
    action: "created",
    userId: admin.id,
    changes: { code: resolutionCode.code },
  });

  revalidatePath("/admin/resolution-codes");
}

const updateResolutionCodeSchema = z.object({
  id: z.string().min(1),
  code: z
    .string()
    .min(2)
    .regex(/^[A-Z0-9_]+$/, "code must be UPPER_SNAKE_CASE"),
  label: z.string().min(1),
});

export async function updateResolutionCode(
  _prevState: ResolutionCodeFormState,
  formData: FormData,
): Promise<ResolutionCodeFormState> {
  const admin = await requireOrgAdmin();

  const parsed = updateResolutionCodeSchema.safeParse({
    id: formData.get("id"),
    code: formData.get("code"),
    label: formData.get("label"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const existing = await prisma.resolutionCode.findUnique({ where: { code: parsed.data.code } });
  if (existing && existing.id !== parsed.data.id) return { error: "That code already exists." };

  await prisma.resolutionCode.update({
    where: { id: parsed.data.id },
    data: { code: parsed.data.code, label: parsed.data.label },
  });

  await recordAudit({
    entityType: "ResolutionCode",
    entityId: parsed.data.id,
    action: "updated",
    userId: admin.id,
    changes: { code: parsed.data.code, label: parsed.data.label },
  });

  revalidatePath("/admin/resolution-codes");
}
