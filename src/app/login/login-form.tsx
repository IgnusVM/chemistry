"use client";

import { useActionState } from "react";
import { requestMagicLink } from "./actions";
import { Button } from "@/components/button";

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(requestMagicLink, undefined);

  if (state?.message) {
    return <p className="mt-6 text-sm text-neutral-700">{state.message}</p>;
  }

  return (
    <form action={action} className="mt-6 space-y-4">
      {next && <input type="hidden" name="next" value={next} />}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-neutral-700">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoFocus
          className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
          placeholder="you@example.com"
        />
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <Button type="submit" pending={pending} pendingText="Sending…" className="w-full">
        Send sign-in link
      </Button>
    </form>
  );
}
