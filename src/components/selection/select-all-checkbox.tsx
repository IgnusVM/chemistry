"use client";

import { useEffect, useRef } from "react";
import { useSelection } from "./selection-context";

export function SelectAllHeaderCheckbox() {
  const { pageIds, allOnPageSelected, someOnPageSelected, selectAllMatching, selectAllOnPage, clearSelection } =
    useSelection();
  const ref = useRef<HTMLInputElement>(null);
  const checked = selectAllMatching || allOnPageSelected;

  useEffect(() => {
    if (ref.current) {
      ref.current.indeterminate = !checked && someOnPageSelected;
    }
  }, [checked, someOnPageSelected]);

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      disabled={pageIds.length === 0}
      onChange={() => {
        if (checked) clearSelection();
        else selectAllOnPage();
      }}
      aria-label="Select all on this page"
    />
  );
}
