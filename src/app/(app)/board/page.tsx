import Link from "next/link";
import { LayoutGrid, Lock, AlertTriangle, Activity, UserRound } from "lucide-react";
import { requireCurrentUser, getAccessibleDepartmentIds } from "@/lib/dal";
import { listBoardsForUser, getRollup, type RollupCard } from "@/lib/board";
import { visibleDivisionIds } from "@/lib/board-auth";
import { HelpLink } from "@/components/help-link";

/**
 * Board index.
 *
 * A later story turns this into a real roll-up showing cards across
 * departments. For now it is a way in: the boards you belong to first, the
 * rest reachable, because reads are org-wide.
 */
export default async function BoardIndexPage() {
  await requireCurrentUser();
  const accessible = await getAccessibleDepartmentIds("VIEWER");
  const visibleDivisions = await visibleDivisionIds();
  const { divisions, mine, others } = await listBoardsForUser(accessible, visibleDivisions);
  const rollup = await getRollup(accessible, visibleDivisions);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-1">
          <h1 className="text-lg font-semibold text-neutral-900">Boards</h1>
          <HelpLink topic="The board" article="board/what-the-board-is" />
        </div>
      </div>

      {rollup.blocked.length > 0 ? (
        <section className="space-y-2">
          <h2 className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide text-rose-700 uppercase">
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
            Stuck ({rollup.blocked.length})
          </h2>
          <ul className="space-y-1.5">
            {rollup.blocked.map((c) => (
              <RollupRow key={c.id} card={c} tone="blocked" />
            ))}
          </ul>
        </section>
      ) : null}

      {divisions.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">
            Divisions
          </h2>
          {/* A lone division in a two-column grid renders as a half-width card
              with dead space beside it, which reads as a layout that failed
              rather than one item. Give a single item the full width. */}
          <ul className={divisions.length === 1 ? "grid gap-2" : "grid gap-2 sm:grid-cols-2"}>
            {divisions.map((v) => (
              <li key={v.id}>
                <Link
                  href={`/board/division/${v.slug}`}
                  className="flex items-center gap-3 rounded-lg border border-violet-200 bg-violet-50/50 p-3 hover:border-violet-300 hover:bg-violet-50"
                >
                  <Lock className="h-4 w-4 shrink-0 text-violet-400" aria-hidden />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-neutral-900">
                      {v.name}
                      {!v.active ? (
                        <span className="ml-1.5 text-xs font-normal text-neutral-400">(inactive)</span>
                      ) : null}
                    </span>
                    <span className="block truncate text-xs text-violet-700">Leads only</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {mine.length === 0 ? (
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
          <p className="text-sm font-medium text-neutral-900">You&rsquo;re not in a department yet.</p>
          <p className="mt-1 text-sm text-neutral-600">
            Boards belong to departments, so there isn&rsquo;t one that&rsquo;s yours. Ask an org admin to add
            you to yours. You can still read any board below.
          </p>
        </div>
      ) : (
        <section className="space-y-2">
          <h2 className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">Yours</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {mine.map((d) => (
              <BoardLink key={d.id} department={d} />
            ))}
          </ul>
        </section>
      )}

      {others.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">
            Everyone else
          </h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {others.map((d) => (
              <BoardLink key={d.id} department={d} />
            ))}
          </ul>
        </section>
      ) : null}

      {/* In flight sits last, and as tiles rather than rows.
          Stuck stays at the top because it is the thing that needs someone to
          act; in-flight work is context — useful to survey, not to read line by
          line. A grid says "here is the shape of what is happening" at a glance,
          and it takes a fraction of the height that full-width rows did. */}
      {rollup.inFlight.length > 0 ? (
        <section className="space-y-2">
          <h2 className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide text-neutral-500 uppercase">
            <Activity className="h-3.5 w-3.5" aria-hidden />
            In flight ({rollup.inFlight.length})
          </h2>
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-2">
            {rollup.inFlight.map((c) => (
              <RollupTile key={c.id} card={c} />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

/**
 * One in-flight card, as a square tile.
 *
 * Square so the grid reads as a grid at any column count, and small enough that
 * a busy org's worth of active work still fits on one screen. The title gets
 * the room; everything else is a footnote at the bottom of the tile.
 */
function RollupTile({ card }: { card: RollupCard }) {
  return (
    <li>
      <Link
        href={card.boardHref}
        className="flex aspect-square flex-col rounded-lg border border-neutral-200 bg-white p-3 hover:border-neutral-300 hover:bg-neutral-50"
      >
        <span className="truncate text-[11px] font-medium text-neutral-500">{card.boardName}</span>
        <span className="mt-1 line-clamp-3 text-sm leading-snug font-medium text-neutral-900">
          {card.title}
        </span>
        <span className="mt-auto flex flex-col gap-1 pt-2">
          <span className="truncate text-[11px] text-neutral-500">{card.columnName}</span>
          <span
            className={
              card.owner
                ? "inline-flex items-center gap-1 truncate text-[11px] text-neutral-500"
                : "inline-flex w-fit items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-700"
            }
          >
            <UserRound className="h-3 w-3 shrink-0" aria-hidden />
            <span className="truncate">{card.ownerLabel}</span>
          </span>
        </span>
      </Link>
    </li>
  );
}

function BoardLink({
  department,
}: {
  department: { name: string; slug: string; active: boolean; division: { name: string } | null };
}) {
  return (
    <li>
      <Link
        href={`/board/${department.slug}`}
        className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white p-3 hover:border-neutral-300 hover:bg-neutral-50"
      >
        <LayoutGrid className="h-4 w-4 shrink-0 text-neutral-400" aria-hidden />
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-neutral-900">
            {department.name}
            {!department.active ? (
              <span className="ml-1.5 text-xs font-normal text-neutral-400">(inactive)</span>
            ) : null}
          </span>
          {department.division ? (
            <span className="block truncate text-xs text-neutral-500">{department.division.name}</span>
          ) : null}
        </span>
      </Link>
    </li>
  );
}

/**
 * One roll-up row.
 *
 * Every row names its board (FR-005, US5 scenario 3) — an aggregated card with
 * no source is not actionable, because knowing something is stuck is useless
 * without knowing whose it is.
 */
function RollupRow({ card, tone }: { card: RollupCard; tone: "blocked" | "normal" }) {
  return (
    <li>
      <Link
        href={card.boardHref}
        className={
          tone === "blocked"
            ? "block rounded-lg border border-rose-200 bg-rose-50/60 px-4 py-3 hover:bg-rose-50"
            : "block rounded-lg border border-neutral-200 bg-white px-4 py-3 hover:bg-neutral-50"
        }
      >
        {/* Title gets its own line on a phone. Competing with four badges for
            width on a 390px screen truncated it to "TEST- In...", which tells
            the reader nothing -- and the whole point of the roll-up is reading
            it at a glance.

            From sm up there is width to spare, so the row composes across it
            instead: title left, badges right. Stacked at every width left a
            near-empty band on a desktop with everything huddled at one end. */}
        <span className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <span className="text-sm leading-snug font-medium text-neutral-900 sm:min-w-0 sm:truncate">{card.title}</span>
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 sm:shrink-0">
          <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[11px] font-medium text-neutral-600">
            {card.boardName}
          </span>
          <span className="text-[11px] text-neutral-500">{card.columnName}</span>
          <span
            className={
              card.owner
                ? "inline-flex items-center gap-1 text-[11px] text-neutral-500"
                : "inline-flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-700"
            }
          >
            <UserRound className="h-3 w-3" aria-hidden />
            {card.ownerLabel}
          </span>
        </span>
        </span>
      </Link>
    </li>
  );
}
