"use client";

import { useState, useTransition } from "react";
import { updateDivision, type DivisionFormState } from "./actions";
import { Button } from "@/components/button";

const inputClass = "rounded-md border border-neutral-300 px-2 py-1 text-sm";

export function DivisionRow({
  division,
}: {
  division: { id: string; name: string; slug: string; description: string | null; departmentCount: number };
}) {
  const [editing, setEditing] = useState(false);
  const [state, setState] = useState<DivisionFormState>(undefined);
  const [pending, startTransition] = useTransition();

  if (editing) {
    return (
      <tr>
        <td colSpan={3} className="px-4 py-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              startTransition(async () => {
                const result = await updateDivision(undefined, formData);
                setState(result);
                if (!result || !("error" in result)) setEditing(false);
              });
            }}
            className="flex flex-wrap items-end gap-3"
          >
            <input type="hidden" name="id" value={division.id} />
            <div>
              <label className="block text-xs font-medium text-neutral-600">Name</label>
              <input name="name" required defaultValue={division.name} className={`mt-1 ${inputClass}`} />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-600">Slug</label>
              <input name="slug" required defaultValue={division.slug} className={`mt-1 ${inputClass}`} />
            </div>
            <div className="min-w-[12rem] flex-1">
              <label className="block text-xs font-medium text-neutral-600">Description</label>
              <input name="description" defaultValue={division.description ?? ""} className={`mt-1 w-full ${inputClass}`} />
            </div>
            <Button type="submit" variant="secondary" pending={pending} pendingText="Saving…">
              Save
            </Button>
            <button type="button" onClick={() => setEditing(false)} className="text-xs text-neutral-500 hover:text-neutral-700">
              Cancel
            </button>
            {state?.error && <p className="w-full text-xs text-red-600">{state.error}</p>}
          </form>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td className="px-4 py-2 font-medium text-neutral-900">{division.name}</td>
      <td className="px-4 py-2 text-neutral-500">{division.slug}</td>
      <td className="px-4 py-2">{division.departmentCount}</td>
      <td className="px-4 py-2 text-right">
        <button type="button" onClick={() => setEditing(true)} className="text-xs text-neutral-400 hover:text-neutral-700">
          Edit
        </button>
      </td>
    </tr>
  );
}
