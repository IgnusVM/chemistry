import "server-only";
import { randomBytes, createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { appUrl } from "@/lib/app-url";
import { sendMagicLinkEmail } from "@/lib/mailer";
import { safeNextPath } from "@/lib/safe-redirect";

const TOKEN_TTL_MS = 15 * 60 * 1000;
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;
const RATE_LIMIT_MAX = 3;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function isMagicLinkRateLimited(userId: string) {
  const count = await prisma.magicLinkToken.count({
    where: { userId, createdAt: { gte: new Date(Date.now() - RATE_LIMIT_WINDOW_MS) } },
  });
  return count >= RATE_LIMIT_MAX;
}

export async function issueAndSendMagicLink(userId: string, email: string, next: FormDataEntryValue | null) {
  if (await isMagicLinkRateLimited(userId)) return;
  const token = await issueMagicLinkToken(userId);
  const verifyUrl = appUrl("/auth/verify");
  verifyUrl.searchParams.set("token", token);
  // Validated here as well as at redirect time: an unvalidated value would
  // otherwise be baked into an email that outlives this request.
  const nextPath = safeNextPath(next, "");
  if (nextPath) verifyUrl.searchParams.set("next", nextPath);
  await sendMagicLinkEmail(email, verifyUrl.toString());
}

export async function issueMagicLinkToken(userId: string) {
  const token = randomBytes(32).toString("base64url");
  await prisma.magicLinkToken.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
    },
  });
  return token;
}

export async function consumeMagicLinkToken(token: string) {
  const tokenHash = hashToken(token);

  // Claim atomically rather than checking-then-updating. A read followed by a
  // write lets two concurrent requests both observe usedAt === null and both
  // succeed, so a single-use link is not actually single-use — which matters
  // if a link leaks (a forwarded email, a shared mailbox) after the real user
  // has already spent it. updateMany reports how many rows it changed, so
  // exactly one caller can win. Mirrors claimInvite in lib/invite.ts.
  const claim = await prisma.magicLinkToken.updateMany({
    where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
    data: { usedAt: new Date() },
  });
  if (claim.count === 0) return null;

  const record = await prisma.magicLinkToken.findUnique({ where: { tokenHash } });
  return record?.userId ?? null;
}
