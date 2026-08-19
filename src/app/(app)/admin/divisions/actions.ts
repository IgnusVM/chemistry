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
