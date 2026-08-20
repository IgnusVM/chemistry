"use client";

import { useRef, useState, useTransition } from "react";
import type { ResolutionCode } from "@/generated/prisma/client";
import { bulkCloseWorkOrders, type BulkCloseState } from "./actions";
import { Button } from "@/components/button";
import { ConfirmModal } from "@/components/confirm-modal";

const inputClass = "rounded-md border border-neutral-300 px-2 py-1.5 text-sm";
const labelClass = "block text-xs font-medium text-neutral-600";

export function BulkCloseForm({ ids, resolutionCodes }: { ids: string[]; resolutionCodes: ResolutionCode[] }) {
  const [state, setState] = useState<BulkCloseState>(undefined);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const submit = (confirmed: boolean) => {
    if (!formRef.current) return;
    const formData = new FormData(formRef.current);
    formData.set("confirmed", confirmed ? "1" : "");
    startTransition(async () => {
      const result = await bulkCloseWorkOrders(undefined, formData);
      setState(result);
    });
  };

  return (
    <>
      <form
        ref={formRef}
        onSubmit={(e) => {
          e.preventDefault();
          submit(false);
        }}
        className="space-y-4 rounded-md border border-neutral-200 bg-white p-4"
      >
        {ids.map((id) => (
          <input key={id} type="hidden" name="ids" value={id} />
        ))}

        <div>
          <label className={labelClass}>Resolution code</label>
          <select name="resolutionCodeId" defaultValue="" className={`${inputClass} mt-1 w-full`}>
            <option value="">Resolution code…</option>
            {resolutionCodes.map((rc) => (
              <option key={rc.id} value={rc.id}>
                {rc.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass}>Resolution notes</label>
          <textarea
            name="resolutionNotes"
            rows={3}
            placeholder="What was done to resolve these…"
            className={`${inputClass} mt-1 w-full`}
          />
        </div>

        <div>
          <label className={labelClass}>Labor minutes (applied to each)</label>
          <input name="laborMinutes" type="number" min={0} className={`${inputClass} mt-1 w-32`} />
        </div>

        <div className="space-y-2 border-t border-neutral-100 pt-4">
          <p className="text-xs font-medium tracking-wide text-neutral-400 uppercase">
            Also log a part used (optional)
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-36">
              <label className={labelClass}>Part number</label>
              <input name="partNumber" className={`${inputClass} mt-1 w-full`} />
            </div>
            <div className="min-w-[14rem] flex-1">
              <label className={labelClass}>Description (if new part)</label>
              <input name="partDescription" className={`${inputClass} mt-1 w-full`} />
            </div>
            <div className="w-16">
              <label className={labelClass}>Qty</label>
              <input name="partQuantity" type="number" min={1} defaultValue={1} className={`${inputClass} mt-1 w-full`} />
            </div>
          </div>
          <p className="text-xs text-neutral-400">
            Applied to every selected work order, tied to each one&rsquo;s own asset type.
          </p>
        </div>

        <Button type="submit" pending={pending} pendingText="Closing…">
          Close {ids.length} work order{ids.length === 1 ? "" : "s"}
        </Button>
        {state && "error" in state && <p className="text-sm text-red-600">{state.error}</p>}
      </form>

      {state && "confirmRequired" in state && (
        <ConfirmModal
          title="Confirm bulk part logging"
          confirmLabel={`Close ${ids.length} work order${ids.length === 1 ? "" : "s"}`}
          onConfirm={() => submit(true)}
          onCancel={() => setState(undefined)}
          pending={pending}
        >
          <p>
            This part will be logged as used on all {state.summary.workOrderCount} selected work orders, spanning{" "}
            {state.summary.assetTypeCount} asset type{state.summary.assetTypeCount === 1 ? "" : "s"}.
          </p>
          {state.summary.newPartAssetTypeNames.length > 0 && (
            <p className="mt-2">
              A new Part record will be created under: <strong>{state.summary.newPartAssetTypeNames.join(", ")}</strong>.
            </p>
          )}
        </ConfirmModal>
      )}
    </>
  );
}
