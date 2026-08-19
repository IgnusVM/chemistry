"use client";

import { useActionState, useState } from "react";
import { createAssetType } from "./actions";
import { CUSTOM_FIELD_TYPES, type CustomFieldType } from "@/lib/custom-fields";

type FieldRow = {
  key: string;
  label: string;
  type: CustomFieldType;
  required: boolean;
  options: string;
};

const emptyRow: FieldRow = { key: "", label: "", type: "string", required: false, options: "" };

export function AssetTypeForm({
  departments,
}: {
  departments: { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState(createAssetType, undefined);
  const [rows, setRows] = useState<FieldRow[]>([]);

  const customFieldSchema = JSON.stringify(
    rows
      .filter((r) => r.key && r.label)
      .map((r) => ({
        key: r.key,
        label: r.label,
        type: r.type,
        required: r.required,
        options:
          r.type === "select"
            ? r.options.split(",").map((o) => o.trim()).filter(Boolean)
            : undefined,
      })),
  );

  return (
    <form action={action} className="space-y-4 rounded-md border border-neutral-200 bg-white p-4">
      <input type="hidden" name="customFieldSchema" value={customFieldSchema} />

      <div className="flex flex-wrap gap-3">
        <div>
          <label className="block text-xs font-medium text-neutral-600">Name</label>
          <input name="name" required className="mt-1 rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-600">Manufacturer</label>
          <input name="manufacturer" className="mt-1 rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-600">Model</label>
          <input name="model" className="mt-1 rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-600">Default department</label>
          <select name="defaultDepartmentId" className="mt-1 rounded-md border border-neutral-300 px-2 py-1.5 text-sm">
            <option value="">—</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label className="block text-xs font-medium text-neutral-600">Custom fields</label>
          <button
            type="button"
            onClick={() => setRows((r) => [...r, { ...emptyRow }])}
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
                onChange={(e) =>
                  setRows((rs) => rs.map((r, j) => (j === i ? { ...r, key: e.target.value } : r)))
                }
                className="rounded-md border border-neutral-300 px-2 py-1 text-xs"
              />
              <input
                placeholder="Label"
                value={row.label}
                onChange={(e) =>
                  setRows((rs) => rs.map((r, j) => (j === i ? { ...r, label: e.target.value } : r)))
                }
                className="rounded-md border border-neutral-300 px-2 py-1 text-xs"
              />
              <select
                value={row.type}
                onChange={(e) =>
                  setRows((rs) =>
                    rs.map((r, j) => (j === i ? { ...r, type: e.target.value as CustomFieldType } : r)),
                  )
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
                  onChange={(e) =>
                    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, options: e.target.value } : r)))
                  }
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

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
      >
        {pending ? "Creating…" : "Create asset type"}
      </button>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
