"use client";

import { useActionState } from "react";
import { createDivision } from "./actions";
import { Button } from "@/components/button";

export function DivisionForm() {
  const [state, action, pending] = useActionState(createDivision, undefined);

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
      <div>
        <label className="block text-xs font-medium text-neutral-600">Slug</label>
        <input
          name="slug"
          required
          placeholder="e.g. ops"
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
      <Button type="submit" pending={pending} pendingText="Adding…">
        Add division
      </Button>
      {state?.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
