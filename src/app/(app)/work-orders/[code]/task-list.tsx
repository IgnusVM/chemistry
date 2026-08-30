"use client";

import { useActionState, useState, useTransition } from "react";
import { Plus, Trash2, ListChecks } from "lucide-react";
import { addWorkOrderTask, toggleWorkOrderTask, deleteWorkOrderTask, type TaskState } from "../actions";
import { WO_TASK_MAX_LENGTH } from "@/lib/constants";

export type Task = {
  id: string;
  text: string;
  done: boolean;
  completedByName: string | null;
};

/**
 * The ticket's checklist.
 *
 * Ticking is optimistic — a checkbox that waits for a round trip before moving
 * feels broken, and this is the one control on the page someone uses repeatedly
 * while holding a tool in the other hand. It reverts and says why if the write
 * fails, rather than leaving a tick that never reached the database.
 */
export function TaskList({
  workOrderId,
  tasks,
  help,
}: {
  workOrderId: string;
  tasks: Task[];
  /** The help control, rendered on the server: it reads the database. */
  help?: React.ReactNode;
}) {
  const [state, action, pending] = useActionState<TaskState, FormData>(addWorkOrderTask, undefined);
  const [busy, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [ticked, setTicked] = useState<Record<string, boolean>>({});

  const isDone = (t: Task) => ticked[t.id] ?? t.done;
  const open = tasks.filter((t) => !isDone(t)).length;

  function toggle(t: Task) {
    const next = !isDone(t);
    setTicked((prev) => ({ ...prev, [t.id]: next }));
    setError(null);
    start(async () => {
      const res = await toggleWorkOrderTask(t.id, next);
      if (res?.error) {
        setTicked((prev) => ({ ...prev, [t.id]: !next }));
        setError(res.error);
      }
    });
  }

  return (
    <section className="rounded-md border border-neutral-200 bg-white p-4">
      <h2 className="flex items-center gap-1.5 text-sm font-semibold text-neutral-900">
        <ListChecks className="h-4 w-4 text-neutral-500" aria-hidden />
        Tasks
        {tasks.length > 0 ? (
          <span className="font-normal text-neutral-500">
            {tasks.length - open} of {tasks.length} done
          </span>
        ) : null}
        {help}
      </h2>

      {tasks.length === 0 ? (
        <p className="mt-2 text-xs text-neutral-500">
          No checklist on this ticket yet. Add the steps that have to happen.
        </p>
      ) : (
        <ul className="mt-2 space-y-1">
          {tasks.map((t) => (
            <li key={t.id} className="flex items-center gap-2">
              <label className="flex min-w-0 flex-1 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={isDone(t)}
                  disabled={busy}
                  onChange={() => toggle(t)}
                  className="h-4 w-4 shrink-0"
                />
                <span className={isDone(t) ? "min-w-0 truncate text-neutral-500 line-through" : "min-w-0 truncate text-neutral-900"}>
                  {t.text}
                </span>
                {isDone(t) && t.completedByName ? (
                  <span className="shrink-0 text-[11px] text-neutral-500">{t.completedByName}</span>
                ) : null}
              </label>
              <button
                type="button"
                disabled={busy}
                onClick={() => start(async () => { const r = await deleteWorkOrderTask(t.id); if (r?.error) setError(r.error); })}
                aria-label={`Remove task: ${t.text}`}
                className="-my-3 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-100 hover:text-red-600 disabled:opacity-50"
              >
                <Trash2 className="h-3 w-3" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      <form action={action} className="mt-3 flex items-center gap-1.5">
        <input type="hidden" name="workOrderId" value={workOrderId} />
        <input
          name="text"
          required
          maxLength={WO_TASK_MAX_LENGTH}
          placeholder="Add a task…"
          aria-label="New task"
          className="min-w-0 flex-1 rounded-md border border-neutral-200 bg-white px-2 py-1.5 text-sm placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none"
        />
        <button
          type="submit"
          disabled={pending}
          aria-label="Add task"
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-neutral-200 text-neutral-600 hover:bg-neutral-100 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" aria-hidden />
        </button>
      </form>
      {(state?.error || error) ? (
        <p className="mt-1 text-xs text-red-600">{state?.error ?? error}</p>
      ) : null}
    </section>
  );
}
