"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

interface SelectionContextValue {
  pageIds: string[];
  totalMatching: number;
  selected: Set<string>;
  selectAllMatching: boolean;
  selectedCount: number;
  isSelected: (id: string) => boolean;
  recordShiftKey: (pressed: boolean) => void;
  handleCheckboxChange: (id: string, nextChecked: boolean) => void;
  allOnPageSelected: boolean;
  someOnPageSelected: boolean;
  selectAllOnPage: () => void;
  clearSelection: () => void;
  enableSelectAllMatching: () => void;
}

const SelectionContext = createContext<SelectionContextValue | null>(null);

export function useSelection() {
  const ctx = useContext(SelectionContext);
  if (!ctx) throw new Error("useSelection must be used within a SelectionProvider");
  return ctx;
}

export function SelectionProvider({
  pageIds,
  totalMatching,
  children,
}: {
  pageIds: string[];
  totalMatching: number;
  children: ReactNode;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectAllMatching, setSelectAllMatching] = useState(false);
  const lastClickedRef = useRef<string | null>(null);
  // Captured from the checkbox's preceding "click" event (which fires before
  // "change") without calling preventDefault — letting the browser's native
  // toggle happen normally avoids racing its own activation-behavior against
  // React's re-render, which is what made checkboxes intermittently fail to
  // visually reflect the just-clicked state under the old preventDefault-based
  // approach.
  const shiftKeyRef = useRef(false);

  const isSelected = useCallback(
    (id: string) => selectAllMatching || selected.has(id),
    [selected, selectAllMatching],
  );

  const recordShiftKey = useCallback((pressed: boolean) => {
    shiftKeyRef.current = pressed;
  }, []);

  const handleCheckboxChange = useCallback(
    (id: string, nextChecked: boolean) => {
      const shiftKey = shiftKeyRef.current;

      if (selectAllMatching) {
        // Coming out of "select all matching" mode: start a fresh explicit
        // selection from just this row, applying the click's intent.
        setSelectAllMatching(false);
        setSelected(nextChecked ? new Set([id]) : new Set());
        lastClickedRef.current = id;
        return;
      }

      if (shiftKey && lastClickedRef.current) {
        const lastIndex = pageIds.indexOf(lastClickedRef.current);
        const thisIndex = pageIds.indexOf(id);
        if (lastIndex !== -1 && thisIndex !== -1) {
          const [start, end] = lastIndex < thisIndex ? [lastIndex, thisIndex] : [thisIndex, lastIndex];
          setSelected((prev) => {
            const next = new Set(prev);
            for (let i = start; i <= end; i++) {
              if (nextChecked) next.add(pageIds[i]);
              else next.delete(pageIds[i]);
            }
            return next;
          });
          lastClickedRef.current = id;
          return;
        }
      }

      setSelected((prev) => {
        const next = new Set(prev);
        if (nextChecked) next.add(id);
        else next.delete(id);
        return next;
      });
      lastClickedRef.current = id;
    },
    [pageIds, selectAllMatching],
  );

  const selectAllOnPage = useCallback(() => {
    setSelectAllMatching(false);
    setSelected(new Set(pageIds));
  }, [pageIds]);

  const clearSelection = useCallback(() => {
    setSelectAllMatching(false);
    setSelected(new Set());
  }, []);

  const enableSelectAllMatching = useCallback(() => {
    setSelectAllMatching(true);
  }, []);

  const allOnPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const someOnPageSelected = pageIds.some((id) => selected.has(id));
  const selectedCount = selectAllMatching ? totalMatching : selected.size;

  const value = useMemo(
    () => ({
      pageIds,
      totalMatching,
      selected,
      selectAllMatching,
      selectedCount,
      isSelected,
      recordShiftKey,
      handleCheckboxChange,
      allOnPageSelected,
      someOnPageSelected,
      selectAllOnPage,
      clearSelection,
      enableSelectAllMatching,
    }),
    [
      pageIds,
      totalMatching,
      selected,
      selectAllMatching,
      selectedCount,
      isSelected,
      recordShiftKey,
      handleCheckboxChange,
      allOnPageSelected,
      someOnPageSelected,
      selectAllOnPage,
      clearSelection,
      enableSelectAllMatching,
    ],
  );

  return <SelectionContext.Provider value={value}>{children}</SelectionContext.Provider>;
}
