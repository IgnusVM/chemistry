"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { hashPin, pinSchema } from "@/lib/pin";

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
