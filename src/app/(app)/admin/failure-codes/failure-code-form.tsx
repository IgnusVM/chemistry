"use client";

import { useActionState } from "react";
import { createFailureCode } from "./actions";

export function FailureCodeForm({ assetTypes }: { assetTypes: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState(createFailureCode, undefined);

  return (
    <form action={action} className="flex flex-wrap items-end gap-3 rounded-md border border-neutral-200 bg-white p-4">
      <div>
        <label className="block text-xs font-medium text-neutral-600">Code</label>
        <input
          name="code"
          required
          placeholder="NO_LIGHT"
          className="mt-1 rounded-md border border-neutral-300 px-2 py-1.5 text-sm font-mono uppercase"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-neutral-600">Label</label>
        <input
          name="label"
          required
          placeholder="No light"
          className="mt-1 rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-neutral-600">Asset type</label>
        <select name="assetTypeId" className="mt-1 rounded-md border border-neutral-300 px-2 py-1.5 text-sm">
          <option value="">Generic (any asset)</option>
          {assetTypes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
      >
        {pending ? "Adding…" : "Add failure code"}
      </button>
      {state?.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
