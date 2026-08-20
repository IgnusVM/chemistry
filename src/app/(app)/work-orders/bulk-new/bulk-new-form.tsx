"use client";

import { useActionState } from "react";
import { bulkCreateWorkOrders } from "./actions";
import { Button } from "@/components/button";
import { WO_TYPES, WO_PRIORITIES } from "@/lib/constants";
const inputClass = "rounded-md border border-neutral-300 px-2 py-1.5 text-sm";
const labelClass = "block text-xs font-medium text-neutral-600";

export function BulkNewForm({ assetIds }: { assetIds: string[] }) {
  const [state, action, pending] = useActionState(bulkCreateWorkOrders, undefined);

  return (
    <form action={action} className="space-y-4 rounded-md border border-neutral-200 bg-white p-4">
      {assetIds.map((id) => (
        <input key={id} type="hidden" name="assetIds" value={id} />
      ))}

      <div>
        <label className={labelClass}>Description</label>
        <textarea
          name="description"
          required
          rows={3}
          placeholder="Applied verbatim to every work order created…"
          className={`${inputClass} mt-1 w-full`}
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <div>
          <label className={labelClass}>Type</label>
          <select name="type" defaultValue="CORRECTIVE" className={`${inputClass} mt-1`}>
            {WO_TYPES.map((t) => (
              <option key={t} value={t}>
                {t.replace("_", " ")}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Priority</label>
          <select name="priority" defaultValue="NORMAL" className={`${inputClass} mt-1`}>
            {WO_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p.replace("_", " ")}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="text-xs text-neutral-400">
        Each work order&rsquo;s department is taken from its own asset — not chosen here.
      </p>

      <Button type="submit" pending={pending} pendingText="Creating…">
        Create {assetIds.length} work order{assetIds.length === 1 ? "" : "s"}
      </Button>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
