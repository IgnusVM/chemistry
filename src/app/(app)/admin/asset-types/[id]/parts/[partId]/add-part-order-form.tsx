"use client";

import { useActionState, useRef } from "react";
import { addPartOrder } from "../../../actions";
import { Button } from "@/components/button";

const inputClass = "rounded-md border border-neutral-300 px-2 py-1.5 text-sm";

export function AddPartOrderForm({ partId }: { partId: string }) {
  const [state, action, pending] = useActionState(addPartOrder, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        await action(formData);
        formRef.current?.reset();
      }}
      className="mt-3 flex flex-wrap items-end gap-2"
    >
      <input type="hidden" name="partId" value={partId} />
      <div>
        <label className="block text-xs font-medium text-neutral-600">Price ($)</label>
        <input name="price" type="number" min={0} step="0.01" className={`${inputClass} mt-1 w-28`} />
      </div>
      <div className="flex-1 min-w-[12rem]">
        <label className="block text-xs font-medium text-neutral-600">Purchase link</label>
        <input name="purchaseLink" type="url" placeholder="https://…" className={`${inputClass} mt-1 w-full`} />
      </div>
      <div>
        <label className="block text-xs font-medium text-neutral-600">Date</label>
        <input name="orderedAt" type="date" className={`${inputClass} mt-1`} />
      </div>
      <Button type="submit" variant="secondary" pending={pending} pendingText="Logging…">
        + Log order
      </Button>
      {state?.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
