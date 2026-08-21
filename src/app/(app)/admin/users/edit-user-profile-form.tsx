"use client";

import { useState, useTransition } from "react";
import { updateUserProfile, type UpdateUserProfileState } from "./actions";
import { Button } from "@/components/button";

const inputClass = "rounded-md border border-neutral-300 px-2 py-1 text-sm";

export function EditUserProfileForm({
  user,
  onDone,
}: {
  user: { id: string; displayName: string; name: string | null };
  onDone: () => void;
}) {
  const [state, setState] = useState<UpdateUserProfileState>(undefined);
  const [pending, startTransition] = useTransition();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        startTransition(async () => {
          const result = await updateUserProfile(undefined, formData);
          setState(result);
          if (!result || !("error" in result)) onDone();
        });
      }}
      className="mt-2 flex flex-wrap items-end gap-2 rounded-md bg-neutral-50 p-2"
    >
      <input type="hidden" name="id" value={user.id} />
      <div>
        <label className="block text-xs font-medium text-neutral-600">User name</label>
        <input name="displayName" required defaultValue={user.displayName} className={`mt-1 ${inputClass}`} />
      </div>
      <div>
        <label className="block text-xs font-medium text-neutral-600">Name</label>
        <input name="name" defaultValue={user.name ?? ""} className={`mt-1 ${inputClass}`} />
      </div>
      <Button type="submit" variant="secondary" pending={pending} pendingText="Saving…">
        Save
      </Button>
      <button type="button" onClick={onDone} className="text-xs text-neutral-500 hover:text-neutral-700">
        Cancel
      </button>
      {state?.error && <p className="w-full text-xs text-red-600">{state.error}</p>}
    </form>
  );
}
