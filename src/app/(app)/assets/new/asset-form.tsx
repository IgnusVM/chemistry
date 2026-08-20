"use client";

import { useActionState, useMemo, useState } from "react";
import { createAsset } from "../actions";
import type { CustomFieldDef } from "@/lib/custom-fields";
import type { Department, Location } from "@/generated/prisma/client";
import { LocationField } from "@/components/location-field";

const inputClass = "w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm";

type AssetTypeOption = {
  id: string;
  name: string;
  defaultDepartmentId: string | null;
  fields: CustomFieldDef[];
};

export function AssetForm({
  assetTypes,
  departments,
  locations,
}: {
  assetTypes: AssetTypeOption[];
  departments: Department[];
  locations: Location[];
}) {
  const [state, action, pending] = useActionState(createAsset, undefined);
  const [assetTypeId, setAssetTypeId] = useState(assetTypes[0]?.id ?? "");

  const selectedType = useMemo(
    () => assetTypes.find((t) => t.id === assetTypeId),
    [assetTypes, assetTypeId],
  );

  return (
    <form action={action} className="space-y-4 rounded-md border border-neutral-200 bg-white p-4">
      <Field label="Asset tag">
        <input name="assetTag" required placeholder="LL-0042" className={inputClass} />
      </Field>
      <Field label="Name">
        <input name="name" required className={inputClass} />
      </Field>
      <Field label="Description">
        <input name="description" className={inputClass} />
      </Field>

      <Field label="Asset type">
        <select
          name="assetTypeId"
          required
          value={assetTypeId}
          onChange={(e) => setAssetTypeId(e.target.value)}
          className={inputClass}
        >
          {assetTypes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Owning department">
        <select
          name="owningDepartmentId"
          required
          defaultValue={selectedType?.defaultDepartmentId ?? ""}
          key={selectedType?.defaultDepartmentId ?? "none"}
          className={inputClass}
        >
          <option value="">Select…</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Status">
          <select name="status" defaultValue="ACTIVE" className={inputClass}>
            {["ACTIVE", "IN_REPAIR", "STORAGE", "RETIRED", "LOST", "DESTROYED"].map((s) => (
              <option key={s} value={s}>
                {s.replace("_", " ")}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Condition">
          <select name="condition" defaultValue="GOOD" className={inputClass}>
            {["NEW", "GOOD", "FAIR", "POOR", "UNSERVICEABLE"].map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <LocationField name="currentLocationId" locations={locations} label="Location" />

      {selectedType && selectedType.fields.length > 0 && (
        <div className="space-y-3 rounded-md bg-neutral-50 p-3">
          <div className="text-xs font-medium text-neutral-600">{selectedType.name} fields</div>
          {selectedType.fields.map((field) => (
            <Field key={field.key} label={field.label + (field.required ? " *" : "")}>
              {field.type === "select" ? (
                <select name={`cf_${field.key}`} required={field.required} className={inputClass}>
                  <option value="">—</option>
                  {field.options?.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ) : field.type === "boolean" ? (
                <input type="checkbox" name={`cf_${field.key}`} value="true" />
              ) : (
                <input
                  name={`cf_${field.key}`}
                  required={field.required}
                  type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
                  className={inputClass}
                />
              )}
            </Field>
          ))}
        </div>
      )}

      <Field label="Notes">
        <textarea name="notes" rows={3} className={inputClass} />
      </Field>

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
      >
        {pending ? "Creating…" : "Create asset"}
      </button>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-neutral-600">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
