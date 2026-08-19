"use client";

import { useActionState } from "react";
import { loginWithPin } from "./actions";

export function PinLoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(loginWithPin, undefined);

  return (
    <form action={action} className="mt-6 space-y-4">
      {next && <input type="hidden" name="next" value={next} />}
      <div>
        <label htmlFor="pin" className="block text-sm font-medium text-neutral-700">
          PIN
        </label>
        <input
          id="pin"
          name="pin"
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          minLength={4}
          maxLength={8}
          required
          autoFocus
          className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-center text-lg tracking-widest focus:border-neutral-500 focus:outline-none"
        />
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
