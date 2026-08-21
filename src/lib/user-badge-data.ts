import "server-only";
import { getAttachmentUrl } from "@/lib/s3";

export type BadgeUser = {
  displayName: string;
  avatarS3Key: string | null;
  badgeIcon: string | null;
  badgeColor: string | null;
} | null | undefined;

export type ResolvedBadge = {
  displayName: string;
  avatarUrl: string | null;
  badgeIcon: string | null;
  badgeColor: string | null;
};

export async function resolveBadge(user: BadgeUser): Promise<ResolvedBadge | null> {
  if (!user) return null;
  const avatarUrl = user.avatarS3Key ? await getAttachmentUrl(user.avatarS3Key) : null;
  return {
    displayName: user.displayName,
    avatarUrl,
    badgeIcon: user.badgeIcon,
    badgeColor: user.badgeColor,
  };
}

export async function resolveBadges(users: BadgeUser[]): Promise<(ResolvedBadge | null)[]> {
  return Promise.all(users.map(resolveBadge));
}
