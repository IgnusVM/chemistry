"use client";

import { useActionState, useState } from "react";
import { createAssetType } from "./actions";
import { FieldBuilder, fieldRowsToSchema, type FieldRow } from "./field-builder";
import { Button } from "@/components/button";

export function AssetTypeForm({
  departments,
}: {
  departments: { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState(createAssetType, undefined);
  const [rows, setRows] = useState<FieldRow[]>([]);

  return (
    <form action={action} className="space-y-4 rounded-md border border-neutral-200 bg-white p-4">
      <input type="hidden" name="customFieldSchema" value={fieldRowsToSchema(rows)} />

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

      <FieldBuilder rows={rows} setRows={setRows} />

      <Button type="submit" pending={pending} pendingText="Creating…">
        Create asset type
      </Button>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
