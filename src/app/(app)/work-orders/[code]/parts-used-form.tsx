"use client";

import { useRef, useState, useTransition } from "react";
import { addWorkOrderPart, type WorkOrderPartFormState } from "../actions";
import { Button } from "@/components/button";

const inputClass = "rounded-md border border-neutral-300 px-2 py-1.5 text-sm";

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
      className="mt-3 space-y-2"
    >
      <input type="hidden" name="workOrderId" value={workOrderId} />
      <div className="flex flex-wrap items-end gap-2">
        <div>
          <label className="block text-xs font-medium text-neutral-600">Part number</label>
          <input name="partNumber" list="known-parts" required className={`${inputClass} mt-1`} />
          <datalist id="known-parts">
            {knownParts.map((p) => (
              <option key={p.partNumber} value={p.partNumber}>
                {p.description}
              </option>
            ))}
          </datalist>
        </div>
        <div className="flex-1 min-w-[10rem]">
          <label className="block text-xs font-medium text-neutral-600">Description (if new part)</label>
          <input name="description" className={`${inputClass} mt-1 w-full`} />
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-600">Qty</label>
          <input name="quantity" type="number" min={1} defaultValue={1} className={`${inputClass} mt-1 w-16`} />
        </div>
      </div>

      <button
        type="button"
        onClick={() => setShowOrderFields((v) => !v)}
        className="text-xs font-medium text-neutral-500 transition-colors duration-150 hover:text-fuchsia-700"
      >
        {showOrderFields ? "− Hide" : "+ Also log an order for this part"}
      </button>

      {showOrderFields && (
        <div className="flex flex-wrap items-end gap-2 rounded-md bg-neutral-50 p-2">
          <div>
            <label className="block text-xs font-medium text-neutral-600">Price ($)</label>
            <input name="price" type="number" min={0} step="0.01" className={`${inputClass} mt-1 w-28`} />
          </div>
          <div className="flex-1 min-w-[10rem]">
            <label className="block text-xs font-medium text-neutral-600">Purchase link</label>
            <input name="purchaseLink" type="url" placeholder="https://…" className={`${inputClass} mt-1 w-full`} />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600">Date</label>
            <input name="orderedAt" type="date" className={`${inputClass} mt-1`} />
          </div>
        </div>
      )}

      <Button type="submit" variant="secondary" pending={pending} pendingText="Logging…">
        + Log part used
      </Button>
      {state && "error" in state && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
