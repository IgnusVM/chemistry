"use client";

import { useSelection } from "./selection-context";

export function RowCheckbox({ id, label }: { id: string; label: string }) {
  const { isSelected, recordShiftKey, handleCheckboxChange } = useSelection();
  return (
    <input
      type="checkbox"
      checked={isSelected(id)}
      onClick={(e) => recordShiftKey(e.shiftKey)}
      onChange={(e) => handleCheckboxChange(id, e.target.checked)}
      aria-label={label}
    />
  );
}
