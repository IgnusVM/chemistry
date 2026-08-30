"use client";

import { useState, useTransition } from "react";
import { updateWorkOrderStatus } from "../actions";
import { Button } from "@/components/button";
import { ConfirmModal } from "@/components/confirm-modal";

/**
 * Closing a ticket, with a word first if its checklist is unfinished.
 *
 * It warns and then lets you through. A half-ticked list usually means a step
 * turned out not to be needed, and a ticket that refuses to close until the
 * boxes are tidy is a ticket people stop putting boxes on. The count is passed
 * in from the server, so the warning reflects the real state rather than
 * whatever the page last rendered.
 */
export function CloseTicketButton({
  workOrderId,
  openTaskCount,
}: {
  workOrderId: string;
  openTaskCount: number;
}) {
  const [asking, setAsking] = useState(false);
  const [pending, start] = useTransition();

  function close() {
    start(async () => {
      const fd = new FormData();
      fd.set("workOrderId", workOrderId);
      fd.set("status", "CLOSED");
      await updateWorkOrderStatus(fd);
      setAsking(false);
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        onClick={() => (openTaskCount > 0 ? setAsking(true) : close())}
        pending={pending}
        pendingText="Closing…"
      >
        Close ticket
      </Button>

      {asking ? (
        <ConfirmModal
          title={
            openTaskCount === 1
              ? "One task is still unticked"
              : `${openTaskCount} tasks are still unticked`
          }
          confirmLabel="Close anyway"
          pending={pending}
          onConfirm={close}
          onCancel={() => setAsking(false)}
        >
          You can still close this ticket. Unticked tasks stay on it as a record
          of what was left.
        </ConfirmModal>
      ) : null}
    </>
  );
}
