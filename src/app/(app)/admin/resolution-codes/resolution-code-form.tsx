"use client";

import { useActionState } from "react";
import { createResolutionCode } from "./actions";
import { Button } from "@/components/button";

export function ResolutionCodeForm() {
  const [state, action, pending] = useActionState(createResolutionCode, undefined);

  return (
    <form action={action} className="flex flex-wrap items-end gap-3 rounded-md border border-neutral-200 bg-white p-4">
      <div>
        <label className="block text-xs font-medium text-neutral-600">Code</label>
        <input
          name="code"
          required
          placeholder="GENERAL_REPAIR"
          className="mt-1 rounded-md border border-neutral-300 px-2 py-1.5 text-sm font-mono uppercase"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-neutral-600">Label</label>
        <input
          name="label"
          required
          placeholder="General Repair"
          className="mt-1 rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
      </div>
      <Button type="submit" pending={pending} pendingText="Adding…">
        Add resolution code
      </Button>
      {state?.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
