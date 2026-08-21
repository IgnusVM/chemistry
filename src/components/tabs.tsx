"use client";

import { useState, type ReactNode } from "react";

export type TabColor = "fuchsia" | "blue" | "violet" | "amber" | "teal";

const TAB_COLOR_CLASSES: Record<TabColor, { active: string; panel: string }> = {
  fuchsia: {
    active: "border-fuchsia-600 text-fuchsia-700",
    panel: "border-t-2 border-t-fuchsia-200 bg-fuchsia-50/30",
  },
  blue: {
    active: "border-blue-600 text-blue-700",
    panel: "border-t-2 border-t-blue-200 bg-blue-50/30",
  },
  violet: {
    active: "border-violet-600 text-violet-700",
    panel: "border-t-2 border-t-violet-200 bg-violet-50/30",
  },
  amber: {
    active: "border-amber-600 text-amber-700",
    panel: "border-t-2 border-t-amber-200 bg-amber-50/30",
  },
  teal: {
    active: "border-teal-600 text-teal-700",
    panel: "border-t-2 border-t-teal-200 bg-teal-50/30",
  },
};

export function Tabs({
  tabs,
  defaultTab,
  activeTab,
  onTabChange,
}: {
  tabs: { id: string; label: string; content: ReactNode; color?: TabColor }[];
  defaultTab?: string;
  /** Pass activeTab + onTabChange to control the active tab externally (e.g.
   * from "jump to this tab" buttons elsewhere on the page). Omit both to let
   * Tabs manage its own state. */
  activeTab?: string;
  onTabChange?: (id: string) => void;
}) {
  const [internalActive, setInternalActive] = useState(defaultTab ?? tabs[0]?.id);
  const active = activeTab ?? internalActive;
  const setActive = onTabChange ?? setInternalActive;

  return (
    <div>
      <div className="flex gap-1 border-b border-neutral-200">
        {tabs.map((t) => {
          const colorClasses = TAB_COLOR_CLASSES[t.color ?? "fuchsia"];
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActive(t.id)}
              className={`-mb-px rounded-t-md border-b-2 px-4 py-2 text-sm font-medium transition-colors duration-150 ${
                active === t.id
                  ? colorClasses.active
                  : "border-transparent text-neutral-500 hover:text-neutral-800"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>
      {/* Every panel stays mounted (just hidden) so in-progress form input isn't
          lost on tab switch, and so buttons outside the tabs can still submit
          a tab's form via the HTML `form="id"` attribute regardless of which
          tab is currently visible. A faint tab-colored top border + tint on
          the active panel gives a subtle visual link back to its tab. */}
      {tabs.map((t) => (
        <div
          key={t.id}
          className={
            active === t.id
              ? `mt-4 space-y-6 rounded-b-md ${TAB_COLOR_CLASSES[t.color ?? "fuchsia"].panel} p-3`
              : "hidden"
          }
        >
          {t.content}
        </div>
      ))}
    </div>
  );
}
