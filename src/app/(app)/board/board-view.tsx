"use client";

import { useState } from "react";
import { Lock, Rows3, Rows4 } from "lucide-react";
import Link from "next/link";
import type { BoardView, BoardCard, CardTagView } from "@/lib/board";
import { BoardCardView } from "./card";
import { NewCardForm } from "./new-card-form";
import { CardSheet } from "./card-sheet";
import { TagFilter } from "./tag-filter";
import { DENSITY_COOKIE, type Density } from "./density";

/**
 * Column accent colours, resolved as Tailwind classes rather than raw hex so
 * they hold up in both themes. `color` on a column is a token name, not a
 * value — a stored hex would be right in one theme and wrong in the other.
 */
const ACCENT: Record<string, string> = {
  slate: "bg-slate-400",
  sky: "bg-sky-400",
  amber: "bg-amber-400",
  rose: "bg-rose-400",
  emerald: "bg-emerald-400",
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
 * Tapping a card opens the sheet, which is also where moving happens — two
 * taps, no drag (research.md D3).
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
      <div className="-mx-4 flex snap-x snap-mandatory items-stretch gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
        {board.columns.map((col) => (
          <section
            key={col.id}
            // Phone: fixed width so the next column peeks in and a thumb knows
            // to swipe. Desktop: share the row equally, so a five-column board
            // fits on screen with no horizontal scrolling at all. min-w keeps
            // a board with many columns from squeezing cards unreadable.
            className="flex min-h-[60vh] w-[78vw] shrink-0 snap-start flex-col rounded-xl border border-neutral-200 bg-neutral-50 sm:min-h-[28rem] sm:w-72 lg:w-auto lg:min-w-[15rem] lg:flex-1 lg:shrink"
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
                    onClick={() => setSelected({ card, columnId: col.id })}
                    className="rounded-lg text-left focus:ring-2 focus:ring-neutral-400 focus:outline-none"
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
        ))}
      </div>

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
