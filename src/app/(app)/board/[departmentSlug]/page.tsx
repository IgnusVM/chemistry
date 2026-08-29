import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { requireCurrentUser, hasDepartmentAccess } from "@/lib/dal";
import { getDepartmentBoard } from "@/lib/board";
import { BoardViewGrid } from "../board-view";

export default async function DepartmentBoardPage({
  params,
}: {
  params: Promise<{ departmentSlug: string }>;
}) {
  await requireCurrentUser();
  const { departmentSlug } = await params;

  // Reads are org-wide (FR-002) -- no department filter here. Write access is
  // resolved separately, purely to decide what the interface offers.
  const board = await getDepartmentBoard(departmentSlug);
  if (!board) notFound();

  const canWrite = board.owner.active && (await hasDepartmentAccess(board.owner.id, "MEMBER"));

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
        <h1 className="mt-1 text-lg font-semibold text-neutral-900">{board.owner.name}</h1>
        <p className="text-sm text-neutral-500">What&rsquo;s happening, who&rsquo;s got it, and what&rsquo;s stuck.</p>
      </div>

      <BoardViewGrid board={board} canWrite={canWrite} />
    </div>
  );
}
