"use client";

import { useTransition } from "react";
import { deleteWorkOrderPart } from "../actions";

export function DeleteWorkOrderPartButton({ workOrderPartId }: { workOrderPartId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => deleteWorkOrderPart(workOrderPartId))}
      className="text-xs text-neutral-400 transition-colors duration-150 hover:text-red-600 disabled:opacity-50"
    >
      Remove
    </button>
  );
}
