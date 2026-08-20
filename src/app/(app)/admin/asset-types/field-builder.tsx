"use client";

import { CUSTOM_FIELD_TYPES, type CustomFieldType } from "@/lib/custom-fields";

export type FieldRow = {
  key: string;
  label: string;
  type: CustomFieldType;
  required: boolean;
  options: string;
};

export const emptyFieldRow: FieldRow = { key: "", label: "", type: "string", required: false, options: "" };

export function fieldRowsToSchema(rows: FieldRow[]) {
  return JSON.stringify(
    rows
      .filter((r) => r.key && r.label)
      .map((r) => ({
        key: r.key,
        label: r.label,
        type: r.type,
        required: r.required,
        options:
          r.type === "select" ? r.options.split(",").map((o) => o.trim()).filter(Boolean) : undefined,
      })),
  );
}

export function FieldBuilder({
  rows,
  setRows,
}: {
  rows: FieldRow[];
  setRows: React.Dispatch<React.SetStateAction<FieldRow[]>>;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="block text-xs font-medium text-neutral-600">Custom fields</label>
        <button
          type="button"
          onClick={() => setRows((r) => [...r, { ...emptyFieldRow }])}
          className="text-xs font-medium text-neutral-700 hover:text-neutral-900"
        >
          + Add field
        </button>
      </div>
      <div className="mt-2 space-y-2">
        {rows.map((row, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2 rounded-md bg-neutral-50 p-2">
            <input
              placeholder="key (panelLot)"
              value={row.key}
              onChange={(e) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, key: e.target.value } : r)))}
              className="rounded-md border border-neutral-300 px-2 py-1 text-xs"
            />
            <input
              placeholder="Label"
              value={row.label}
              onChange={(e) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, label: e.target.value } : r)))}
              className="rounded-md border border-neutral-300 px-2 py-1 text-xs"
            />
            <select
              value={row.type}
              onChange={(e) =>
                setRows((rs) => rs.map((r, j) => (j === i ? { ...r, type: e.target.value as CustomFieldType } : r)))
              }
              className="rounded-md border border-neutral-300 px-2 py-1 text-xs"
            >
              {CUSTOM_FIELD_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            {row.type === "select" && (
              <input
                placeholder="options, comma-separated"
                value={row.options}
                onChange={(e) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, options: e.target.value } : r)))}
                className="rounded-md border border-neutral-300 px-2 py-1 text-xs"
              />
            )}
            <label className="flex items-center gap-1 text-xs text-neutral-600">
              <input
                type="checkbox"
                checked={row.required}
                onChange={(e) =>
                  setRows((rs) => rs.map((r, j) => (j === i ? { ...r, required: e.target.checked } : r)))
                }
              />
              required
            </label>
            <button
              type="button"
              onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}
              className="text-xs text-neutral-400 hover:text-red-600"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
