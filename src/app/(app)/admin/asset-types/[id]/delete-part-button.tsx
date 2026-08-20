"use client";

import { useState, useTransition } from "react";
import { deletePart } from "../actions";

export function DeletePartButton({ partId }: { partId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <span>
      <button
        type="button"
        disabled={pending}
        onClick={(e) => {
          e.preventDefault();
          if (!window.confirm("Delete this part? This can't be undone.")) return;
          setError(null);
          startTransition(async () => {
            try {
              await deletePart(partId);
            } catch (err) {
              setError(err instanceof Error ? err.message : "Failed to delete.");
            }
          });
        }}
        className="text-xs text-neutral-400 transition-colors duration-150 hover:text-red-600 disabled:opacity-50"
      >
        Remove
      </button>
      {error && <span className="ml-2 text-xs text-red-600">{error}</span>}
    </span>
  );
}
