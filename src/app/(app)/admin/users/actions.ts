"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireOrgAdmin } from "@/lib/dal";
import { recordAudit } from "@/lib/audit";
import { issueInviteCode } from "@/lib/invite";
import { appUrl } from "@/lib/app-url";

const userSchema = z.object({
  email: z.email(),
  displayName: z.string().min(1),
  name: z.string().optional(),
});

export type UserFormState = { error?: string } | undefined;

export async function createUser(
  _prevState: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  const admin = await requireOrgAdmin();

  const parsed = userSchema.safeParse({
    email: formData.get("email"),
    displayName: formData.get("displayName"),
    name: formData.get("name") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const email = parsed.data.email.toLowerCase().trim();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "A user with that email already exists." };
  }

  const user = await prisma.user.create({
    data: { ...parsed.data, email },
  });
  await recordAudit({
    entityType: "User",
    entityId: user.id,
    action: "created",
    userId: admin.id,
    changes: { email },
  });

  revalidatePath("/admin/users");
}

const membershipSchema = z.object({
  userId: z.string().min(1),
  departmentId: z.string().min(1),
  role: z.enum(["VIEWER", "MEMBER", "LEAD"]),
});

export async function addMembership(formData: FormData) {
  const admin = await requireOrgAdmin();
  const parsed = membershipSchema.parse({
    userId: formData.get("userId"),
    departmentId: formData.get("departmentId"),
    role: formData.get("role"),
  });

  await prisma.departmentMembership.upsert({
    where: { userId_departmentId: { userId: parsed.userId, departmentId: parsed.departmentId } },
    update: { role: parsed.role },
    create: parsed,
  });

  await recordAudit({
    entityType: "DepartmentMembership",
    entityId: `${parsed.userId}:${parsed.departmentId}`,
    action: "set",
    userId: admin.id,
    changes: parsed,
  });

  revalidatePath("/admin/users");
}

export async function removeMembership(userId: string, departmentId: string) {
  const admin = await requireOrgAdmin();
  await prisma.departmentMembership.delete({
    where: { userId_departmentId: { userId, departmentId } },
  });
  await recordAudit({
    entityType: "DepartmentMembership",
    entityId: `${userId}:${departmentId}`,
    action: "removed",
    userId: admin.id,
  });
  revalidatePath("/admin/users");
}

export async function toggleOrgAdmin(userId: string, isOrgAdmin: boolean) {
  const admin = await requireOrgAdmin();

  if (!isOrgAdmin) {
    const otherAdminCount = await prisma.user.count({
      where: { isOrgAdmin: true, id: { not: userId } },
    });
    if (otherAdminCount === 0) {
      throw new Error("Can't remove the last org admin — grant someone else admin first.");
    }
  }

  await prisma.user.update({ where: { id: userId }, data: { isOrgAdmin } });
  await recordAudit({
    entityType: "User",
    entityId: userId,
    action: isOrgAdmin ? "granted org admin" : "revoked org admin",
    userId: admin.id,
  });
  revalidatePath("/admin/users");
}

export async function generateInviteLink() {
  const admin = await requireOrgAdmin();
  const { invite, token } = await issueInviteCode(admin.id);

  await recordAudit({
    entityType: "InviteCode",
    entityId: invite.id,
    action: "created",
    userId: admin.id,
  });

  revalidatePath("/admin/users");
  return appUrl(`/join?invite=${token}`).toString();
}

export async function revokeInviteCode(inviteId: string) {
  const admin = await requireOrgAdmin();
  const deleted = await prisma.inviteCode.deleteMany({ where: { id: inviteId, usedAt: null } });
  if (deleted.count === 0) return;

  await recordAudit({
    entityType: "InviteCode",
    entityId: inviteId,
    action: "revoked",
    userId: admin.id,
  });
  revalidatePath("/admin/users");
}
