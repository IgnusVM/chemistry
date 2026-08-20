"use client";

import { useActionState, useRef } from "react";
import { createPart } from "../actions";
import { Button } from "@/components/button";

const inputClass = "rounded-md border border-neutral-300 px-2 py-1.5 text-sm";

export function AddPartForm({ assetTypeId }: { assetTypeId: string }) {
  const [state, action, pending] = useActionState(createPart, undefined);
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
      <input type="hidden" name="assetTypeId" value={assetTypeId} />
      <div>
        <label className="block text-xs font-medium text-neutral-600">Part number</label>
        <input name="partNumber" required placeholder="e.g. PN-4471" className={`${inputClass} mt-1`} />
      </div>
      <div className="flex-1 min-w-[12rem]">
        <label className="block text-xs font-medium text-neutral-600">Description</label>
        <input name="description" required className={`${inputClass} mt-1 w-full`} />
      </div>
      <Button type="submit" variant="secondary" pending={pending} pendingText="Adding…">
        + Add part
      </Button>
      {state?.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
