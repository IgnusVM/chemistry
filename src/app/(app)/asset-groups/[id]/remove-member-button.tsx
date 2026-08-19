"use client";

import { useTransition } from "react";
import { removeAssetFromGroup } from "../actions";

export function RemoveMemberButton({ assetGroupId, assetId }: { assetGroupId: string; assetId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => removeAssetFromGroup(assetGroupId, assetId))}
      className="text-xs text-neutral-400 hover:text-red-600 disabled:opacity-50"
    >
      Remove
    </button>
  );
}
