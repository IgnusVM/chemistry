"use client";

import { useState, useTransition } from "react";
import { toggleOrgAdmin } from "./actions";

export function OrgAdminToggle({ userId, isOrgAdmin }: { userId: string; isOrgAdmin: boolean }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <label className="flex items-center gap-2 whitespace-nowrap text-xs text-neutral-600">
        <input
          type="checkbox"
          checked={isOrgAdmin}
          disabled={pending}
          onChange={(e) => {
            const next = e.target.checked;
            setError(null);
            startTransition(async () => {
              try {
                await toggleOrgAdmin(userId, next);
              } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to update.");
              }
            });
          }}
        />
        Org admin
      </label>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
