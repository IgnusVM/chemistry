"use client";

import { useActionState, useState } from "react";
import { updateAssetType } from "../actions";
import { FieldBuilder, fieldRowsToSchema, type FieldRow } from "../field-builder";
import type { CustomFieldDef } from "@/lib/custom-fields";
import { Button } from "@/components/button";

export function EditAssetTypeForm({
  assetType,
  departments,
}: {
  assetType: {
    id: string;
    name: string;
    manufacturer: string | null;
    model: string | null;
    defaultDepartmentId: string | null;
    defaultAcquisitionCost: string | null;
    customFieldSchema: CustomFieldDef[];
  };
  departments: { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState(updateAssetType, undefined);
  const [rows, setRows] = useState<FieldRow[]>(
    assetType.customFieldSchema.map((f) => ({
      key: f.key,
      label: f.label,
      type: f.type,
      required: f.required ?? false,
      options: f.options?.join(", ") ?? "",
    })),
  );

  return (
    <form action={action} className="space-y-4 rounded-md border border-neutral-200 bg-white p-4">
      <input type="hidden" name="id" value={assetType.id} />
      <input type="hidden" name="customFieldSchema" value={fieldRowsToSchema(rows)} />

      <div className="flex flex-wrap gap-3">
        <div>
          <label className="block text-xs font-medium text-neutral-600">Name</label>
          <input
            name="name"
            required
            defaultValue={assetType.name}
            className="mt-1 rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-600">Manufacturer</label>
          <input
            name="manufacturer"
            defaultValue={assetType.manufacturer ?? ""}
            className="mt-1 rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-600">Model</label>
          <input
            name="model"
            defaultValue={assetType.model ?? ""}
            className="mt-1 rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-600">Default department</label>
          <select
            name="defaultDepartmentId"
            defaultValue={assetType.defaultDepartmentId ?? ""}
            className="mt-1 rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
          >
            <option value="">—</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-600">Default value ($)</label>
          <input
            name="defaultAcquisitionCost"
            type="number"
            min={0}
            step="0.01"
            defaultValue={assetType.defaultAcquisitionCost ?? ""}
            placeholder="e.g. 150.00"
            className="mt-1 rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
          />
        </div>
      </div>
      <p className="text-xs text-neutral-400">
        Pre-fills each new asset&rsquo;s value at creation — editable per-asset afterward.
      </p>

      <FieldBuilder rows={rows} setRows={setRows} />

      <Button type="submit" pending={pending} pendingText="Saving…">
        Save changes
      </Button>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
