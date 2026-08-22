"use client";

import { useTransition } from "react";
import { deleteAssetCodeFile } from "@/app/(app)/admin/asset-types/code-file-actions";

export function DeleteCodeFileButton({ codeFileId }: { codeFileId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm("Delete this code file and its entire version history? This can't be undone.")) return;
        startTransition(() => deleteAssetCodeFile(codeFileId));
      }}
      className="text-xs text-neutral-400 transition-colors duration-150 hover:text-red-600 disabled:opacity-50"
    >
      Delete file
    </button>
  );
}
