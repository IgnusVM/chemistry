import {
  Wrench,
  Zap,
  Flame,
  Shield,
  Star,
  FlaskConical,
  Sun,
  Anchor,
  Rocket,
  Crown,
  Skull,
  Ghost,
} from "lucide-react";
import type { ComponentType } from "react";
import { MalevolentGodsBadgeIcon } from "@/components/malevolent-gods-badge-icon";

/** Loose enough to cover both lucide's forwardRef icon components and the
 * plain MalevolentGodsBadgeIcon function component — both just need to
 * accept a className. */
type BadgeIconComponent = ComponentType<{ className?: string }>;

export const DEFAULT_BADGE_ICON: BadgeIconComponent = Wrench;

/** Icons any user can pick for their badge. */
export const BADGE_ICONS: Record<string, { label: string; Icon: BadgeIconComponent }> = {
  wrench: { label: "Wrench", Icon: Wrench },
  zap: { label: "Lightning", Icon: Zap },
  flame: { label: "Flame", Icon: Flame },
  shield: { label: "Shield", Icon: Shield },
  star: { label: "Star", Icon: Star },
  flask: { label: "Flask", Icon: FlaskConical },
  sun: { label: "Sun", Icon: Sun },
  anchor: { label: "Anchor", Icon: Anchor },
  rocket: { label: "Rocket", Icon: Rocket },
  crown: { label: "Crown", Icon: Crown },
  skull: { label: "Skull", Icon: Skull },
  ghost: { label: "Ghost", Icon: Ghost },
};

/** Icons gated to org admins ("org leads") — checked server-side in the update action too, not just hidden in the UI. */
export const ORG_ADMIN_BADGE_ICONS: Record<string, { label: string; Icon: BadgeIconComponent }> = {
  "malevolent-gods": { label: "Malevolent Gods", Icon: MalevolentGodsBadgeIcon },
};

export function resolveBadgeIcon(key: string | null): BadgeIconComponent {
  if (!key) return DEFAULT_BADGE_ICON;
  return BADGE_ICONS[key]?.Icon ?? ORG_ADMIN_BADGE_ICONS[key]?.Icon ?? DEFAULT_BADGE_ICON;
}

export function isValidBadgeIcon(key: string): boolean {
  return key in BADGE_ICONS || key in ORG_ADMIN_BADGE_ICONS;
}

export function isOrgAdminOnlyBadgeIcon(key: string): boolean {
  return key in ORG_ADMIN_BADGE_ICONS;
}

/** "Navy" is the actual brand Void Navy from the Malevolent Gods brand guide, not a generic Tailwind blue. */
export const BADGE_COLORS: Record<string, { label: string; className: string }> = {
  neutral: { label: "Gray", className: "text-neutral-500" },
  navy: { label: "Navy", className: "text-[#172554] dark:text-[#8fb0f0]" },
  fuchsia: { label: "Fuchsia", className: "text-fuchsia-600" },
  teal: { label: "Teal", className: "text-teal-600" },
  amber: { label: "Amber", className: "text-amber-600" },
  emerald: { label: "Emerald", className: "text-emerald-600" },
  rose: { label: "Rose", className: "text-rose-600" },
  violet: { label: "Violet", className: "text-violet-600" },
};

export const DEFAULT_BADGE_COLOR = "neutral";

export function resolveBadgeColorClass(key: string | null): string {
  if (!key) return BADGE_COLORS[DEFAULT_BADGE_COLOR].className;
  return BADGE_COLORS[key]?.className ?? BADGE_COLORS[DEFAULT_BADGE_COLOR].className;
}

export function isValidBadgeColor(key: string): boolean {
  return key in BADGE_COLORS;
}
