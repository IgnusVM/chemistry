"use client";

import { useTransition } from "react";
import { deletePartOrder } from "../../../actions";

export function DeletePartOrderButton({ orderId }: { orderId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => deletePartOrder(orderId))}
      className="text-xs text-neutral-400 transition-colors duration-150 hover:text-red-600 disabled:opacity-50"
    >
      Remove
    </button>
  );
}
