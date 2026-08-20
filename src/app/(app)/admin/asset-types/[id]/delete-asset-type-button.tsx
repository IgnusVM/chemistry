"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteAssetType } from "../actions";

export function DeleteAssetTypeButton({ assetTypeId, assetCount }: { assetTypeId: string; assetCount: number }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  return (
    <div className="text-right">
      <button
        type="button"
        disabled={pending || assetCount > 0}
        title={assetCount > 0 ? "Reassign or remove its assets before deleting this type." : undefined}
        onClick={() => {
          if (!window.confirm("Delete this asset type? This can't be undone.")) return;
          setError(null);
          startTransition(async () => {
            try {
              await deleteAssetType(assetTypeId);
              router.push("/admin/asset-types");
            } catch (e) {
              setError(e instanceof Error ? e.message : "Failed to delete.");
            }
          });
        }}
        className="rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {pending ? "Deleting…" : "Delete asset type"}
      </button>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
