"use client";

import { useActionState, useState, useTransition } from "react";
import { ChevronLeft, ChevronRight, Lock } from "lucide-react";
import { saveColumn, deleteColumn, reorderColumn, type ColumnFormState } from "./actions";
import { BOARD_COLORS } from "@/lib/board-colors";
import { Button } from "@/components/button";
import { WO_STATUSES } from "@/lib/constants";

type Column = {
  id: string;
  name: string;
  color: string | null;
  position: number;
  woStatusOnMove: string | null;
  woStatusesShown: string[];
  _count: { cards: number };
};

const inputClass = "rounded-md border border-neutral-300 px-2 py-1 text-sm";

/**
 * Column configuration for one board.
 *
 * The status controls are the part that needs care. `woStatusesShown` decides
 * where a work order's card appears; `woStatusOnMove` decides what moving a
 * card into this column sets. They answer different questions, which is why
 * Done can show three terminal statuses while a move into it picks one.
 */
export function BoardColumnEditor({
  boardId,
  label,
  isDivision,
  columns,
}: {
  boardId: string;
  label: string;
  isDivision: boolean;
  columns: Column[];
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [state, action, pending] = useActionState<ColumnFormState, FormData>(saveColumn, undefined);
  const [delState, delAction, delPending] = useActionState<ColumnFormState, FormData>(deleteColumn, undefined);
  const [moving, startMove] = useTransition();

  return (
    <section className="rounded-md border border-neutral-200 bg-white">
      <header className="flex items-center gap-2 border-b border-neutral-200 px-4 py-2.5">
        <h2 className="text-sm font-semibold text-neutral-900">{label}</h2>
        {isDivision ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-700">
            <Lock className="h-3 w-3" aria-hidden />
            Division
          </span>
        ) : null}
        <span className="ml-auto text-xs text-neutral-400">{columns.length} columns</span>
      </header>

      <ul className="divide-y divide-neutral-200">
        {columns.map((col, i) => (
          <li key={col.id} className="px-4 py-2.5">
            {editing === col.id ? (
              <form action={action} className="space-y-2">
                <input type="hidden" name="boardId" value={boardId} />
                <input type="hidden" name="columnId" value={col.id} />
                <div className="flex flex-wrap items-end gap-2">
                  <div>
                    <label className="block text-xs font-medium text-neutral-600">Name</label>
                    <input name="name" required defaultValue={col.name} className={`mt-1 ${inputClass}`} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-600">Colour</label>
                    <select name="color" defaultValue={col.color ?? "slate"} className={`mt-1 ${inputClass}`}>
                      {BOARD_COLORS.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-600">Moving here sets</label>
                    <select name="woStatusOnMove" defaultValue={col.woStatusOnMove ?? ""} className={`mt-1 ${inputClass}`}>
                      <option value="">Refuses work order cards</option>
                      {WO_STATUSES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <fieldset>
                  <legend className="text-xs font-medium text-neutral-600">Shows work orders in</legend>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                    {WO_STATUSES.map((s) => (
                      <label key={s} className="inline-flex items-center gap-1 text-xs text-neutral-700">
                        <input
                          type="checkbox"
                          name="woStatusesShown"
                          value={s}
                          defaultChecked={col.woStatusesShown.includes(s)}
                        />
                        {s}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <div className="flex items-center gap-2">
                  <Button type="submit" variant="secondary" pending={pending} pendingText="Saving…">Save</Button>
                  <button type="button" onClick={() => setEditing(null)} className="text-xs text-neutral-500 hover:text-neutral-700">
                    Cancel
                  </button>
                </div>
                {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
              </form>
            ) : deleting === col.id ? (
              <form action={delAction} className="flex flex-wrap items-end gap-2">
                <input type="hidden" name="columnId" value={col.id} />
                <div>
                  <label className="block text-xs font-medium text-neutral-600">
                    Move its {col._count.cards} card{col._count.cards === 1 ? "" : "s"} to
                  </label>
                  <select name="moveCardsToColumnId" required className={`mt-1 ${inputClass}`}>
                    {columns.filter((c) => c.id !== col.id).map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <Button type="submit" variant="secondary" pending={delPending} pendingText="Deleting…">
                  Delete column
                </Button>
                <button type="button" onClick={() => setDeleting(null)} className="text-xs text-neutral-500 hover:text-neutral-700">
                  Cancel
                </button>
                {delState?.error && <p className="w-full text-xs text-red-600">{delState.error}</p>}
              </form>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-neutral-900">{col.name}</span>
                <span className="text-xs text-neutral-400">{col._count.cards} cards</span>
                <span className="text-[11px] text-neutral-500">
                  {col.woStatusesShown.length ? col.woStatusesShown.join(", ") : "no work orders"}
                </span>
                <span className="ml-auto flex items-center gap-1">
                  <button
                    type="button"
                    disabled={i === 0 || moving}
                    onClick={() => startMove(() => void reorderColumn(col.id, "left"))}
                    aria-label={`Move ${col.name} left`}
                    className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 disabled:opacity-30"
                  >
                    <ChevronLeft className="h-4 w-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    disabled={i === columns.length - 1 || moving}
                    onClick={() => startMove(() => void reorderColumn(col.id, "right"))}
                    aria-label={`Move ${col.name} right`}
                    className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 disabled:opacity-30"
                  >
                    <ChevronRight className="h-4 w-4" aria-hidden />
                  </button>
                  <button type="button" onClick={() => setEditing(col.id)} className="text-xs text-neutral-400 hover:text-neutral-700">
                    Edit
                  </button>
                  <button type="button" onClick={() => setDeleting(col.id)} className="text-xs text-neutral-400 hover:text-rose-600">
                    Delete
                  </button>
                </span>
              </div>
            )}
          </li>
        ))}
      </ul>

      <div className="border-t border-neutral-200 px-4 py-2.5">
        <form action={action} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="boardId" value={boardId} />
          <div>
            <label className="block text-xs font-medium text-neutral-600">New column</label>
            <input name="name" required placeholder="e.g. Waiting on parts" className={`mt-1 ${inputClass}`} />
          </div>
          <Button type="submit" variant="secondary" pending={pending} pendingText="Adding…">Add</Button>
        </form>
      </div>
    </section>
  );
}
