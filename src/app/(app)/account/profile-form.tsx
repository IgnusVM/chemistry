"use client";

import { useActionState } from "react";
import { updateProfile } from "./actions";
import { Button } from "@/components/button";

export function ProfileForm({ displayName, name }: { displayName: string; name: string | null }) {
  const [state, action, pending] = useActionState(updateProfile, undefined);

  return (
    <form action={action} className="space-y-3 rounded-md border border-neutral-200 bg-white p-4">
      <div>
        <h2 className="text-sm font-semibold text-neutral-900">Name</h2>
        <p className="text-xs text-neutral-500">User name is shown everywhere throughout the app. Name is optional and only shown alongside it for extra context.</p>
      </div>
      <div>
        <label className="block text-xs font-medium text-neutral-600">User name</label>
        <input
          key={displayName}
          name="displayName"
          required
          defaultValue={displayName}
          className="mt-1 w-full max-w-xs rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-neutral-600">Name (optional)</label>
        <input
          key={name ?? "none"}
          name="name"
          defaultValue={name ?? ""}
          className="mt-1 w-full max-w-xs rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
      </div>
      <Button type="submit" pending={pending} pendingText="Saving…">
        Save
      </Button>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.message && <p className="text-sm text-green-700">{state.message}</p>}
    </form>
  );
}
