import "server-only";
import { randomBytes, createHash } from "crypto";
import { cookies, headers } from "next/headers";
import { prisma } from "@/lib/prisma";

function labelFromUserAgent(ua: string | null) {
  if (!ua) return null;
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /Chrome\//.test(ua)
      ? "Chrome"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /Safari\//.test(ua)
          ? "Safari"
          : "Browser";
  const os = /Windows/.test(ua)
    ? "Windows"
    : /Mac OS/.test(ua)
      ? "Mac"
      : /Android/.test(ua)
        ? "Android"
        : /iPhone|iPad/.test(ua)
          ? "iOS"
          : "device";
  return `${browser} on ${os}`;
}

const DEVICE_COOKIE = "device_trust";
const DEVICE_COOKIE_DURATION_MS = 180 * 24 * 60 * 60 * 1000;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function trustThisDevice(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const headerStore = await headers();
  const label = labelFromUserAgent(headerStore.get("user-agent"));
  await prisma.trustedDevice.create({
    data: { userId, tokenHash: hashToken(token), label },
  });

  const cookieStore = await cookies();
  cookieStore.set(DEVICE_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    expires: new Date(Date.now() + DEVICE_COOKIE_DURATION_MS),
    sameSite: "lax",
    path: "/",
  });
}

export async function getTrustedDeviceUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(DEVICE_COOKIE)?.value;
  if (!token) return null;

  const device = await prisma.trustedDevice.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });
  if (!device) return null;
  return device.user;
}

export async function touchTrustedDevice() {
  const cookieStore = await cookies();
  const token = cookieStore.get(DEVICE_COOKIE)?.value;
  if (!token) return;
  await prisma.trustedDevice
    .update({ where: { tokenHash: hashToken(token) }, data: { lastUsedAt: new Date() } })
    .catch(() => {});
}
