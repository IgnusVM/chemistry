"use client";

import { useActionState } from "react";
import { createWorkOrder } from "../actions";
import type { Department, FailureCode, AssetType, Asset } from "@/generated/prisma/client";

const inputClass = "w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm";

type FailureCodeOption = FailureCode & { assetType: AssetType | null };

export function WorkOrderForm({
  departments,
  failureCodes,
  prefillAsset,
}: {
  departments: Department[];
  failureCodes: FailureCodeOption[];
  prefillAsset: (Asset & { owningDepartment: Department }) | null;
}) {
  const [state, action, pending] = useActionState(createWorkOrder, undefined);

  return (
    <form action={action} className="space-y-4 rounded-md border border-neutral-200 bg-white p-4">
      <Field label="Title">
        <input name="title" required autoFocus className={inputClass} />
      </Field>

      <Field label="Asset tag (optional)">
        <input
          name="assetTag"
          defaultValue={prefillAsset?.assetTag ?? ""}
          placeholder="LL-0042"
          className={inputClass}
        />
        {prefillAsset && (
          <p className="mt-1 text-xs text-neutral-400">{prefillAsset.name}</p>
        )}
      </Field>

      <Field label="Department">
        <select
          name="departmentId"
          required
          defaultValue={prefillAsset?.owningDepartmentId ?? ""}
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
        <Field label="Type">
          <select name="type" defaultValue="CORRECTIVE" className={inputClass}>
            {["CORRECTIVE", "PREVENTIVE", "INSPECTION", "MODIFICATION", "DECOMMISSION"].map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Priority">
          <select name="priority" defaultValue="NORMAL" className={inputClass}>
            {["LOW", "NORMAL", "HIGH", "EVENT_CRITICAL"].map((p) => (
              <option key={p} value={p}>
                {p.replace("_", " ")}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Failure code (optional)">
        <select name="failureCodeId" defaultValue="" className={inputClass}>
          <option value="">—</option>
          {failureCodes.map((fc) => (
            <option key={fc.id} value={fc.id}>
              {fc.label} {fc.assetType ? `(${fc.assetType.name})` : "(generic)"}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Description">
        <textarea name="description" rows={4} className={inputClass} />
      </Field>

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
      >
        {pending ? "Creating…" : "Create work order"}
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
