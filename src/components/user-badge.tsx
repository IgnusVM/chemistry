import { resolveBadgeIcon, resolveBadgeColorClass } from "@/lib/badge-icons";
import type { ResolvedBadge } from "@/lib/user-badge-data";

const SIZE_CLASSES = { sm: "h-4.5 w-4.5", md: "h-6 w-6" };

/** Small identity badge — an uploaded photo, or an icon in the user's chosen
 * color, or a default icon if they haven't set either. Pure/presentational:
 * avatar URLs are resolved server-side ahead of time via resolveBadge(s) so
 * this same component works from both Server and Client components. */
export function UserBadge({
  badge,
  size = "sm",
}: {
  badge: ResolvedBadge | null | undefined;
  size?: "sm" | "md";
}) {
  if (!badge) return null;
  const dims = SIZE_CLASSES[size];

  if (badge.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={badge.avatarUrl}
        alt=""
        className={`${dims} shrink-0 rounded-full object-cover ring-1 ring-neutral-200`}
      />
    );
  }

  // resolveBadgeIcon looks up a stable, module-level component reference
  // from a fixed registry — it doesn't construct a new component, so this
  // is a false positive for static-components.
  const Icon = resolveBadgeIcon(badge.badgeIcon);
  const colorClass = resolveBadgeColorClass(badge.badgeColor);
  // eslint-disable-next-line react-hooks/static-components
  return <Icon className={`${dims} shrink-0 ${colorClass}`} aria-hidden="true" />;
}

/** Badge + display name, for attribution lines ("logged by", "added by", etc.) */
export function UserBadgeLabel({ badge, fallback = "Unknown" }: { badge: ResolvedBadge | null | undefined; fallback?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <UserBadge badge={badge} />
      <span>{badge?.displayName ?? fallback}</span>
    </span>
  );
}
