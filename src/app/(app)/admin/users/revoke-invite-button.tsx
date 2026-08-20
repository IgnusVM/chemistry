"use client";

import { useTransition } from "react";
import { revokeInviteCode } from "./actions";

export function RevokeInviteButton({ inviteId }: { inviteId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => revokeInviteCode(inviteId))}
      className="text-xs text-neutral-400 hover:text-red-600 disabled:opacity-50"
    >
      Revoke
    </button>
  );
}
