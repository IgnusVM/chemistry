"use client";

import { useTransition } from "react";
import { deleteHelpArticle } from "../../../actions";
import { Button } from "@/components/button";

export function DeleteArticleButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="danger"
      pending={pending}
      pendingText="Deleting…"
      onClick={() => {
        if (!window.confirm("Delete this article? This can't be undone.")) return;
        startTransition(() => deleteHelpArticle(id));
      }}
    >
      Delete article
    </Button>
  );
}
