"use client";

import { useTransition } from "react";
import { deleteHelpArticle } from "../../../actions";

export function DeleteArticleButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!window.confirm("Delete this article? This can't be undone.")) return;
        startTransition(() => deleteHelpArticle(id));
      }}
      className="rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
    >
      {pending ? "Deleting…" : "Delete article"}
    </button>
  );
}
