"use client";

import { useState } from "react";
import { Download, X } from "lucide-react";
import { Button, buttonClass } from "@/components/button";

export type ExportColumnOption = { key: string; label: string };

/**
 * Column picker for a list export. The current filter arrives as `filterParams`
 * and is passed straight through to the export route, which re-runs it against
 * the same where-builder the list page used — so what you export is exactly what
 * you were looking at, not a second interpretation of the filter.
 */
export function ExportDialog({
  endpoint,
  storageKey,
  columns,
  defaultColumns,
  filterParams,
  total,
}: {
  endpoint: string;
  /** Remembers the last column choice per list, since people export the same shape repeatedly. */
  storageKey: string;
  columns: ExportColumnOption[];
  defaultColumns: string[];
  filterParams: Record<string, string | undefined>;
  total: number;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>(defaultColumns);
  const [format, setFormat] = useState<"xlsx" | "csv">("xlsx");

  /**
   * Restores the last column choice as part of opening, rather than from an
   * effect: localStorage isn't readable during SSR, and reacting to `open` in
   * an effect would be a cascading render for something an event handler can
   * just do directly.
   */
  function openDialog() {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed: string[] = JSON.parse(saved);
        // Drop anything no longer offered — e.g. custom fields belonging to a
        // different asset type than the one currently filtered.
        const valid = parsed.filter((k) => columns.some((c) => c.key === k));
        if (valid.length > 0) setSelected(valid);
      }
    } catch {
      // A corrupt or unavailable entry just falls back to the defaults.
    }
    setOpen(true);
  }

  function toggle(key: string) {
    setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }

  function href() {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(filterParams)) {
      if (v) qs.set(k, v);
    }
    // Emit in catalogue order so the sheet's columns are stable regardless of
    // the order the boxes happened to be ticked.
    const ordered = columns.filter((c) => selected.includes(c.key)).map((c) => c.key);
    qs.set("columns", ordered.join(","));
    qs.set("format", format);
    return `${endpoint}?${qs.toString()}`;
  }

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        className={buttonClass("secondary")}
      >
        <Download className="h-4 w-4" />
        Export
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="Dismiss export"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-neutral-900/40"
          />
          <div className="relative max-h-[85vh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-xl sm:max-w-lg sm:rounded-2xl">
            <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
              <div>
                <h2 className="text-sm font-semibold text-neutral-900">Export</h2>
                <p className="text-xs text-neutral-500">
                  {total} row{total === 1 ? "" : "s"} match the current filter
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close export"
                className="rounded-md p-1 text-neutral-400 hover:text-neutral-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium tracking-wide text-neutral-400 uppercase">
                  Columns
                </span>
                <div className="flex gap-3 text-xs">
                  <button
                    type="button"
                    onClick={() => setSelected(columns.map((c) => c.key))}
                    className="text-neutral-500 hover:text-neutral-800"
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelected(defaultColumns)}
                    className="text-neutral-500 hover:text-neutral-800"
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelected([])}
                    className="text-neutral-500 hover:text-neutral-800"
                  >
                    None
                  </button>
                </div>
              </div>

              <div className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
                {columns.map((c) => (
                  <label key={c.key} className="flex items-center gap-2 rounded px-1 py-1.5 text-sm text-neutral-800">
                    <input
                      type="checkbox"
                      checked={selected.includes(c.key)}
                      onChange={() => toggle(c.key)}
                    />
                    {c.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 px-4 py-3">
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-neutral-400">Format:</span>
                {(["xlsx", "csv"] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFormat(f)}
                    className={`rounded-full px-2.5 py-0.5 font-medium ${
                      format === f ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-600"
                    }`}
                  >
                    {f === "xlsx" ? "Excel" : "CSV"}
                  </button>
                ))}
              </div>

              {selected.length === 0 ? (
                <Button type="button" disabled>
                  Pick a column
                </Button>
              ) : (
                <a
                  href={href()}
                  onClick={() => {
                    try {
                      localStorage.setItem(storageKey, JSON.stringify(selected));
                    } catch {
                      // Private mode / full storage — the export still works.
                    }
                    setOpen(false);
                  }}
                  className={buttonClass()}
                >
                  <Download className="h-4 w-4" />
                  Export {selected.length} column{selected.length === 1 ? "" : "s"}
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
