import { requireOrgAdminPage } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { BoardColumnEditor } from "./column-editor";
import { HelpLink } from "@/components/help-link";

export default async function BoardColumnsAdminPage() {
  await requireOrgAdminPage();

  const boards = await prisma.board.findMany({
    select: {
      id: true,
      department: { select: { name: true } },
      division: { select: { name: true } },
      columns: {
        orderBy: { position: "asc" },
        select: {
          id: true,
          name: true,
          color: true,
          position: true,
          woStatusOnMove: true,
          woStatusesShown: true,
          _count: { select: { cards: true } },
        },
      },
    },
  });

  const named = boards
    .map((b) => ({ ...b, label: b.department?.name ?? b.division?.name ?? "Unowned", isDivision: !!b.division }))
    .sort((a, b) => a.label.localeCompare(b.label));

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-1">
          <h1 className="text-lg font-semibold text-neutral-900">Kanban columns</h1>
          <HelpLink topic="Kanban columns" article="board/board-columns-admin" />
        </div>
      </div>

      {named.map((b) => (
        <BoardColumnEditor
          key={b.id}
          boardId={b.id}
          label={b.label}
          isDivision={b.isDivision}
          columns={b.columns}
        />
      ))}
    </div>
  );
}
