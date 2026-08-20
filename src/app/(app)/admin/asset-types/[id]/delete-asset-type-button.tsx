"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteAssetType } from "../actions";
import { Button } from "@/components/button";

export function DeleteAssetTypeButton({ assetTypeId, assetCount }: { assetTypeId: string; assetCount: number }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  return (
    <div className="text-right">
      <Button
        type="button"
        variant="danger"
        disabled={assetCount > 0}
        pending={pending}
        pendingText="Deleting…"
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
      >
        Delete asset type
      </Button>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
