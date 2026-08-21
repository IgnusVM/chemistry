"use client";

import { useState, useTransition } from "react";
import { updateGroup, type CreateGroupFormState } from "../actions";
import { Button } from "@/components/button";

export function EditGroupHeader({
  group,
  memberCount,
}: {
  group: { id: string; name: string; description: string | null };
  memberCount: number;
}) {
  const [editing, setEditing] = useState(false);
  const [state, setState] = useState<CreateGroupFormState>(undefined);
  const [pending, startTransition] = useTransition();

  if (editing) {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          startTransition(async () => {
            const result = await updateGroup(undefined, formData);
            setState(result);
            if (!result || !("error" in result)) setEditing(false);
          });
        }}
        className="flex flex-wrap items-end gap-3"
      >
        <input type="hidden" name="id" value={group.id} />
        <div>
          <label className="block text-xs font-medium text-neutral-600">Name</label>
          <input
            name="name"
            required
            defaultValue={group.name}
            className="mt-1 rounded-md border border-neutral-300 px-2 py-1.5 text-sm font-semibold"
          />
        </div>
        <div className="min-w-[16rem] flex-1">
          <label className="block text-xs font-medium text-neutral-600">Description</label>
          <input
            name="description"
            defaultValue={group.description ?? ""}
            className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
          />
        </div>
        <Button type="submit" variant="secondary" pending={pending} pendingText="Saving…">
          Save
        </Button>
        <button type="button" onClick={() => setEditing(false)} className="text-xs text-neutral-500 hover:text-neutral-700">
          Cancel
        </button>
        {state?.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
      </form>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-semibold text-neutral-900">{group.name}</h1>
        <button type="button" onClick={() => setEditing(true)} className="text-xs text-neutral-400 hover:text-neutral-700">
          Edit
        </button>
      </div>
      {group.description && <p className="text-sm text-neutral-500">{group.description}</p>}
      <p className="mt-1 text-sm text-neutral-500">{memberCount} assets</p>
    </div>
  );
}
