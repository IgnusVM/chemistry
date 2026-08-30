"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireOrgAdmin, requireRootDirector, isRootDirector } from "@/lib/dal";
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
  const existingEmail = await prisma.user.findUnique({ where: { email } });
  if (existingEmail) {
    return { error: "A user with that email already exists." };
  }
  const existingName = await prisma.user.findUnique({ where: { displayName: parsed.data.displayName } });
  if (existingName) {
    return { error: `The user name "${parsed.data.displayName}" is already taken.` };
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

const updateUserProfileSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
  name: z.string().optional(),
});

export type UpdateUserProfileState = { error?: string } | undefined;

export async function updateUserProfile(
  _prevState: UpdateUserProfileState,
  formData: FormData,
): Promise<UpdateUserProfileState> {
  const admin = await requireOrgAdmin();

  const parsed = updateUserProfileSchema.safeParse({
    id: formData.get("id"),
    displayName: formData.get("displayName"),
    name: formData.get("name") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const existingName = await prisma.user.findUnique({ where: { displayName: parsed.data.displayName } });
  if (existingName && existingName.id !== parsed.data.id) {
    return { error: `The user name "${parsed.data.displayName}" is already taken.` };
  }

  await prisma.user.update({
    where: { id: parsed.data.id },
    data: { displayName: parsed.data.displayName, name: parsed.data.name ?? null },
  });

  await recordAudit({
    entityType: "User",
    entityId: parsed.data.id,
    action: "updated",
    userId: admin.id,
    changes: { displayName: parsed.data.displayName, name: parsed.data.name },
  });

  revalidatePath("/admin/users");
}

export async function deleteUser(userId: string) {
  const admin = await requireOrgAdmin();

  if (userId === admin.id) {
    throw new Error("You can't delete your own account.");
  }

  const target = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

  // Deleting a Director would be the simplest escalation of all: remove the
  // person above you rather than argue with them. Only the root may, and the
  // root themselves cannot be deleted at all.
  if (isRootDirector(target)) {
    throw new Error("The root Director's account can't be deleted.");
  }
  if (target.isDirector && !isRootDirector(admin)) {
    throw new Error("Only the root Director can delete a Director.");
  }

  // Their past loans survive deletion with an "Unknown" borrower, but anything
  // still in their hands has to be accounted for first or the item is simply lost.
  const outstanding = await prisma.assetLoan.count({
    where: { borrowerUserId: userId, checkedInAt: null },
  });
  if (outstanding > 0) {
    throw new Error(
      `${target.displayName} still has ${outstanding} item${outstanding === 1 ? "" : "s"} checked out. Check them in first.`,
    );
  }

  if (target.isOrgAdmin) {
    const otherAdminCount = await prisma.user.count({ where: { isOrgAdmin: true, id: { not: userId } } });
    if (otherAdminCount === 0) {
      throw new Error("Can't delete the last org admin — grant someone else admin first.");
    }
  }

  await prisma.user.delete({ where: { id: userId } });

  await recordAudit({
    entityType: "User",
    entityId: userId,
    action: "deleted",
    userId: admin.id,
    changes: { email: target.email, displayName: target.displayName },
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

/**
 * Grant or revoke Director. Only the root Director may call this.
 *
 * The root cannot revoke their own Director status. Not a courtesy: it is the
 * one account that can hand the role out, so letting it drop the role would
 * leave an installation where nobody can ever grant it again, recoverable only
 * by editing the database.
 */
export async function setDirector(userId: string, isDirector: boolean) {
  const root = await requireRootDirector();

  const target = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { id: true, email: true, displayName: true },
  });

  if (isRootDirector(target) && !isDirector) {
    throw new Error("The root Director can't be removed.");
  }

  await prisma.user.update({ where: { id: userId }, data: { isDirector } });
  await recordAudit({
    entityType: "User",
    entityId: userId,
    action: isDirector ? "director-granted" : "director-revoked",
    userId: root.id,
    changes: { displayName: target.displayName },
  });
  revalidatePath("/admin/users");
}

export async function toggleOrgAdmin(userId: string, isOrgAdmin: boolean) {
  const admin = await requireOrgAdmin();

  // An org admin removing a Director's admin flag would be reaching upward.
  // The Director flag is what carries their access, so this is belt and braces
  // -- but the rule should be stated where the action is, not assumed.
  const subject = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { isDirector: true, email: true },
  });
  if (subject.isDirector && !isRootDirector(admin)) {
    throw new Error("Only the root Director can change a Director's roles.");
  }

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
