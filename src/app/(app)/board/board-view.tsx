"use client";

import { useState, useRef, useOptimistic, useTransition } from "react";
import { Lock, Rows3, Rows4, AlertTriangle } from "lucide-react";
import Link from "next/link";
import type { BoardView, BoardCard, CardTagView } from "@/lib/board";
import { BoardCardView } from "./card";
import { NewCardForm } from "./new-card-form";
import { CardSheet } from "./card-sheet";
import { TagFilter } from "./tag-filter";
import { moveCard } from "./actions";
import { DENSITY_COOKIE, type Density } from "./density";
import { useCardDrag, type DragPayload } from "./use-card-drag";

type Columns = BoardView["columns"];

/**
 * Move a card between columns for the optimistic render. Pure — the server
 * action remains the only thing that actually moves anything.
 */
function applyMove(cols: Columns, mv: { cardId: string; toColumnId: string }): Columns {
  let moved: BoardCard | undefined;
  const without = cols.map((c) => {
    const hit = c.cards.find((x) => x.id === mv.cardId);
    if (!hit) return c;
    moved = hit;
    return { ...c, cards: c.cards.filter((x) => x.id !== mv.cardId) };
  });
  if (!moved) return cols;
  const card = moved;
  return without.map((c) => (c.id === mv.toColumnId ? { ...c, cards: [card, ...c.cards] } : c));
}

/**
 * Column accent colours, resolved as Tailwind classes rather than raw hex so
 * they hold up in both themes. `color` on a column is a token name, not a
 * value — a stored hex would be right in one theme and wrong in the other.
 */
const ACCENT: Record<string, string> = {
  slate: "bg-slate-400",
  stone: "bg-stone-400",
  red: "bg-red-400",
  orange: "bg-orange-400",
  amber: "bg-amber-400",
  lime: "bg-lime-400",
  emerald: "bg-emerald-400",
  teal: "bg-teal-400",
  cyan: "bg-cyan-400",
  sky: "bg-sky-400",
  blue: "bg-blue-400",
  indigo: "bg-indigo-400",
  violet: "bg-violet-400",
  purple: "bg-purple-400",
  pink: "bg-pink-400",
  rose: "bg-rose-400",
};

/**
 * The board.
 *
 * Phone-first: columns scroll horizontally and each is sized so the next one
 * peeks in, which is what tells a thumb there is more to the right without
 * needing a scrollbar. Column headers stay visible while their cards scroll
 * vertically, so a reader never loses track of which state they are reading
 * (SC-001).
 *
 * A card can be moved two ways: dragged to another column, or tapped open and
 * moved from the sheet. Drag was added later; two taps remains the path that
 * works in gloves and the only one available from a keyboard, so it is not a
 * fallback — see the note on dragging below and research.md D3.
 */
