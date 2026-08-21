"use client";

import { useState, useTransition } from "react";
import { deleteUser } from "./actions";

export function DeleteUserButton({ userId, displayName }: { userId: string; displayName: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <span>
      <button
        type="button"
        disabled={pending}
        onClick={(e) => {
          e.preventDefault();
          if (!window.confirm(`Delete ${displayName}? This can't be undone.`)) return;
          setError(null);
          startTransition(async () => {
            try {
              await deleteUser(userId);
            } catch (err) {
              setError(err instanceof Error ? err.message : "Failed to delete.");
            }
          });
        }}
        className="text-xs text-neutral-400 transition-colors duration-150 hover:text-red-600 disabled:opacity-50"
      >
        Delete
      </button>
      {error && <span className="ml-2 text-xs text-red-600">{error}</span>}
    </span>
  );
}
