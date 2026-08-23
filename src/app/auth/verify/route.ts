import { NextRequest, NextResponse } from "next/server";
import { consumeMagicLinkToken } from "@/lib/magic-link";
import { createSession } from "@/lib/session";
import { trustThisDevice } from "@/lib/device-trust";
import { prisma } from "@/lib/prisma";
import { appUrl } from "@/lib/app-url";
import { safeNextPath } from "@/lib/safe-redirect";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const next = req.nextUrl.searchParams.get("next");

  if (!token) {
    return NextResponse.redirect(appUrl("/login?error=missing-token"));
  }

  const userId = await consumeMagicLinkToken(token);
  if (!userId) {
    return NextResponse.redirect(appUrl("/login?error=invalid-token"));
  }

  await createSession(userId);
  await trustThisDevice(userId);
  // A magic-link login is a stronger identity proof than a PIN, so it clears any PIN lockout.
  await prisma.user.update({
    where: { id: userId },
    data: { pinFailedCount: 0, pinLockedUntil: null },
  });

  const destination = safeNextPath(next);
  return NextResponse.redirect(appUrl(destination));
}
