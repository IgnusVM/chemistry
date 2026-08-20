"use client";

import { useActionState } from "react";
import { updateWorkOrderAsset } from "../actions";
import { Button } from "@/components/button";

export function AssetEditForm({
  workOrderId,
  currentAssetTag,
  assetTags,
}: {
  workOrderId: string;
  currentAssetTag: string | null;
  assetTags: string[];
}) {
  const [state, action, pending] = useActionState(updateWorkOrderAsset, undefined);

  return (
    <form action={action} className="space-y-2 rounded-md border border-neutral-200 bg-white p-4">
      <input type="hidden" name="workOrderId" value={workOrderId} />
      <h2 className="text-sm font-semibold text-neutral-900">Asset</h2>
      <input
        key={currentAssetTag ?? "none"}
        name="assetTag"
        list="wo-asset-tags"
        defaultValue={currentAssetTag ?? ""}
        placeholder="No asset linked"
        className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
      />
      <datalist id="wo-asset-tags">
        {assetTags.map((tag) => (
          <option key={tag} value={tag} />
        ))}
      </datalist>
      <Button type="submit" variant="secondary" pending={pending} pendingText="Saving…" className="w-full">
        Save asset
      </Button>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
