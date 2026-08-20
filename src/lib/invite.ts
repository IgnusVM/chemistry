import "server-only";
import { randomBytes, createHash } from "crypto";
import { prisma } from "@/lib/prisma";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function issueInviteCode(createdByUserId: string) {
  const token = randomBytes(24).toString("base64url");
  const invite = await prisma.inviteCode.create({
    data: {
      createdByUserId,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + INVITE_TTL_MS),
    },
  });
  return { invite, token };
}

export async function findValidInvite(token: string) {
  const invite = await prisma.inviteCode.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!invite) return null;
  if (invite.usedAt) return null;
  if (invite.expiresAt < new Date()) return null;
  return invite;
}

/** Atomically marks an invite used so two simultaneous redemptions can't both succeed. */
export async function claimInvite(token: string) {
  const tokenHash = hashToken(token);
  const claim = await prisma.inviteCode.updateMany({
    where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
    data: { usedAt: new Date() },
  });
  if (claim.count === 0) return null;
  return prisma.inviteCode.findUnique({ where: { tokenHash } });
}
