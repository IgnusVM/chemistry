"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { claimInvite } from "@/lib/invite";
import { issueAndSendMagicLink } from "@/lib/magic-link";
import { recordAudit } from "@/lib/audit";

const joinSchema = z.object({
  token: z.string().min(1),
  email: z.email(),
  displayName: z.string().min(1).max(80),
});

export type JoinFormState = { error?: string; message?: string } | undefined;

export async function joinWithInvite(
  _prevState: JoinFormState,
  formData: FormData,
): Promise<JoinFormState> {
  const parsed = joinSchema.safeParse({
    token: formData.get("token"),
    email: formData.get("email"),
    displayName: formData.get("displayName"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const invite = await claimInvite(parsed.data.token);
  if (!invite) {
    return { error: "This invite link is invalid, expired, or already used." };
  }

  const email = parsed.data.email.toLowerCase().trim();
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    user = await prisma.user.create({ data: { email, displayName: parsed.data.displayName } });
  }

  await prisma.inviteCode.update({ where: { id: invite.id }, data: { usedByUserId: user.id } });
  await recordAudit({
    entityType: "InviteCode",
    entityId: invite.id,
    action: "redeemed",
    userId: user.id,
    changes: { email },
  });

  try {
    await issueAndSendMagicLink(user.id, email, null);
  } catch (err) {
    console.error("Failed to send magic link after invite redemption:", err);
    return {
      message:
        "Account created, but the sign-in email couldn't be sent right now. Go to the sign-in page and request a link.",
    };
  }

  return { message: "Account created — check your email for a sign-in link." };
}
