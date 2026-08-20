"use client";

import { useActionState } from "react";
import { createDepartment } from "./actions";
import { Button } from "@/components/button";

export function DepartmentForm({ divisions }: { divisions: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState(createDepartment, undefined);

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
          placeholder="e.g. lamplighters"
          className="mt-1 rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-neutral-600">Division</label>
        <select name="divisionId" className="mt-1 rounded-md border border-neutral-300 px-2 py-1.5 text-sm">
          <option value="">—</option>
          {divisions.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex-1 min-w-[12rem]">
        <label className="block text-xs font-medium text-neutral-600">Description</label>
        <input
          name="description"
          className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
      </div>
      <Button type="submit" pending={pending} pendingText="Adding…">
        Add department
      </Button>
      {state?.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
