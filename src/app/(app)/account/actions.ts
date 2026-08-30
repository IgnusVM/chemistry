"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { hashPin, pinSchema } from "@/lib/pin";
import { buildAvatarKey, uploadAttachment, deleteAttachmentObject } from "@/lib/s3";
import { isValidBadgeIcon, isOrgAdminOnlyBadgeIcon, isValidBadgeColor } from "@/lib/badge-icons";

const ALLOWED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

const profileSchema = z.object({
  displayName: z.string().min(1, "User name is required"),
  name: z.string().optional(),
});

export type ProfileFormState = { error?: string; message?: string } | undefined;

export async function updateProfile(
  _prevState: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const user = await requireCurrentUser();

  const parsed = profileSchema.safeParse({
    displayName: formData.get("displayName"),
    name: formData.get("name") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      displayName: parsed.data.displayName,
      name: parsed.data.name || null,
    },
  });

  revalidatePath("/account");
  revalidatePath("/", "layout");
  return { message: "Saved." };
}

const contactInfoSchema = z.object({
  phone: z
    .string()
    .regex(/^[0-9+()\-.\s]{7,20}$/, "That doesn't look like a phone number")
    .optional()
    .or(z.literal("")),
  notifyByEmail: z.boolean(),
  contactDuringBurnCell: z.boolean(),
  contactDuringBurnEmail: z.boolean(),
  contactDuringBurnOther: z.string().optional(),
});

export type ContactInfoFormState = { error?: string; message?: string } | undefined;

export async function updateContactInfo(
  _prevState: ContactInfoFormState,
  formData: FormData,
): Promise<ContactInfoFormState> {
  const user = await requireCurrentUser();

  const parsed = contactInfoSchema.safeParse({
    phone: formData.get("phone") || "",
    notifyByEmail: formData.get("notifyByEmail") === "on",
    contactDuringBurnCell: formData.get("contactDuringBurnCell") === "on",
    contactDuringBurnEmail: formData.get("contactDuringBurnEmail") === "on",
    contactDuringBurnOther: formData.get("contactDuringBurnOther") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      phone: parsed.data.phone || null,
      notifyByEmail: parsed.data.notifyByEmail,
      contactDuringBurnCell: parsed.data.contactDuringBurnCell,
      contactDuringBurnEmail: parsed.data.contactDuringBurnEmail,
      contactDuringBurnOther: parsed.data.contactDuringBurnOther || null,
    },
  });

  revalidatePath("/account");
  return { message: "Saved." };
}

export type SetPinFormState = { error?: string; message?: string } | undefined;

export async function setPin(
  _prevState: SetPinFormState,
  formData: FormData,
): Promise<SetPinFormState> {
  const user = await requireCurrentUser();
  const pin = String(formData.get("pin") ?? "");
  const confirmPin = String(formData.get("confirmPin") ?? "");

  if (!pinSchema.test(pin)) {
    return { error: "PIN must be 4-8 digits." };
  }
  if (pin !== confirmPin) {
    return { error: "PINs don't match." };
  }

  const pinHash = await hashPin(pin);
  await prisma.user.update({
    where: { id: user.id },
    data: { pinHash, pinFailedCount: 0, pinLockedUntil: null },
  });

  revalidatePath("/account");
  return { message: "PIN set. This device will use it for faster sign-in next time." };
}

export async function clearPin() {
  const user = await requireCurrentUser();
  await prisma.user.update({
    where: { id: user.id },
    data: { pinHash: null, pinFailedCount: 0, pinLockedUntil: null },
  });
  revalidatePath("/account");
}

export async function revokeTrustedDevice(deviceId: string) {
  const user = await requireCurrentUser();
  await prisma.trustedDevice.deleteMany({ where: { id: deviceId, userId: user.id } });
  revalidatePath("/account");
}

export type AvatarFormState = { error?: string } | undefined;

export async function uploadAvatar(
  _prevState: AvatarFormState,
  formData: FormData,
): Promise<AvatarFormState> {
  const user = await requireCurrentUser();
  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose an image." };
  }
  if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
    return { error: "Use a JPEG, PNG, WebP, or GIF image." };
  }
  if (file.size > MAX_AVATAR_BYTES) {
    return { error: "Image is over the 5MB limit." };
  }

  const key = buildAvatarKey(user.id, file.name);
  const buffer = Buffer.from(await file.arrayBuffer());
  try {
    await uploadAttachment(key, buffer, file.type);
  } catch {
    return { error: "Upload failed. Storage isn't reachable right now, so try again in a bit." };
  }

  const oldKey = user.avatarS3Key;
  await prisma.user.update({ where: { id: user.id }, data: { avatarS3Key: key } });
  if (oldKey) {
    await deleteAttachmentObject(oldKey).catch(() => {});
  }

  revalidatePath("/account");
  revalidatePath("/", "layout");
}

export async function removeAvatar() {
  const user = await requireCurrentUser();
  if (!user.avatarS3Key) return;
  await deleteAttachmentObject(user.avatarS3Key).catch(() => {});
  await prisma.user.update({ where: { id: user.id }, data: { avatarS3Key: null } });
  revalidatePath("/account");
  revalidatePath("/", "layout");
}

const badgeSchema = z.object({
  badgeIcon: z.string().optional(),
  badgeColor: z.string().optional(),
});

export type BadgeFormState = { error?: string } | undefined;

export async function updateBadge(
  _prevState: BadgeFormState,
  formData: FormData,
): Promise<BadgeFormState> {
  const user = await requireCurrentUser();

  const parsed = badgeSchema.safeParse({
    badgeIcon: formData.get("badgeIcon") || undefined,
    badgeColor: formData.get("badgeColor") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  if (parsed.data.badgeIcon) {
    if (!isValidBadgeIcon(parsed.data.badgeIcon)) return { error: "Unknown icon." };
    if (isOrgAdminOnlyBadgeIcon(parsed.data.badgeIcon) && !user.isOrgAdmin) {
      return { error: "That badge is reserved for org admins." };
    }
  }
  if (parsed.data.badgeColor && !isValidBadgeColor(parsed.data.badgeColor)) {
    return { error: "Unknown color." };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      badgeIcon: parsed.data.badgeIcon || null,
      badgeColor: parsed.data.badgeColor || null,
    },
  });

  revalidatePath("/account");
  revalidatePath("/", "layout");
}
