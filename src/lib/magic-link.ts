import "server-only";
import { randomBytes, createHash } from "crypto";
import { prisma } from "@/lib/prisma";

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
  const record = await prisma.magicLinkToken.findUnique({ where: { tokenHash } });
  if (!record) return null;
  if (record.usedAt) return null;
  if (record.expiresAt < new Date()) return null;

  await prisma.magicLinkToken.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  });

  return record.userId;
}
