"use client";

import { useActionState, useRef } from "react";
import { addPartLink } from "../../../actions";
import { Button } from "@/components/button";

const inputClass = "rounded-md border border-neutral-300 px-2 py-1.5 text-sm";

export function AddPartLinkForm({ partId }: { partId: string }) {
  const [state, action, pending] = useActionState(addPartLink, undefined);
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
      <div className="flex-1 min-w-[12rem]">
        <label className="block text-xs font-medium text-neutral-600">Link</label>
        <input name="url" type="url" required placeholder="https://…" className={`${inputClass} mt-1 w-full`} />
      </div>
      <div>
        <label className="block text-xs font-medium text-neutral-600">Price ($)</label>
        <input name="price" type="number" min={0} step="0.01" className={`${inputClass} mt-1 w-28`} />
      </div>
      <Button type="submit" variant="secondary" pending={pending} pendingText="Adding…">
        + Add link
      </Button>
      {state?.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
