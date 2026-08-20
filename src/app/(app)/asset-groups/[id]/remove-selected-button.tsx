"use client";

import { useTransition } from "react";
import { removeAssetsFromGroup } from "../actions";
import { useSelection } from "@/components/selection/selection-context";

export function RemoveSelectedButton({ assetGroupId }: { assetGroupId: string }) {
  const { selected, selectedCount, clearSelection } = useSelection();
  const [pending, startTransition] = useTransition();

  if (selectedCount === 0) return null;

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await removeAssetsFromGroup(assetGroupId, Array.from(selected));
          clearSelection();
        })
      }
      className="rounded-md border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
    >
      {pending ? "Removing…" : `Remove ${selectedCount} selected`}
    </button>
  );
}
