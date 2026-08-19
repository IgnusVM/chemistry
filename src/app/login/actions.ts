"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { issueMagicLinkToken } from "@/lib/magic-link";
import { sendMagicLinkEmail } from "@/lib/mailer";

const emailSchema = z.email();

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
    const token = await issueMagicLinkToken(user.id);
    const base = process.env.APP_BASE_URL ?? "http://localhost:3000";
    const verifyUrl = new URL("/auth/verify", base);
    verifyUrl.searchParams.set("token", token);
    if (typeof next === "string" && next.startsWith("/")) {
      verifyUrl.searchParams.set("next", next);
    }
    await sendMagicLinkEmail(email, verifyUrl.toString());
  }

  return { message: "If that email has an account, a sign-in link is on its way." };
}
