"use client";

import { useTransition } from "react";
import { toggleOrgAdmin } from "./actions";

export function OrgAdminToggle({ userId, isOrgAdmin }: { userId: string; isOrgAdmin: boolean }) {
  const [pending, startTransition] = useTransition();

  return (
    <label className="flex items-center gap-2 text-xs text-neutral-600">
      <input
        type="checkbox"
        checked={isOrgAdmin}
        disabled={pending}
        onChange={(e) => startTransition(() => toggleOrgAdmin(userId, e.target.checked))}
      />
      Org admin
    </label>
  );
}
