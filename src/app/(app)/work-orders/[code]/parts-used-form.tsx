"use client";

import { useRef, useState, useTransition } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import { addWorkOrderPart, type WorkOrderPartFormState } from "../actions";
import { Button } from "@/components/button";

const inputClass = "rounded-md border border-neutral-300 px-2 py-1.5 text-sm";
const labelClass = "block text-xs font-medium text-neutral-600";

export function PartsUsedForm({
  workOrderId,
  knownParts,
}: {
  workOrderId: string;
  knownParts: { partNumber: string; description: string }[];
}) {
  const [state, setState] = useState<WorkOrderPartFormState>(undefined);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const [showOrderFields, setShowOrderFields] = useState(false);

  return (
    <form
      ref={formRef}
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        startTransition(async () => {
          const result = await addWorkOrderPart(undefined, formData);
          setState(result);
          if (result && "ok" in result) {
            formRef.current?.reset();
            setShowOrderFields(false);
          }
        });
      }}
      className="mt-4 space-y-3 border-t border-neutral-100 pt-4"
    >
      <input type="hidden" name="workOrderId" value={workOrderId} />
      <p className="text-xs font-medium tracking-wide text-neutral-400 uppercase">Log a part used</p>

      <div className="flex flex-wrap items-end gap-3">
        <div className="w-36">
          <label className={labelClass}>Part number</label>
          <input name="partNumber" list="known-parts" required className={`${inputClass} mt-1 w-full`} />
          <datalist id="known-parts">
            {knownParts.map((p) => (
              <option key={p.partNumber} value={p.partNumber}>
                {p.description}
              </option>
            ))}
          </datalist>
        </div>
        <div className="min-w-[14rem] flex-1">
          <label className={labelClass}>Description (if new part)</label>
          <input name="description" className={`${inputClass} mt-1 w-full`} />
        </div>
        <div className="w-16">
          <label className={labelClass}>Qty</label>
          <input name="quantity" type="number" min={1} defaultValue={1} className={`${inputClass} mt-1 w-full`} />
        </div>
      </div>

      <div>
        <button
          type="button"
          onClick={() => setShowOrderFields((v) => !v)}
          className="inline-flex items-center gap-1 text-xs font-medium text-neutral-500 transition-colors duration-150 hover:text-fuchsia-700"
        >
          {showOrderFields ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          Also log an order for this part
        </button>
      </div>

      {showOrderFields && (
        <div className="flex flex-wrap items-end gap-3 rounded-md bg-neutral-50 p-3">
          <div className="w-28">
            <label className={labelClass}>Price ($)</label>
            <input name="price" type="number" min={0} step="0.01" className={`${inputClass} mt-1 w-full bg-white`} />
          </div>
          <div className="w-24">
            <label className={labelClass}>Qty ordered</label>
            <input name="orderQuantity" type="number" min={1} defaultValue={1} className={`${inputClass} mt-1 w-full bg-white`} />
          </div>
          <div className="w-36">
            <label className={labelClass}>Date</label>
            <input name="orderedAt" type="date" className={`${inputClass} mt-1 w-full bg-white`} />
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="secondary" pending={pending} pendingText="Logging…">
          + Log part used
        </Button>
        {state && "error" in state && (
          <p className="rounded-md bg-red-50 px-2 py-1 text-xs text-red-700">{state.error}</p>
        )}
      </div>
    </form>
  );
}
