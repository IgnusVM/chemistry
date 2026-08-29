import { requireOrgAdmin } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { BoardColumnEditor } from "./column-editor";

export default async function BoardColumnsAdminPage() {
  await requireOrgAdmin();

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
        <h1 className="text-lg font-semibold text-neutral-900">Board columns</h1>
        <p className="text-sm text-neutral-500">
          Each board ships with working defaults, so this is only here if you want to change them.
          Every work order status has to appear in exactly one column — otherwise a work order&rsquo;s
          card would be either invisible or in two places at once, so configurations that would do
          that are refused.
        </p>
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