export function BoardViewGrid({
  board,
  canWrite,
  tags,
  activeTagId,
  showAllDone,
  initialDensity = "comfortable",
}: {
  board: BoardView;
  canWrite: boolean;
  tags: CardTagView[];
  activeTagId?: string;
  showAllDone?: boolean;
  initialDensity?: Density;
}) {
  const [selected, setSelected] = useState<{ card: BoardCard; columnId: string } | null>(null);
  // Seeded from the server-read cookie, so the first paint is already right.
  // Toggling updates state immediately and writes the cookie for next time --
  // no round trip, no flash.
  const [density, setDensity] = useState<Density>(initialDensity);

  function toggleDensity() {
    const next: Density = density === "compact" ? "comfortable" : "compact";
    setDensity(next);
    // One year; it is a display preference, not a session thing.
    document.cookie = `${DENSITY_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
  }

  const columnChoices = board.columns.map((c) => ({
    id: c.id,
    name: c.name,
    acceptsWorkOrderCards: c.woStatusOnMove !== null,
  }));

  // --- dragging -------------------------------------------------------------
  //
  // Drag is an ADDITION, not a replacement. Two taps stays — it is the only
  // thing that works reliably in gloves, and it is the keyboard/screen-reader
  // path too. Drag is built on Pointer Events rather than HTML5 drag-and-drop
  // precisely because HTML5 drag never fires on touch, and this has to work on
  // a phone.
  //
  // On touch it takes a short press to start, so a finger dragged across a
  // card still scrolls the board instead of picking the card up. See
  // `use-card-drag.ts`.
  //
  // Both paths call the same `moveCard`, so a work-order-backed card still
  // moves by changing its work order's status, with the same authorization.
  const [optimisticColumns, applyOptimistic] = useOptimistic(board.columns, applyMove);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Takes the dragged card rather than reading it from state, so the hook can
  // ask this question mid-gesture without the two holding separate copies of
  // what is being dragged.
  function canDropInto(columnId: string, dragged: DragPayload) {
    if (!canWrite) return false;
    if (dragged.fromColumnId === columnId) return false;
    const target = columnChoices.find((c) => c.id === columnId);
    if (!target) return false;
    // Same refusal the sheet makes: a ticket cannot sit in a column that
    // corresponds to no work order status.
    return !dragged.hasWorkOrder || target.acceptsWorkOrderCards;
  }

  function performMove(cardId: string, toColumnId: string, updatedAt: string | Date) {
    setMoveError(null);
    startTransition(async () => {
      applyOptimistic({ cardId, toColumnId });
      const fd = new FormData();
      fd.set("cardId", cardId);
      fd.set("toColumnId", toColumnId);
      fd.set("expectedUpdatedAt", new Date(updatedAt).toISOString());
      const res = await moveCard(undefined, fd);
      // React drops the optimistic value on its own when the transition
      // settles, so the card springs back for free — but silently. The message
      // is what makes that honest rather than looking like a broken app.
      if (res?.error) setMoveError(res.error);
    });
  }

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const cardDrag = useCardDrag({
    enabled: canWrite,
    canDropInto,
    onDrop: (p, toColumnId) => performMove(p.cardId, toColumnId, p.updatedAt),
    onRefused: (p, toColumnId) => {
      const col = columnChoices.find((c) => c.id === toColumnId);
      setMoveError(
        p.hasWorkOrder && col && !col.acceptsWorkOrderCards
          ? `This card is work order work, and "${col.name}" has no work order status behind it. Pick a column that does, or change the columns under Admin.`
          : "That card can't go there.",
      );
    },
    scrollRef,
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <TagFilter tags={tags} activeTagId={activeTagId} />
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleDensity}
            aria-pressed={density === "compact"}
            className="inline-flex items-center gap-1.5 rounded-md border border-neutral-200 bg-white px-2 py-1 text-xs text-neutral-600 hover:bg-neutral-100"
          >
            {density === "compact" ? (
              <Rows3 className="h-3.5 w-3.5" aria-hidden />
            ) : (
              <Rows4 className="h-3.5 w-3.5" aria-hidden />
            )}
            {density === "compact" ? "Comfortable" : "Compact"}
          </button>
          <Link
            href={showAllDone ? "?" : "?done=all"}
            className="text-xs text-neutral-500 underline-offset-2 hover:text-neutral-900 hover:underline"
          >
            {showAllDone ? "Hide older done" : "Show all done"}
          </Link>
        </div>
      </div>

      {!board.owner.active ? (
        <p className="inline-flex items-center gap-1.5 rounded-md border border-neutral-200 bg-neutral-50 px-2.5 py-1.5 text-xs text-neutral-600">
          <Lock className="h-3.5 w-3.5" aria-hidden />
          {board.owner.name} is deactivated — this board is read-only.
        </p>
      ) : null}

      {/* items-stretch keeps columns equal height so horizontal scrolling reads
          as a board rather than a row of ragged boxes, and leaves each column
          somewhere to put a card when there is only one. */}
      {moveError ? (
        <p className="flex items-start gap-1.5 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>{moveError}</span>
        </p>
      ) : null}

      <div
        ref={scrollRef}
        // Snapping fights a drag that is auto-scrolling toward a column, so it
        // is suspended for the duration and restored on drop.
        className={`-mx-4 flex items-stretch gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0 ${
          cardDrag.active ? "" : "snap-x snap-mandatory"
        }`}
      >
        {optimisticColumns.map((col) => {
          const isOver = cardDrag.overColumnId === col.id;
          const droppable = cardDrag.active ? canDropInto(col.id, cardDrag.active) : false;
          return (
          <section
            key={col.id}
            data-column-id={col.id}
            // Phone: fixed width so the next column peeks in and a thumb knows
            // to swipe. Desktop: share the row equally, so a five-column board
            // fits on screen with no horizontal scrolling at all. min-w keeps
            // a board with many columns from squeezing cards unreadable.
            //
            // The height is CAPPED, not just floored. Previously only min-height
            // was set, so a column with 23 cards grew to 2400px and the page
            // scrolled instead of the column — which defeats the point, because
            // scrolling one column dragged every other column off screen too.
            // Bounded here, the list's own overflow-y finally has something to
            // scroll against. dvh so mobile browser chrome doesn't cut it off.
            className={`flex h-[calc(100dvh-18rem)] max-h-[calc(100dvh-18rem)] min-h-[20rem] w-[78vw] shrink-0 snap-start flex-col rounded-xl border bg-neutral-50 transition-colors sm:h-[calc(100dvh-14rem)] sm:max-h-[calc(100dvh-14rem)] sm:w-72 lg:w-auto lg:min-w-[15rem] lg:flex-1 lg:shrink ${
              isOver && droppable
                ? "border-fuchsia-400 bg-fuchsia-50"
                : isOver && cardDrag.active
                  ? "border-neutral-300 opacity-60"
                  : "border-neutral-200"
            }`}
            aria-label={col.name}
          >
            <header className="sticky top-0 z-10 flex items-center gap-2 rounded-t-xl border-b border-neutral-200 bg-neutral-50 px-3 py-2">
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${ACCENT[col.color ?? ""] ?? "bg-neutral-400"}`}
                aria-hidden
              />
              <h2 className="min-w-0 truncate text-sm font-semibold text-neutral-900">{col.name}</h2>
              <span className="ml-auto shrink-0 rounded-full bg-neutral-200 px-2 py-0.5 text-xs font-medium text-neutral-700 tabular-nums">
                {col.cards.length}
              </span>
            </header>

            <div className={`flex flex-1 flex-col overflow-y-auto ${density === "compact" ? "gap-1 px-3 py-1.5" : "gap-2 px-3 py-2"}`}>
              {col.cards.length === 0 ? (
                <p className="py-3 text-xs text-neutral-400">Nothing here.</p>
              ) : (
                col.cards.map((card) => (
                  <button
                    key={card.id}
                    type="button"
                    onPointerDown={(e) =>
                      cardDrag.onPointerDown(e, {
                        cardId: card.id,
                        fromColumnId: col.id,
                        hasWorkOrder: Boolean(card.workOrder),
                        updatedAt: card.updatedAt,
                        title: card.title,
                      })
                    }
                    // A drag that ends on the card it started from would
                    // otherwise open the sheet on the way out.
                    onClick={() => {
                      if (cardDrag.didDrag()) return;
                      setSelected({ card, columnId: col.id });
                    }}
                    draggable={false}
                    onDragStart={(e) => e.preventDefault()}
                    className={`touch-manipulation rounded-lg text-left select-none focus:ring-2 focus:ring-neutral-400 focus:outline-none ${
                      canWrite ? "cursor-grab active:cursor-grabbing" : ""
                    } ${cardDrag.active?.cardId === card.id ? "opacity-40" : ""}`}
                  >
                    <BoardCardView card={card} density={density} />
                  </button>
                ))
              )}
            </div>

            {/* Capture sits at the bottom of the column it adds to, so the
                column is both where you read and where you write. */}
            {canWrite ? <NewCardForm boardId={board.boardId} columnId={col.id} /> : null}
          </section>
          );
        })}
      </div>

      {/* The card under the finger. Fixed and pointer-events:none so it never
          intercepts the hit-test that decides which column it is over. */}
      {cardDrag.active && cardDrag.point ? (
        <div
          className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-1/2 rotate-2 opacity-90"
          style={{ left: cardDrag.point.x, top: cardDrag.point.y, width: cardDrag.active.width }}
        >
          <div className="rounded-lg border border-fuchsia-300 bg-white p-3 text-sm font-medium text-neutral-900 shadow-lg">
            {cardDrag.active.title}
          </div>
        </div>
      ) : null}

      {!canWrite && board.owner.active ? (
        <p className="text-xs text-neutral-500">
          {board.owner.kind === "division"
            ? `You can read this board. Adding and moving cards is for the ${board.owner.name} lead.`
            : `You can read this board. Adding and moving cards needs membership of ${board.owner.name}.`}
        </p>
      ) : null}

      {selected ? (
        <CardSheet
          card={selected.card}
          columns={columnChoices}
          currentColumnId={selected.columnId}
          canWrite={canWrite}
          allTags={tags}
          onClose={() => setSelected(null)}
        />
      ) : null}
    </div>
  );
}
