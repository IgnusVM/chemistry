"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireOrgAdmin } from "@/lib/dal";
import { recordAudit } from "@/lib/audit";

const divisionSchema = z.object({
  name: z.string().min(2),
  slug: z
    .string()
    .min(2)
    .regex(/^[a-z0-9-]+$/, "slug must be lowercase letters, numbers, and hyphens"),
  description: z.string().optional(),
});

export type DivisionFormState = { error?: string } | undefined;

export async function createDivision(
  _prevState: DivisionFormState,
  formData: FormData,
): Promise<DivisionFormState> {
  const admin = await requireOrgAdmin();

  const parsed = divisionSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    description: formData.get("description") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const division = await prisma.division.create({ data: parsed.data });
  await recordAudit({
    entityType: "Division",
    entityId: division.id,
    action: "created",
    userId: admin.id,
    changes: parsed.data,
  });

  revalidatePath("/admin/divisions");
  revalidatePath("/admin/departments");
}

const updateDivisionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(2),
  slug: z
    .string()
    .min(2)
    .regex(/^[a-z0-9-]+$/, "slug must be lowercase letters, numbers, and hyphens"),
  description: z.string().optional(),
  // Empty string means "no lead" -- the select's blank option. Coerced to null
  // rather than left as "" so the column holds a real absence.
  leadUserId: z.string().optional().transform((v) => (v ? v : null)),
});

export async function updateDivision(
  _prevState: DivisionFormState,
  formData: FormData,
): Promise<DivisionFormState> {
  const admin = await requireOrgAdmin();

  const parsed = updateDivisionSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    slug: formData.get("slug"),
    description: formData.get("description") || undefined,
    leadUserId: formData.get("leadUserId") ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  // The lead must be a real user. Without this a stale or forged id would be
  // written straight into the column that gates division board visibility.
  if (parsed.data.leadUserId) {
    const lead = await prisma.user.findUnique({ where: { id: parsed.data.leadUserId }, select: { id: true } });
    if (!lead) return { error: "That user no longer exists." };
  }

  const existing = await prisma.division.findUnique({ where: { slug: parsed.data.slug } });
  if (existing && existing.id !== parsed.data.id) {
    return { error: `Slug "${parsed.data.slug}" is already in use.` };
  }

  const { id, ...data } = parsed.data;
  await prisma.division.update({ where: { id }, data });

  await recordAudit({
    entityType: "Division",
    entityId: id,
    action: "updated",
    userId: admin.id,
    changes: data,
  });

  revalidatePath("/admin/divisions");
  revalidatePath("/admin/departments");
}
