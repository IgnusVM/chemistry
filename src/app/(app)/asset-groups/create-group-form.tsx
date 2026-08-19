"use client";

import { useActionState } from "react";
import { createGroup } from "./actions";

export function CreateGroupForm() {
  const [state, action, pending] = useActionState(createGroup, undefined);

  return (
    <form action={action} className="flex flex-wrap items-end gap-3 rounded-md border border-neutral-200 bg-white p-4">
      <div>
        <label className="block text-xs font-medium text-neutral-600">Name</label>
        <input
          name="name"
          required
          className="mt-1 rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
      </div>
      <div className="flex-1 min-w-[12rem]">
        <label className="block text-xs font-medium text-neutral-600">Description</label>
        <input
          name="description"
          className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100 disabled:opacity-50"
      >
        {pending ? "Creating…" : "Create empty group"}
      </button>
      {state?.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
