"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireOrgAdmin } from "@/lib/dal";
import { recordAudit } from "@/lib/audit";

const departmentSchema = z.object({
  name: z.string().min(2),
  slug: z
    .string()
    .min(2)
    .regex(/^[a-z0-9-]+$/, "slug must be lowercase letters, numbers, and hyphens"),
  description: z.string().optional(),
  divisionId: z.string().optional(),
});

export type DepartmentFormState = { error?: string } | undefined;

export async function createDepartment(
  _prevState: DepartmentFormState,
  formData: FormData,
): Promise<DepartmentFormState> {
  const admin = await requireOrgAdmin();

  const parsed = departmentSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    description: formData.get("description") || undefined,
    divisionId: formData.get("divisionId") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const department = await prisma.department.create({ data: parsed.data });
  await recordAudit({
    entityType: "Department",
    entityId: department.id,
    action: "created",
    userId: admin.id,
    changes: parsed.data,
  });

  revalidatePath("/admin/departments");
}

export async function toggleDepartmentActive(departmentId: string, active: boolean) {
  const admin = await requireOrgAdmin();
  await prisma.department.update({ where: { id: departmentId }, data: { active } });
  await recordAudit({
    entityType: "Department",
    entityId: departmentId,
    action: active ? "activated" : "deactivated",
    userId: admin.id,
  });
  revalidatePath("/admin/departments");
}
