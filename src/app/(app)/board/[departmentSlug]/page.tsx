import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { ChevronLeft } from "lucide-react";
import { requireCurrentUser, hasDepartmentAccess } from "@/lib/dal";
import { getDepartmentBoard, listTags } from "@/lib/board";
import { DENSITY_COOKIE, parseDensity } from "../density";
import { BoardViewGrid } from "../board-view";
import { HelpLink } from "@/components/help-link";

export default async function DepartmentBoardPage({
  params,
  searchParams,
}: {
  params: Promise<{ departmentSlug: string }>;
  searchParams: Promise<{ tag?: string; done?: string }>;
}) {
  await requireCurrentUser();
  const { departmentSlug } = await params;
  const { tag, done } = await searchParams;
  const density = parseDensity((await cookies()).get(DENSITY_COOKIE)?.value);

  // Reads are org-wide (FR-002) -- no department filter here. Write access is
  // resolved separately, purely to decide what the interface offers.
  const [board, tags] = await Promise.all([
    getDepartmentBoard(departmentSlug, { tagId: tag, showAllDone: done === "all" }),
    listTags(),
  ]);
  if (!board) notFound();

  const canWrite = board.owner.active && (await hasDepartmentAccess(board.owner.id, "MEMBER"));

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
        <div className="mt-1 flex items-center gap-1">
          <h1 className="text-lg font-semibold text-neutral-900">{board.owner.name}</h1>
          <HelpLink topic="The board" article="board/what-the-board-is" />
        </div>
      </div>

      <BoardViewGrid board={board} canWrite={canWrite} tags={tags} activeTagId={tag} showAllDone={done === "all"} initialDensity={density} />
    </div>
  );
}
