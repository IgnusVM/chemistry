import Link from "next/link";
import { cookies } from "next/headers";
import { ChevronLeft, UserRound } from "lucide-react";
import { requireCurrentUser } from "@/lib/dal";
import { getOrCreatePersonalBoard, listTags } from "@/lib/board";
import { DENSITY_COOKIE, parseDensity } from "../density";
import { BoardViewGrid } from "../board-view";
import { HelpLink } from "@/components/help-link";

/**
 * The signed-in person's own kanban.
 *
 * There is no slug and no id in the route on purpose. The board is resolved
 * from the session, so there is nothing in the URL to change in order to reach
 * somebody else's — the strongest form the restriction can take is one where
 * the request carries no target at all.
 */
export default async function PersonalBoardPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string; done?: string }>;
}) {
  await requireCurrentUser();
  const { tag, done } = await searchParams;
  const density = parseDensity((await cookies()).get(DENSITY_COOKIE)?.value);

  const board = await getOrCreatePersonalBoard({ showAllDone: done === "all", tagId: tag });
  if (!board) return null;
  const tags = await listTags();

  return (
    <div className="space-y-4">
      <div>
        <Link
          href="/board"
          className="-my-2 inline-flex items-center gap-1 py-2 text-xs text-neutral-500 hover:text-neutral-900"
        >
          <ChevronLeft className="h-3 w-3" aria-hidden />
          All kanbans
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <h1 className="text-lg font-semibold text-neutral-900">My kanban</h1>
          <span className="inline-flex items-center gap-1 rounded-full border border-fuchsia-200 bg-fuchsia-50 px-2 py-0.5 text-[11px] font-medium text-fuchsia-700">
            <UserRound className="h-3 w-3" aria-hidden />
            Only you
          </span>
          <HelpLink topic="Your personal kanban" article="board/personal-kanban" />
        </div>
      </div>

      <BoardViewGrid
        board={board}
        canWrite
        tags={tags}
        activeTagId={tag}
        showAllDone={done === "all"}
        initialDensity={density}
      />
    </div>
  );
}
