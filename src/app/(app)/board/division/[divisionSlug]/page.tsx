import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Lock } from "lucide-react";
import { requireCurrentUser } from "@/lib/dal";
import { getDivisionBoard, listTags } from "@/lib/board";
import { canViewDivisionBoard } from "@/lib/board-auth";
import { BoardViewGrid } from "../../board-view";

export default async function DivisionBoardPage({
  params,
  searchParams,
}: {
  params: Promise<{ divisionSlug: string }>;
  searchParams: Promise<{ tag?: string; done?: string }>;
}) {
  await requireCurrentUser();
  const { divisionSlug } = await params;
  const { tag, done } = await searchParams;

  const [board, tags] = await Promise.all([
    getDivisionBoard(divisionSlug, { tagId: tag, showAllDone: done === "all" }),
    listTags(),
  ]);
  if (!board) notFound();

  // Restricted read -- the app's only one. 404 rather than 403 so the
  // existence of a division board isn't confirmed to someone who may not see
  // it (constitution Principle II, amended 1.1.0).
  if (!(await canViewDivisionBoard(board.owner.id))) notFound();

  return (
    <div className="space-y-4">
      <div>
        <Link
          href="/board"
          className="inline-flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-900"
        >
          <ChevronLeft className="h-3 w-3" aria-hidden />
          All boards
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <h1 className="text-lg font-semibold text-neutral-900">{board.owner.name}</h1>
          <span className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-700">
            <Lock className="h-3 w-3" aria-hidden />
            Division &middot; leads only
          </span>
        </div>
        <p className="text-sm text-neutral-500">
          Coordination across {board.owner.name}. Only you and org admins can see this.
        </p>
      </div>

      <BoardViewGrid board={board} canWrite={board.owner.active} tags={tags} activeTagId={tag} showAllDone={done === "all"} />
    </div>
  );
}
