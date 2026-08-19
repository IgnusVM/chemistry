"use client";

import { useActionState } from "react";
import { addAssetsToGroup } from "../actions";

export function AddAssetsForm({ assetGroupId }: { assetGroupId: string }) {
  const [state, action, pending] = useActionState(addAssetsToGroup, undefined);

  return (
    <form action={action} className="space-y-2 rounded-md border border-neutral-200 bg-white p-4">
      <input type="hidden" name="assetGroupId" value={assetGroupId} />
      <label className="block text-xs font-medium text-neutral-600">Add existing assets by tag</label>
      <textarea
        name="tagList"
        rows={2}
        placeholder={"LL-0012, LL-0013\nor one per line"}
        className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm font-mono"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100 disabled:opacity-50"
      >
        {pending ? "Adding…" : "Add to group"}
      </button>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.message && <p className="text-sm text-neutral-600">{state.message}</p>}
    </form>
  );
}
