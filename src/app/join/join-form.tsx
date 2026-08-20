"use client";

import { useActionState } from "react";
import { joinWithInvite } from "./actions";
import { Button } from "@/components/button";

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
          placeholder="Your name"
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
      <Button type="submit" pending={pending} pendingText="Creating…" className="w-full">
        Create account
      </Button>
    </form>
  );
}
