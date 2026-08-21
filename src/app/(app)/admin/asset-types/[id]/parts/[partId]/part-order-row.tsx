"use client";

import { useState, useTransition } from "react";
import { updatePartOrder, type PartOrderFormState } from "../../../actions";
import { DeletePartOrderButton } from "./delete-part-order-button";
import { Button } from "@/components/button";
import { UserBadgeLabel } from "@/components/user-badge";
import type { ResolvedBadge } from "@/lib/user-badge-data";

const inputClass = "rounded-md border border-neutral-300 px-2 py-1 text-sm";

export function PartOrderRow({
  order,
  createdByBadge,
}: {
  order: {
    id: string;
    price: string | null;
    quantity: number;
    orderedAt: Date;
  };
  createdByBadge: ResolvedBadge | null;
}) {
  const [editing, setEditing] = useState(false);
  const [state, setState] = useState<PartOrderFormState>(undefined);
  const [pending, startTransition] = useTransition();

  if (editing) {
    return (
      <li className="py-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            startTransition(async () => {
              const result = await updatePartOrder(undefined, formData);
              setState(result);
              if (!result || !("error" in result)) setEditing(false);
            });
          }}
          className="flex flex-wrap items-end gap-2"
        >
          <input type="hidden" name="orderId" value={order.id} />
          <div className="w-28">
            <label className="block text-xs font-medium text-neutral-600">Price ($)</label>
            <input
              name="price"
              type="number"
              min={0}
              step="0.01"
              defaultValue={order.price ?? ""}
              className={`mt-1 w-full ${inputClass}`}
            />
          </div>
          <div className="w-20">
            <label className="block text-xs font-medium text-neutral-600">Qty</label>
            <input
              name="quantity"
              type="number"
              min={1}
              defaultValue={order.quantity}
              className={`mt-1 w-full ${inputClass}`}
            />
          </div>
          <div className="w-36">
            <label className="block text-xs font-medium text-neutral-600">Date</label>
            <input
              name="orderedAt"
              type="date"
              defaultValue={order.orderedAt.toISOString().slice(0, 10)}
              className={`mt-1 w-full ${inputClass}`}
            />
          </div>
          <Button type="submit" variant="secondary" pending={pending} pendingText="Saving…">
            Save
          </Button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="text-xs text-neutral-500 hover:text-neutral-700"
          >
            Cancel
          </button>
          {state && "error" in state && <p className="w-full text-xs text-red-600">{state.error}</p>}
        </form>
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between py-2 text-sm">
      <div>
        <span className="font-medium text-neutral-900">
          {order.price ? `$${order.price.toString()}` : "No price logged"}
        </span>
        <span className="ml-2 text-neutral-500">qty {order.quantity}</span>
        <span className="ml-2 text-neutral-500">{order.orderedAt.toLocaleDateString()}</span>
        <div className="text-xs text-neutral-400">
          Logged by <UserBadgeLabel badge={createdByBadge} />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => setEditing(true)} className="text-xs text-neutral-400 hover:text-neutral-700">
          Edit
        </button>
        <DeletePartOrderButton orderId={order.id} />
      </div>
    </li>
  );
}
