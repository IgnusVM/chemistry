"use client";

import { useState, type ReactNode } from "react";

export function Tabs({
  tabs,
  defaultTab,
  activeTab,
  onTabChange,
}: {
  tabs: { id: string; label: string; content: ReactNode }[];
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
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActive(t.id)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors duration-150 ${
              active === t.id
                ? "border-fuchsia-600 text-fuchsia-700"
                : "border-transparent text-neutral-500 hover:text-neutral-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {/* Every panel stays mounted (just hidden) so in-progress form input isn't
          lost on tab switch, and so buttons outside the tabs can still submit
          a tab's form via the HTML `form="id"` attribute regardless of which
          tab is currently visible. */}
      {tabs.map((t) => (
        <div key={t.id} className={active === t.id ? "mt-4 space-y-6" : "hidden"}>
          {t.content}
        </div>
      ))}
    </div>
  );
}
