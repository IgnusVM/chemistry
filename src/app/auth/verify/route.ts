import { NextRequest, NextResponse } from "next/server";
import { consumeMagicLinkToken } from "@/lib/magic-link";
import { createSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const next = req.nextUrl.searchParams.get("next");

  if (!token) {
    return NextResponse.redirect(new URL("/login?error=missing-token", req.nextUrl));
  }

  const userId = await consumeMagicLinkToken(token);
  if (!userId) {
    return NextResponse.redirect(new URL("/login?error=invalid-token", req.nextUrl));
  }

  await createSession(userId);

  const destination = next && next.startsWith("/") ? next : "/";
  return NextResponse.redirect(new URL(destination, req.nextUrl));
}
