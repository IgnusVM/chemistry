"use client";

import { useActionState } from "react";
import { setPin } from "./actions";
import { Button } from "@/components/button";

export function PinForm({ hasPin }: { hasPin: boolean }) {
  const [state, action, pending] = useActionState(setPin, undefined);

  return (
    <form action={action} className="space-y-3 rounded-md border border-neutral-200 bg-white p-4">
      <div>
        <h2 className="text-sm font-semibold text-neutral-900">
          {hasPin ? "Change your PIN" : "Set a PIN"}
        </h2>
        <p className="text-xs text-neutral-500">
          Once set, signing in again on this device just needs the PIN — no email round-trip.
        </p>
      </div>
      <div className="flex gap-3">
        <div>
          <label className="block text-xs font-medium text-neutral-600">New PIN</label>
          <input
            name="pin"
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            minLength={4}
            maxLength={8}
            required
            className="mt-1 rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-600">Confirm</label>
          <input
            name="confirmPin"
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            minLength={4}
            maxLength={8}
            required
            className="mt-1 rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
          />
        </div>
      </div>
      <Button type="submit" pending={pending} pendingText="Saving…">
        {hasPin ? "Update PIN" : "Set PIN"}
      </Button>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.message && <p className="text-sm text-green-700">{state.message}</p>}
    </form>
  );
}
