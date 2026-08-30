"use client";

import { useState, useTransition } from "react";
import { updateBadge, type BadgeFormState } from "./actions";
import { BADGE_ICONS, ORG_ADMIN_BADGE_ICONS, BADGE_COLORS, resolveBadgeIcon, resolveBadgeColorClass } from "@/lib/badge-icons";
import { Button } from "@/components/button";

export function BadgeForm({
  badgeIcon,
  badgeColor,
  isOrgAdmin,
}: {
  badgeIcon: string | null;
  badgeColor: string | null;
  isOrgAdmin: boolean;
}) {
  const [icon, setIcon] = useState(badgeIcon ?? "");
  const [color, setColor] = useState(badgeColor ?? "");
  const [state, setState] = useState<BadgeFormState>(undefined);
  const [pending, startTransition] = useTransition();

  // See UserBadge for why this lookup isn't actually constructing a component.
  const PreviewIcon = resolveBadgeIcon(icon || null);
  const previewColorClass = resolveBadgeColorClass(color || null);

  return (
    <div className="rounded-md border border-neutral-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-neutral-900">Badge</h2>
      <p className="text-xs text-neutral-500">Shown as a small icon next to your name on notes, work orders, and attachments. It is only used when no profile picture is set.</p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          startTransition(async () => {
            const result = await updateBadge(undefined, formData);
            setState(result);
          });
        }}
        className="mt-3 flex flex-wrap items-end gap-3"
      >
        {/* The preview showed an 18px mark inside a 36px circle — half of it
            empty, which read as a rendering fault rather than a small icon.
            The artwork itself fills 99% of its own viewBox; only the ratio was
            wrong. A badge is a mark, not a UI glyph, so it wants most of the
            circle. */}
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-neutral-50">
          {/* eslint-disable-next-line react-hooks/static-components -- stable lookup, see UserBadge */}
          <PreviewIcon className={`h-8 w-8 ${previewColorClass}`} />
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-600">Icon</label>
          <select
            name="badgeIcon"
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
            className="mt-1 rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
          >
            <option value="">Default (wrench)</option>
            {Object.entries(BADGE_ICONS).map(([key, { label }]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
            {isOrgAdmin &&
              Object.entries(ORG_ADMIN_BADGE_ICONS).map(([key, { label }]) => (
                <option key={key} value={key}>
                  {label} (org admin)
                </option>
              ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-600">Color</label>
          <select
            name="badgeColor"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="mt-1 rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
          >
            {Object.entries(BADGE_COLORS).map(([key, { label }]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <Button type="submit" variant="secondary" pending={pending} pendingText="Saving…">
          Save badge
        </Button>
        {state?.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
      </form>
    </div>
  );
}
