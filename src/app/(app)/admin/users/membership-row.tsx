"use client";

import { useTransition } from "react";
import { removeMembership } from "./actions";

export function MembershipRow({
  userId,
  departmentId,
  departmentName,
  role,
}: {
  userId: string;
  departmentId: string;
  departmentName: string;
  role: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-1 text-xs text-neutral-700">
      {departmentName} · {role.toLowerCase()}
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(() => removeMembership(userId, departmentId))}
        className="ml-1 text-neutral-400 transition-colors duration-150 hover:text-red-600 disabled:opacity-50"
        aria-label={`Remove ${departmentName}`}
      >
        ×
      </button>
    </span>
  );
}
