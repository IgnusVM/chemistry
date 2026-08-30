"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { updateWorkOrderStatus } from "../actions";
import { ConfirmModal } from "@/components/confirm-modal";

/**
 * The two ways a work order ends.
 *
 * There is no separate "close" step. A ticket that has finished is Complete, and
 * one that is not going to happen is Cancelled; both are closed. The old model
 * had Closed sitting beside those two as a third peer, which left it genuinely
 * unclear what a closed-but-not-complete ticket meant.
 *
 * Completing with tasks still unticked warns first and then allows it. A half
 * ticked list usually means a step turned out not to be needed, and a ticket
 * that refuses to close until the boxes are tidy is a ticket people stop putting
 * boxes on. Cancelling never warns: abandoning work with steps outstanding is
 * the ordinary case, not a surprise.
 */
export function FinishButtons({
  workOrderId,
  openTaskCount,
}: {
  workOrderId: string;
  openTaskCount: number;
}) {
  const [asking, setAsking] = useState<null | "complete" | "cancel">(null);
  const [pending, start] = useTransition();

  function set(status: "COMPLETE" | "CANCELLED") {
    start(async () => {
      const fd = new FormData();
      fd.set("workOrderId", workOrderId);
      fd.set("status", status);
      await updateWorkOrderStatus(fd);
      setAsking(null);
    });
  }

  return (
    <>
      <button
        type="button"
        disabled={pending}
        onClick={() => (openTaskCount > 0 ? setAsking("complete") : set("COMPLETE"))}
        className="finish-glow inline-flex h-11 items-center gap-1.5 rounded-md bg-green-600 px-3 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
      >
        <CheckCircle2 className="h-4 w-4" aria-hidden />
        Complete
      </button>

      <button
        type="button"
        disabled={pending}
        onClick={() => setAsking("cancel")}
        className="cancel-glow inline-flex h-11 items-center gap-1.5 rounded-md bg-red-600 px-3 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
      >
        <XCircle className="h-4 w-4" aria-hidden />
        Cancel
      </button>

      {asking === "complete" ? (
        <ConfirmModal
          title={
            openTaskCount === 1
              ? "One task is still unticked"
              : `${openTaskCount} tasks are still unticked`
          }
          confirmLabel="Complete anyway"
          pending={pending}
          onConfirm={() => set("COMPLETE")}
          onCancel={() => setAsking(null)}
        >
          You can still complete this ticket. Unticked tasks stay on it as a
          record of what was left.
        </ConfirmModal>
      ) : null}

      {asking === "cancel" ? (
        <ConfirmModal
          title="Cancel this work order?"
          confirmLabel="Yes, cancel it"
          pending={pending}
          onConfirm={() => set("CANCELLED")}
          onCancel={() => setAsking(null)}
        >
          Cancelling records that the work is not going to happen. The ticket
          stays as a read-only record and can be reopened if that changes.
        </ConfirmModal>
      ) : null}
    </>
  );
}
