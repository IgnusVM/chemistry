import { NextRequest, NextResponse } from "next/server";
import { decryptSession } from "@/lib/session";

const PUBLIC_ROUTES = ["/login", "/join", "/auth/verify", "/auth/clear"];
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
  // PWA install assets are excluded here rather than added to PUBLIC_ROUTES on
  // purpose: a "public route" also triggers the signed-in redirect above, which
  // would bounce /sw.js to "/" for exactly the users running the installed app.
  // These are static files with no user data, so skipping the proxy entirely is
  // both correct and cheaper.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|offline|apple-touch-icon.png|icon-192.png|icon-512.png|icon-maskable-512.png|zxing_reader.wasm).*)",
  ],
};
