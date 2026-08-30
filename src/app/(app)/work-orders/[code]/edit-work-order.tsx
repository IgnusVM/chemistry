"use client";

import { useActionState, useState, useTransition } from "react";
import { Pencil, Undo2, Redo2 } from "lucide-react";
import {
  editWorkOrder,
  undoWorkOrderEdit,
  redoWorkOrderEdit,
  type EditWorkOrderState,
} from "../actions";
import { Button } from "@/components/button";
import { WO_TYPES, WO_PRIORITIES, statusLabel } from "@/lib/constants";
import type { RevisionState } from "@/lib/work-order-revisions";

type WorkOrder = {
  id: string;
  title: string;
  description: string;
  priority: string;
  type: string;
  resolutionNotes: string | null;
  laborMinutes: number | null;
};

/**
 * Editing a work order, with a way back.
 *
 * Undo is offered whenever there is an edit to take back. Redo is hidden until
 * there is something to redo — a permanently greyed-out button is furniture,
 * and its absence is the clearest possible signal that stepping back is the
 * only direction available.
 */
export function EditWorkOrder({
  workOrder,
  revisions,
}: {
  workOrder: WorkOrder;
  revisions: RevisionState;
}) {
  const [open, setOpen] = useState(false);
  const [busy, start] = useTransition();
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [state, action, pending] = useActionState<EditWorkOrderState, FormData>(
    async (prev, fd) => {
      const res = await editWorkOrder(prev, fd);
      if (!res?.error) setOpen(false);
      return res;
    },
    undefined,
  );

  function step(fn: (id: string) => Promise<EditWorkOrderState>) {
    setHistoryError(null);
    start(async () => {
      const res = await fn(workOrder.id);
      if (res?.error) setHistoryError(res.error);
    });
  }

  return (
    <div className="mt-2">
      <div className="flex flex-wrap items-center gap-1">
        {!open ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex h-11 items-center gap-1.5 rounded-md px-2 text-xs text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden />
            Edit details
          </button>
        ) : null}

        {revisions.canUndo ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => step(undoWorkOrderEdit)}
            title={revisions.undoLabel ? `Undo the change to ${revisions.undoLabel}` : "Undo the last edit"}
            className="inline-flex h-11 items-center gap-1.5 rounded-md px-2 text-xs text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 disabled:opacity-50"
          >
            <Undo2 className="h-3.5 w-3.5" aria-hidden />
            Undo
          </button>
        ) : null}

        {/* Only when there is something to redo. */}
        {revisions.canRedo ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => step(redoWorkOrderEdit)}
            title={revisions.redoLabel ? `Redo the change to ${revisions.redoLabel}` : "Redo"}
            className="inline-flex h-11 items-center gap-1.5 rounded-md px-2 text-xs text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 disabled:opacity-50"
          >
            <Redo2 className="h-3.5 w-3.5" aria-hidden />
            Redo
          </button>
        ) : null}
      </div>

      {historyError ? <p className="text-xs text-red-600">{historyError}</p> : null}

      {open ? (
        <form action={action} className="mt-2 space-y-3 rounded-md border border-neutral-200 bg-white p-4">
          <input type="hidden" name="workOrderId" value={workOrder.id} />

          <div>
            <label htmlFor="wo-title" className="block text-xs font-medium text-neutral-600">
              Title
            </label>
            <input
              id="wo-title"
              name="title"
              required
              maxLength={140}
              defaultValue={workOrder.title}
              className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
            />
          </div>

          <div>
            <label htmlFor="wo-description" className="block text-xs font-medium text-neutral-600">
              What&rsquo;s wrong
            </label>
            <textarea
              id="wo-description"
              name="description"
              rows={8}
              maxLength={10000}
              defaultValue={workOrder.description}
              placeholder="What happened, what you have tried, anything the next person needs to know…"
              className="mt-1 w-full resize-y rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <div>
              <label htmlFor="wo-priority" className="block text-xs font-medium text-neutral-600">Priority</label>
              <select id="wo-priority" name="priority" defaultValue={workOrder.priority} className="mt-1 rounded-md border border-neutral-300 px-2 py-1.5 text-sm">
                {WO_PRIORITIES.map((p) => <option key={p} value={p}>{statusLabel(p)}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="wo-type" className="block text-xs font-medium text-neutral-600">Type</label>
              <select id="wo-type" name="type" defaultValue={workOrder.type} className="mt-1 rounded-md border border-neutral-300 px-2 py-1.5 text-sm">
                {WO_TYPES.map((t) => <option key={t} value={t}>{statusLabel(t)}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="wo-labor" className="block text-xs font-medium text-neutral-600">Labour minutes</label>
              <input
                id="wo-labor"
                name="laborMinutes"
                type="number"
                min={0}
                defaultValue={workOrder.laborMinutes ?? ""}
                className="mt-1 w-28 rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
              />
            </div>
          </div>

          <div>
            <label htmlFor="wo-resolution" className="block text-xs font-medium text-neutral-600">
              Resolution notes
            </label>
            <textarea
              id="wo-resolution"
              name="resolutionNotes"
              rows={3}
              maxLength={10000}
              defaultValue={workOrder.resolutionNotes ?? ""}
              className="mt-1 w-full resize-y rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button type="submit" variant="secondary" pending={pending} pendingText="Saving…">Save</Button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex h-11 items-center rounded px-2 text-xs text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
            >
              Cancel
            </button>
            <span className="text-xs text-neutral-500">Up to five edits can be undone.</span>
          </div>
          {state?.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
        </form>
      ) : null}
    </div>
  );
}
