"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { issueAndSendMagicLink } from "@/lib/magic-link";
import { getTrustedDeviceUser, touchTrustedDevice } from "@/lib/device-trust";
import { pinSchema, verifyPin } from "@/lib/pin";
import { createSession } from "@/lib/session";
import { safeNextPath } from "@/lib/safe-redirect";

const emailSchema = z.email();

const PIN_LOCKOUT_THRESHOLD = 5;
const PIN_LOCKOUT_DURATION_MS = 15 * 60 * 1000;

export type RequestMagicLinkState = {
  message?: string;
  error?: string;
} | undefined;

export async function requestMagicLink(
  _prevState: RequestMagicLinkState,
  formData: FormData,
): Promise<RequestMagicLinkState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) {
    return { error: "Enter a valid email address." };
  }
  const email = parsed.data.toLowerCase().trim();
  const next = formData.get("next");

  const user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    await issueAndSendMagicLink(user.id, email, next).catch((err) => {
      console.error("Failed to send magic link:", err);
    });
  }

  return { message: "If that email has an account, a sign-in link is on its way." };
}

export type PinLoginState = { error?: string } | undefined;

export async function loginWithPin(
  _prevState: PinLoginState,
  formData: FormData,
): Promise<PinLoginState> {
  const pin = String(formData.get("pin") ?? "");
  const next = formData.get("next");

  const user = await getTrustedDeviceUser();
  if (!user || !user.pinHash) {
    return { error: "This device isn't set up for PIN sign-in. Use email instead." };
  }

  if (user.pinLockedUntil && user.pinLockedUntil > new Date()) {
    return { error: "Too many attempts. Sign in with email to reset your PIN lock." };
  }

  if (!pinSchema.test(pin)) {
    return { error: "Enter your PIN." };
  }

  const valid = await verifyPin(pin, user.pinHash);
  if (!valid) {
    const failedCount = user.pinFailedCount + 1;
    const locked = failedCount >= PIN_LOCKOUT_THRESHOLD;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        pinFailedCount: failedCount,
        pinLockedUntil: locked ? new Date(Date.now() + PIN_LOCKOUT_DURATION_MS) : null,
      },
    });
    return {
      error: locked ? "Too many attempts. Sign in with email to reset your PIN lock." : "Wrong PIN.",
    };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { pinFailedCount: 0, pinLockedUntil: null },
  });
  await createSession(user.id);
  await touchTrustedDevice();

  const destination = safeNextPath(next);
  redirect(destination);
}
