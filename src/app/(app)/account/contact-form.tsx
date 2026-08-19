"use client";

import { useActionState } from "react";
import { updateContactInfo } from "./actions";

export function ContactForm({
  phone,
  notifyByEmail,
}: {
  phone: string | null;
  notifyByEmail: boolean;
}) {
  const [state, action, pending] = useActionState(updateContactInfo, undefined);

  return (
    <form action={action} className="space-y-3 rounded-md border border-neutral-200 bg-white p-4">
      <div>
        <h2 className="text-sm font-semibold text-neutral-900">Contact info</h2>
        <p className="text-xs text-neutral-500">
          Optional — only used for work order and asset notifications you opt into.
        </p>
      </div>
      <div>
        <label className="block text-xs font-medium text-neutral-600">Phone number</label>
        <input
          name="phone"
          type="tel"
          defaultValue={phone ?? ""}
          placeholder="(555) 555-0100"
          className="mt-1 w-full max-w-xs rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-neutral-700">
        <input type="checkbox" name="notifyByEmail" defaultChecked={notifyByEmail} />
        Email me about work order updates
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save"}
      </button>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.message && <p className="text-sm text-green-700">{state.message}</p>}
    </form>
  );
}
