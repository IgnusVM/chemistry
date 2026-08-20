"use client";

import { useTransition } from "react";
import { deleteAssetTypeDocument } from "../actions";

export function DeleteDocumentButton({ documentId }: { documentId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => deleteAssetTypeDocument(documentId))}
      className="text-xs text-neutral-400 transition-colors duration-150 hover:text-red-600 disabled:opacity-50"
    >
      Remove
    </button>
  );
}
