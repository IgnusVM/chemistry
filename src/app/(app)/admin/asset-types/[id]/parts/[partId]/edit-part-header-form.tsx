"use client";

import { useActionState } from "react";
import { updatePart } from "../../../actions";
import { Button } from "@/components/button";

export function EditPartHeaderForm({ part }: { part: { id: string; partNumber: string; description: string } }) {
  const [state, action, pending] = useActionState(updatePart, undefined);

  return (
    <form
      key={`${part.partNumber}|${part.description}`}
      action={action}
      className="flex flex-wrap items-end gap-3"
    >
      <input type="hidden" name="partId" value={part.id} />
      <div>
        <label className="block text-xs font-medium text-neutral-600">Part number</label>
        <input
          name="partNumber"
          required
          defaultValue={part.partNumber}
          className="mt-1 rounded-md border border-neutral-300 px-2 py-1.5 text-sm font-medium"
        />
      </div>
      <div className="min-w-[16rem] flex-1">
        <label className="block text-xs font-medium text-neutral-600">Description</label>
        <input
          name="description"
          required
          defaultValue={part.description}
          className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
      </div>
      <Button type="submit" variant="secondary" pending={pending} pendingText="Saving…">
        Save
      </Button>
      {state?.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
