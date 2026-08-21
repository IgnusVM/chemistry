"use client";

import { useActionState, useMemo, useState } from "react";
import { createAssetBatch } from "./actions";
import type { CustomFieldDef } from "@/lib/custom-fields";
import type { Department, Location } from "@/generated/prisma/client";
import { Button } from "@/components/button";
import { LocationField } from "@/components/location-field";
import { ASSET_CONDITIONS, ASSET_STATUSES } from "@/lib/constants";

const inputClass = "w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm";

type AssetTypeOption = {
  id: string;
  name: string;
  defaultDepartmentId: string | null;
  defaultAcquisitionCost: string | null;
  fields: CustomFieldDef[];
};

export function BulkAssetForm({
  assetTypes,
  departments,
  locations,
}: {
  assetTypes: AssetTypeOption[];
  departments: Department[];
  locations: Location[];
}) {
  const [state, action, pending] = useActionState(createAssetBatch, undefined);
  const [assetTypeId, setAssetTypeId] = useState(assetTypes[0]?.id ?? "");
  const [tagMode, setTagMode] = useState<"range" | "list">("range");
  const [prefix, setPrefix] = useState("LL-");
  const [start, setStart] = useState(1);
  const [count, setCount] = useState(10);
  const [pad, setPad] = useState(4);
  const [tagList, setTagList] = useState("");

  const selectedType = useMemo(
    () => assetTypes.find((t) => t.id === assetTypeId),
    [assetTypes, assetTypeId],
  );

  const preview = useMemo(() => {
    if (tagMode === "range") {
      if (count < 1) return [];
      const first = `${prefix}${String(start).padStart(pad, "0")}`;
      const last = `${prefix}${String(start + count - 1).padStart(pad, "0")}`;
      return count === 1 ? [first] : [first, last];
    }
    const parsed = tagList
      .split(/[\n,]/)
      .map((t) => t.trim())
      .filter(Boolean);
    return [...new Set(parsed)];
  }, [tagMode, prefix, start, count, pad, tagList]);

  const previewCount = tagMode === "range" ? Math.max(count, 0) : preview.length;

  return (
    <form action={action} className="space-y-4 rounded-md border border-neutral-200 bg-white p-4">
      <div>
        <label className="block text-xs font-medium text-neutral-600">Asset tags</label>
        <div className="mt-1 flex gap-4 text-sm">
          <label className="flex items-center gap-1.5">
            <input
              type="radio"
              name="tagMode"
              value="range"
              checked={tagMode === "range"}
              onChange={() => setTagMode("range")}
            />
            Sequential range
          </label>
          <label className="flex items-center gap-1.5">
            <input
              type="radio"
              name="tagMode"
              value="list"
              checked={tagMode === "list"}
              onChange={() => setTagMode("list")}
            />
            Paste a list
          </label>
        </div>

        {tagMode === "range" ? (
          <div className="mt-2 grid grid-cols-4 gap-2">
            <Field label="Prefix">
              <input name="prefix" value={prefix} onChange={(e) => setPrefix(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Start #">
              <input
                name="start"
                type="number"
                min={0}
                value={start}
                onChange={(e) => setStart(Number(e.target.value))}
                className={inputClass}
              />
            </Field>
            <Field label="Count">
              <input
                name="count"
                type="number"
                min={1}
                max={500}
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className={inputClass}
              />
            </Field>
            <Field label="Zero-pad digits">
              <input
                name="pad"
                type="number"
                min={0}
                max={8}
                value={pad}
                onChange={(e) => setPad(Number(e.target.value))}
                className={inputClass}
              />
            </Field>
          </div>
        ) : (
          <textarea
            name="tagList"
            value={tagList}
            onChange={(e) => setTagList(e.target.value)}
            rows={6}
            placeholder={"LL-0001\nLL-0002\nLL-0003"}
            className={`${inputClass} mt-2 font-mono`}
          />
        )}

        <p className="mt-1 text-xs text-neutral-500">
          {previewCount} asset{previewCount === 1 ? "" : "s"}
          {tagMode === "range" && preview.length > 0 && (
            <>
              : {preview[0]}
              {preview.length > 1 && ` … ${preview[1]}`}
            </>
          )}
        </p>
      </div>

      <Field label="Name template">
        <input name="nameTemplate" required defaultValue="Solar Lamplighter Lantern" className={inputClass} />
        <p className="mt-1 text-xs text-neutral-400">Each asset is named &ldquo;{"{template} {tag}"}&rdquo;.</p>
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
            {ASSET_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace("_", " ")}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Condition">
          <select name="condition" defaultValue="NEW" className={inputClass}>
            {ASSET_CONDITIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Value ($) — same for every asset in this batch">
        <input
          name="acquisitionCost"
          type="number"
          min={0}
          step="0.01"
          key={selectedType?.defaultAcquisitionCost ?? "none"}
          defaultValue={selectedType?.defaultAcquisitionCost ?? ""}
          className={inputClass}
        />
      </Field>

      <LocationField name="currentLocationId" locations={locations} label="Location" />

      {selectedType && selectedType.fields.length > 0 && (
        <div className="space-y-3 rounded-md bg-neutral-50 p-3">
          <div className="text-xs font-medium text-neutral-600">
            {selectedType.name} fields — same value applied to every asset in this batch
          </div>
          {selectedType.fields.map((field) => (
            <Field key={field.key} label={field.label}>
              {field.type === "select" ? (
                <select name={`cf_${field.key}`} className={inputClass}>
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
                  type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
                  className={inputClass}
                />
              )}
            </Field>
          ))}
        </div>
      )}

      <div className="space-y-3 rounded-md bg-neutral-50 p-3">
        <div className="text-xs font-medium text-neutral-600">Batch group</div>
        <Field label="Group name">
          <input
            name="groupName"
            required
            defaultValue={`Lamplighter batch ${new Date().toISOString().slice(0, 10)}`}
            className={inputClass}
          />
        </Field>
        <Field label="Group description">
          <input name="groupDescription" className={inputClass} />
        </Field>
      </div>

      <Button type="submit" pending={pending} pendingText="Creating…">
        Create {previewCount} asset{previewCount === 1 ? "" : "s"}
      </Button>
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
