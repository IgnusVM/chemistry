"use client";

import { useTransition } from "react";
import { deleteWorkOrderAttachment } from "../actions";

export function DeleteAttachmentButton({ attachmentId }: { attachmentId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => deleteWorkOrderAttachment(attachmentId))}
      className="text-xs text-neutral-400 transition-colors duration-150 hover:text-red-600 disabled:opacity-50"
    >
      Remove
    </button>
  );
}
