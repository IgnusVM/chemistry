import { ClipboardList, UserRound, CalendarClock, ArrowRight, Link as LinkIcon } from "lucide-react";
import type { BoardCard } from "@/lib/board";
import type { Density } from "./density";
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
export function BoardCardView({ card, density = "comfortable" }: { card: BoardCard; density?: Density }) {
  const due = card.dueDate ? dueLabel(card.dueDate) : null;

  // Compact: title plus the smallest marks that still answer "who's got it"
  // and "what's stuck". Next action, due text, and tag chips move behind a tap.
  //
  // Tags are dropped rather than shrunk to colour dots, because a dot carries
  // meaning by colour alone and nothing else -- which is exactly what FR-027
  // forbids. Better to show no tag than an unreadable one; the tag filter above
  // still works either way.
  if (density === "compact") {
    return (
      <article className="rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-left shadow-sm">
        <div className="flex items-start gap-1.5">
          <span className="min-w-0 flex-1 text-[13px] leading-snug text-neutral-900">{card.title}</span>
          <span className="mt-0.5 flex shrink-0 items-center gap-1">
            {card.workOrder ? (
              <ClipboardList className="h-3 w-3 text-sky-600" aria-label={`Work order ${card.workOrder.code}`} />
            ) : null}
            {due?.urgent ? (
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500" aria-label={due.text} title={due.text} />
            ) : null}
            {!card.owner ? (
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-label="Nobody assigned" title="Nobody assigned" />
            ) : null}
          </span>
        </div>
      </article>
    );
  }

  return (
    <article className="rounded-lg border border-neutral-200 bg-white p-3 text-left shadow-sm">
      {card.workOrder ? (
        <span className="mb-1.5 inline-flex items-center gap-1 rounded border border-sky-200 bg-sky-50 px-1.5 py-0.5 text-[11px] font-medium text-sky-700">
          <ClipboardList className="h-3 w-3" aria-hidden />
          {card.workOrder.code}
        </span>
      ) : null}

      <h3 className="text-sm leading-snug font-medium text-neutral-900">{card.title}</h3>

      {card.refs.length > 0 ? (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {card.refs.map((r) => (
            <span
              key={r.id}
              // Outlined, not filled: an attached ticket is a REFERENCE. The
              // filled badge above means the card *is* that work order, and
              // conflating the two would misrepresent what moving the card does.
              className="inline-flex items-center gap-1 rounded border border-dashed border-neutral-300 px-1.5 py-0.5 text-[11px] text-neutral-600"
            >
              <LinkIcon className="h-3 w-3" aria-hidden />
              {r.code}
            </span>
          ))}
        </div>
      ) : null}

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
