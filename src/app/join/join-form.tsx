"use client";

import { useActionState } from "react";
import { joinWithInvite } from "./actions";

export function JoinForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(joinWithInvite, undefined);

  if (state?.message) {
    return <p className="mt-6 text-sm text-neutral-700">{state.message}</p>;
  }

  return (
    <form action={action} className="mt-6 space-y-4">
      <input type="hidden" name="token" value={token} />
      <div>
        <label htmlFor="displayName" className="block text-sm font-medium text-neutral-700">
          Name
        </label>
        <input
          id="displayName"
          name="displayName"
          required
          autoFocus
          className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
          placeholder="Jaysen"
        />
      </div>
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-neutral-700">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
          placeholder="you@example.com"
        />
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
      >
        {pending ? "Creating…" : "Create account"}
      </button>
    </form>
  );
}
