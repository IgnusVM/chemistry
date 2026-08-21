"use client";

import { useTransition } from "react";
import { deletePartLink } from "../../../actions";

export function DeletePartLinkButton({ linkId }: { linkId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => deletePartLink(linkId))}
      className="text-xs text-neutral-400 transition-colors duration-150 hover:text-red-600 disabled:opacity-50"
    >
      Remove
    </button>
  );
}
