"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { Tabs, type TabColor } from "@/components/tabs";

const TabContext = createContext<{ active: string; setActive: (id: string) => void } | null>(null);

export function TabbedPageProvider({ children, defaultTab = "details" }: { children: ReactNode; defaultTab?: string }) {
  const [active, setActive] = useState(defaultTab);
  return <TabContext.Provider value={{ active, setActive }}>{children}</TabContext.Provider>;
}

/** A button anywhere inside TabbedPageProvider (e.g. an action bar above the
 * tabs) that jumps to a given tab — for quick-access shortcuts like
 * "+ Note" that don't live in the tab strip itself. If `scrollToId` is
 * given, also scrolls that element into view and focuses the first
 * text field inside it, once the tab switch has actually painted (tab
 * panels stay mounted but `hidden` while inactive, so scrolling has to
 * wait a frame or it targets an element with no layout box yet). */
export function JumpToTabButton({
  tabId,
  scrollToId,
  children,
}: {
  tabId: string;
  scrollToId?: string;
  children: ReactNode;
}) {
  const ctx = useContext(TabContext);
  return (
    <button
      type="button"
      onClick={() => {
        ctx?.setActive(tabId);
        if (!scrollToId) return;
        requestAnimationFrame(() => {
          const el = document.getElementById(scrollToId);
          if (!el) return;
          el.scrollIntoView({ behavior: "smooth", block: "center" });

          // The target field may belong to a dynamically-imported editor
          // (Tiptap, CodeMirror) that hasn't finished loading yet even
          // though the tab panel itself is already visible — poll briefly
          // rather than giving up after one frame.
          let attempts = 0;
          const tryFocus = () => {
            const field = el.querySelector<HTMLElement>('input:not([type="hidden"]), textarea, [contenteditable="true"]');
            if (field) {
              field.focus();
              return;
            }
            attempts += 1;
            if (attempts < 20) setTimeout(tryFocus, 100);
          };
          tryFocus();
        });
      }}
      className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 hover:border-fuchsia-300 hover:bg-fuchsia-50/60"
    >
      {children}
    </button>
  );
}

export function TabbedPageTabs({ tabs }: { tabs: { id: string; label: string; content: ReactNode; color?: TabColor }[] }) {
  const ctx = useContext(TabContext);
  return <Tabs activeTab={ctx?.active} onTabChange={ctx?.setActive} tabs={tabs} />;
}
