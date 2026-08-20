"use client";

import { enterBulkSelection } from "@/lib/bulk-selection-action";
import { MAX_BULK_ITEMS } from "@/lib/bulk-selection-constants";
import { useSelection } from "./selection-context";

export interface BulkAction {
  label: string;
  targetPath: string;
  variant?: "primary" | "secondary";
}

export function SelectionToolbar({
  entityType,
  filterParams,
  actions,
}: {
  entityType: string;
  filterParams: Record<string, string | undefined>;
  actions: BulkAction[];
}) {
  const { pageIds, totalMatching, selected, selectAllMatching, selectedCount, allOnPageSelected, clearSelection, enableSelectAllMatching } =
    useSelection();

  if (selectedCount === 0) return null;

  const canOfferSelectAllMatching =
    !selectAllMatching && allOnPageSelected && totalMatching > pageIds.length && totalMatching <= MAX_BULK_ITEMS;
  const tooManyToSelectAll =
    !selectAllMatching && allOnPageSelected && totalMatching > pageIds.length && totalMatching > MAX_BULK_ITEMS;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border border-fuchsia-200 bg-fuchsia-50 px-4 py-2.5 text-sm">
      <span className="font-medium text-fuchsia-900">{selectedCount} selected</span>

      {canOfferSelectAllMatching && (
        <button
          type="button"
          onClick={enableSelectAllMatching}
          className="text-fuchsia-700 underline decoration-dotted hover:text-fuchsia-900"
        >
          Select all {totalMatching} matching filter
        </button>
      )}
      {tooManyToSelectAll && (
        <span className="text-xs text-neutral-500">
          ({totalMatching} match your filter — narrow it to select more than what&rsquo;s on this page)
        </span>
      )}

      <button type="button" onClick={clearSelection} className="text-neutral-500 hover:text-neutral-800">
        Clear
      </button>

      <div className="ml-auto flex items-center gap-2">
        {actions.map((action) => (
          <form key={action.targetPath} action={enterBulkSelection}>
            <input type="hidden" name="entityType" value={entityType} />
            <input type="hidden" name="targetPath" value={action.targetPath} />
            <input type="hidden" name="selectAllMatching" value={selectAllMatching ? "1" : ""} />
            {selectAllMatching
              ? Object.entries(filterParams).map(
                  ([key, value]) =>
                    value !== undefined && <input key={key} type="hidden" name={`filter_${key}`} value={value} />,
                )
              : Array.from(selected).map((id) => <input key={id} type="hidden" name="ids" value={id} />)}
            <button
              type="submit"
              className={
                action.variant === "secondary"
                  ? "rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 hover:border-fuchsia-300 hover:bg-fuchsia-50/60"
                  : "rounded-md bg-fuchsia-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-fuchsia-700"
              }
            >
              {action.label}
            </button>
          </form>
        ))}
      </div>
    </div>
  );
}
