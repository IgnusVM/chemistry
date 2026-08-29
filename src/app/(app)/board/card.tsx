import { ClipboardList, UserRound, CalendarClock, ArrowRight } from "lucide-react";
import type { BoardCard } from "@/lib/board";
import { TagChip } from "./tag-chip";

function dueLabel(due: Date) {
  const days = Math.ceil((new Date(due).getTime() - Date.now()) / 86_400_000);
  if (days < 0) return { text: `${Math.abs(days)}d overdue`, urgent: true };
  if (days === 0) return { text: "Due today", urgent: true };
  if (days === 1) return { text: "Due tomorrow", urgent: false };
  return { text: `Due in ${days}d`, urgent: false };
}

/**
 * One card, as seen without opening it.
 *
 * The three things visible here are the three questions the board exists to
 * answer: what it is, who has it, and what happens next (FR-012). Everything
 * else lives behind a tap.
 *
 * An unowned card is shown as explicitly unowned rather than as blank space
 * (FR-013) — a card in progress with nobody on it is the single most useful
 * thing a board can surface, and blank reads as "not filled in yet".
 *
 * Presentational only, and deliberately contains no links: the whole card is a
 * tap target that opens the sheet, and a link inside it would be a nested
 * interactive element that swallows the tap on a phone. The work order link
 * lives in the sheet instead.
 */
export function BoardCardView({ card }: { card: BoardCard }) {
  const due = card.dueDate ? dueLabel(card.dueDate) : null;

  return (
    <article className="rounded-lg border border-neutral-200 bg-white p-3 text-left shadow-sm">
      {card.workOrder ? (
        <span className="mb-1.5 inline-flex items-center gap-1 rounded border border-sky-200 bg-sky-50 px-1.5 py-0.5 text-[11px] font-medium text-sky-700">
          <ClipboardList className="h-3 w-3" aria-hidden />
          {card.workOrder.code}
        </span>
      ) : null}

      <h3 className="text-sm leading-snug font-medium text-neutral-900">{card.title}</h3>

      {card.tags.length > 0 ? (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {card.tags.map((t) => (
            <TagChip key={t.id} tag={t} />
          ))}
        </div>
      ) : null}

      {card.nextAction ? (
        <p className="mt-1.5 flex items-start gap-1 text-xs text-neutral-600">
          <ArrowRight className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
          <span className="min-w-0">{card.nextAction}</span>
        </p>
      ) : null}

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        {card.owner ? (
          <span className="inline-flex items-center gap-1 text-neutral-600">
            <UserRound className="h-3 w-3" aria-hidden />
            {card.owner.displayName}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 font-medium text-amber-700">
            <UserRound className="h-3 w-3" aria-hidden />
            Nobody yet
          </span>
        )}

        {due ? (
          <span
            className={
              due.urgent
                ? "inline-flex items-center gap-1 font-medium text-rose-700"
                : "inline-flex items-center gap-1 text-neutral-500"
            }
          >
            <CalendarClock className="h-3 w-3" aria-hidden />
            {due.text}
          </span>
        ) : null}
      </div>
    </article>
  );
}
