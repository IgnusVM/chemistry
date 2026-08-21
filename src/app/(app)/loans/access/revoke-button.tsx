"use client";

import { useState, useTransition } from "react";
import { revokeLoanPrivilege } from "../../assets/loan-actions";

export function RevokeButton({
  userId,
  departmentId,
  displayName,
}: {
  userId: string;
  departmentId: string;
  displayName: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <span>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!window.confirm(`Remove check-out access for ${displayName}?`)) return;
          setError(null);
          startTransition(async () => {
            try {
              await revokeLoanPrivilege(userId, departmentId);
            } catch (err) {
              setError(err instanceof Error ? err.message : "Failed to revoke.");
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
