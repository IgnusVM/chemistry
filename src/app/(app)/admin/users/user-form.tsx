"use client";

import { useActionState } from "react";
import { createUser } from "./actions";
import { Button } from "@/components/button";

export function UserForm() {
  const [state, action, pending] = useActionState(createUser, undefined);

  return (
    <form action={action} className="flex flex-wrap items-end gap-3 rounded-md border border-neutral-200 bg-white p-4">
      <div>
        <label className="block text-xs font-medium text-neutral-600">Email</label>
        <input
          name="email"
          type="email"
          required
          className="mt-1 rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-neutral-600">Display name</label>
        <input
          name="displayName"
          required
          className="mt-1 rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-neutral-600">Playa name</label>
        <input
          name="playaName"
          className="mt-1 rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
      </div>
      <Button type="submit" pending={pending} pendingText="Adding…">
        Add user
      </Button>
      {state?.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
