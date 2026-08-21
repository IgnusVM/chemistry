"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { Tabs } from "@/components/tabs";

const TabContext = createContext<{ active: string; setActive: (id: string) => void } | null>(null);

export function WorkOrderTabsProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState("details");
  return <TabContext.Provider value={{ active, setActive }}>{children}</TabContext.Provider>;
}

/** A button anywhere inside WorkOrderTabsProvider (e.g. the action bar above
 * the tabs) that jumps to a given tab — for quick-access shortcuts like
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

export function WorkOrderTabs({
  detailsContent,
  historyContent,
  attachmentsContent,
}: {
  detailsContent: ReactNode;
  historyContent: ReactNode;
  attachmentsContent: ReactNode;
}) {
  const ctx = useContext(TabContext);
  return (
    <Tabs
      activeTab={ctx?.active}
      onTabChange={ctx?.setActive}
      tabs={[
        { id: "details", label: "Details", content: detailsContent },
        { id: "history", label: "History", content: historyContent },
        { id: "attachments", label: "Attachments", content: attachmentsContent },
      ]}
    />
  );
}
