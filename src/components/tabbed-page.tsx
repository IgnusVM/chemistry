"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { Tabs } from "@/components/tabs";

const TabContext = createContext<{ active: string; setActive: (id: string) => void } | null>(null);

export function TabbedPageProvider({ children, defaultTab = "details" }: { children: ReactNode; defaultTab?: string }) {
  const [active, setActive] = useState(defaultTab);
  return <TabContext.Provider value={{ active, setActive }}>{children}</TabContext.Provider>;
}

/** A button anywhere inside TabbedPageProvider (e.g. an action bar above the
 * tabs) that jumps to a given tab — for quick-access shortcuts like
 * "+ Note" that don't live in the tab strip itself. */
export function JumpToTabButton({ tabId, children }: { tabId: string; children: ReactNode }) {
  const ctx = useContext(TabContext);
  return (
    <button
      type="button"
      onClick={() => ctx?.setActive(tabId)}
      className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 hover:border-fuchsia-300 hover:bg-fuchsia-50/60"
    >
      {children}
    </button>
  );
}

export function TabbedPageTabs({ tabs }: { tabs: { id: string; label: string; content: ReactNode }[] }) {
  const ctx = useContext(TabContext);
  return <Tabs activeTab={ctx?.active} onTabChange={ctx?.setActive} tabs={tabs} />;
}
