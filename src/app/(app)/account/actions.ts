"use server";

import { revalidatePath } from "next/cache";
import { requireCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { hashPin, pinSchema } from "@/lib/pin";

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
