"use client";

import { useState, useTransition, useEffect } from "react";
import Link from "next/link";
import { X, ArrowRight, ClipboardList, AlertTriangle } from "lucide-react";
import type { BoardCard } from "@/lib/board";
import { moveCard } from "./actions";

type ColumnChoice = { id: string; name: string; acceptsWorkOrderCards: boolean };

/**
 * Card detail, and the move control.
 *
 * Moving is TWO TAPS and no drag (SC-003, research.md D3): tap the card, tap a
 * column. Drag-and-drop is the conventional kanban gesture and is close to
 * unusable on a phone, in dust, wearing gloves — which is the stated primary
 * context, so the conventional interaction is the wrong one here.
 *
 * The move is applied optimistically and **reverts visibly with an
 * explanation** when the action fails (FR-034). That pairing is deliberate:
 * React discards the optimistic value on its own when the transition settles,
 * so the revert is free — but it carries no error, and a card silently
 * snapping back reads as a broken app rather than a dropped network. The
 * message is what makes the revert honest instead of merely correct.
 */
export function CardSheet({
  card,
  columns,
  currentColumnId,
  canWrite,
  onClose,
}: {
  card: BoardCard;
  columns: ColumnChoice[];
  currentColumnId: string | null;
  canWrite: boolean;
  onClose: () => void;
}) {
  const [pendingColumnId, setPendingColumnId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Don't leave the page scrolling behind the sheet.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  function move(toColumnId: string) {
    setError(null);
    setPendingColumnId(toColumnId);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("cardId", card.id);
      fd.set("toColumnId", toColumnId);
      fd.set("expectedUpdatedAt", new Date(card.updatedAt).toISOString());
      const result = await moveCard(undefined, fd);
      if (result?.error) {
        // Revert: drop the optimistic column and say why. Without the message
        // the card just snaps back and the user concludes the app is flaky.
        setPendingColumnId(null);
        setError(result.error);
        return;
      }
      onClose();
    });
  }

  const shownColumnId = pendingColumnId ?? currentColumnId;

  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center sm:justify-center">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-neutral-900/40"
      />
      {/* Clear the fixed mobile tab bar on phones, or the last column option
          sits behind it and cannot be tapped. Matches the padding the nav's
          own sheet uses. */}
      <div className="relative max-h-[85vh] w-full overflow-y-auto rounded-t-2xl bg-white pb-[calc(env(safe-area-inset-bottom)+5rem)] shadow-xl sm:max-h-[85vh] sm:max-w-md sm:rounded-2xl sm:pb-2">
        <div className="flex items-start gap-2 border-b border-neutral-200 p-4">
          <div className="min-w-0 flex-1">
            {card.workOrder ? (
              <Link
                href={`/work-orders/${card.workOrder.code}`}
                className="mb-1 inline-flex items-center gap-1 rounded border border-sky-200 bg-sky-50 px-1.5 py-0.5 text-[11px] font-medium text-sky-700 hover:bg-sky-100"
              >
                <ClipboardList className="h-3 w-3" aria-hidden />
                {card.workOrder.code}
                <span className="text-sky-500">&rarr;</span>
              </Link>
            ) : null}
            <h2 className="text-base leading-snug font-semibold text-neutral-900">{card.title}</h2>
            {card.nextAction ? (
              <p className="mt-1.5 flex items-start gap-1 text-sm text-neutral-600">
                <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                <span className="min-w-0">{card.nextAction}</span>
              </p>
            ) : null}
            <p className="mt-2 text-xs text-neutral-500">
              {card.owner ? card.owner.displayName : "Nobody assigned yet"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-m-1 shrink-0 rounded-md p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        {card.statusNotes ? (
          <p className="border-b border-neutral-200 px-4 py-3 text-sm whitespace-pre-wrap text-neutral-700">
            {card.statusNotes}
          </p>
        ) : null}

        {canWrite ? (
          <div className="p-2">
            <p className="px-2 pt-1 pb-2 text-xs font-medium text-neutral-500">Move to</p>
            {error ? (
              <p className="mx-2 mb-2 flex items-start gap-1.5 rounded-md bg-rose-50 px-2.5 py-2 text-xs text-rose-700">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                <span>{error}</span>
              </p>
            ) : null}
            <ul className="space-y-1">
              {columns.map((col) => {
                const isCurrent = col.id === shownColumnId;
                const blocked = Boolean(card.workOrder) && !col.acceptsWorkOrderCards;
                return (
                  <li key={col.id}>
                    <button
                      type="button"
                      disabled={isCurrent || isPending || blocked}
                      onClick={() => move(col.id)}
                      className={
                        isCurrent
                          ? "flex w-full items-center justify-between rounded-lg bg-neutral-100 px-3 py-3 text-left text-sm font-medium text-neutral-900"
                          : blocked
                            ? "flex w-full cursor-not-allowed items-center justify-between rounded-lg px-3 py-3 text-left text-sm text-neutral-300"
                            : "flex w-full items-center justify-between rounded-lg px-3 py-3 text-left text-sm text-neutral-700 hover:bg-neutral-100 disabled:opacity-50"
                      }
                    >
                      <span>{col.name}</span>
                      {isCurrent ? (
                        <span className="text-xs text-neutral-500">Here now</span>
                      ) : blocked ? (
                        <span className="text-xs">No matching status</span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : (
          <p className="p-4 text-xs text-neutral-500">You can read this card but not change it.</p>
        )}
      </div>
    </div>
  );
}
