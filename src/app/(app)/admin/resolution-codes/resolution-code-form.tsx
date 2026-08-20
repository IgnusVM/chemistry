"use client";

import { useActionState } from "react";
import { createResolutionCode } from "./actions";

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
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
      >
        {pending ? "Adding…" : "Add resolution code"}
      </button>
      {state?.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
