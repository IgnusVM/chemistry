import { NextRequest, NextResponse } from "next/server";
import { decryptSession } from "@/lib/session";

const PUBLIC_ROUTES = ["/login", "/auth/verify", "/auth/clear"];
const REDIRECT_EXEMPT_ROUTES = ["/auth/verify", "/auth/clear"];

export async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const isPublicRoute = PUBLIC_ROUTES.some((route) => path.startsWith(route));

  const cookie = req.cookies.get("session")?.value;
  const session = await decryptSession(cookie);

  if (!isPublicRoute && !session?.userId) {
    const loginUrl = new URL("/login", req.nextUrl);
    loginUrl.searchParams.set("next", path);
    return NextResponse.redirect(loginUrl);
  }

  if (isPublicRoute && session?.userId && !REDIRECT_EXEMPT_ROUTES.some((route) => path.startsWith(route))) {
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
