import "server-only";
import type { WorkOrderStatus } from "@/generated/prisma/client";
import { WO_STATUSES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

/**
 * The single home for the status-to-column mapping.
 *
 * This mapping is consulted by three separate places — the board reader, the
 * move action, and the work order path — and a second copy is exactly how the
 * two would drift apart. Everything that needs to know where a work order
 * belongs asks here.
 *
 * See specs/001-kanban-board/research.md D1 and D2 for why a work-order-backed
 * card derives its column instead of storing one.
 */

/** The subset of a BoardColumn this module needs. Keeps callers free to select. */
export type ColumnMapping = {
  id: string;
  name: string;
  position: number;
  woStatusOnMove: WorkOrderStatus | null;
  woStatusesShown: WorkOrderStatus[];
};

export class BoardInvariantError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BoardInvariantError";
  }
}

/**
 * Every WorkOrderStatus must appear in exactly one column's `woStatusesShown`.
 *
 * A status in zero columns makes those work orders invisible on the board; a
 * status in two columns puts the same card in two places. Both are worse than
 * refusing the configuration that would cause them, which is why this throws
 * rather than warning.
 *
 * Called on every column-configuration write, and by the board reader so a
 * board that somehow reached an invalid state fails loudly instead of quietly
 * losing cards.
 */
export function assertBoardInvariant(columns: ColumnMapping[]): void {
  const seen = new Map<WorkOrderStatus, string[]>();
  for (const col of columns) {
    for (const status of col.woStatusesShown) {
      seen.set(status, [...(seen.get(status) ?? []), col.name]);
    }
  }

  const missing = WO_STATUSES.filter((s) => !seen.has(s));
  const duplicated = [...seen.entries()].filter(([, cols]) => cols.length > 1);

  if (missing.length === 0 && duplicated.length === 0) return;

  const problems: string[] = [];
  if (missing.length > 0) {
    problems.push(
      `${missing.join(", ")} would not appear in any column, so work orders in ${missing.length === 1 ? "that status" : "those statuses"} would be invisible on the board.`,
    );
  }
  for (const [status, cols] of duplicated) {
    problems.push(`${status} appears in both ${cols.join(" and ")}, so its card would show twice.`);
  }
  throw new BoardInvariantError(problems.join(" "));
}

/**
 * Which column a work order in this status belongs to.
 *
 * Returns null only when the invariant is broken, which `assertBoardInvariant`
 * exists to prevent — callers should treat null as a bug rather than a case to
 * handle gracefully.
 */
export function columnForStatus(
  columns: ColumnMapping[],
  status: WorkOrderStatus,
): ColumnMapping | null {
  return columns.find((c) => c.woStatusesShown.includes(status)) ?? null;
}

/**
 * Whether a work-order-backed card may be moved into this column, and to what.
 *
 * A column with no `woStatusOnMove` refuses work-order cards entirely — moving
 * one there would leave the card somewhere its work order's status does not
 * correspond to, which is precisely the lie the derived-column design exists
 * to prevent (FR-021).
 */
export function statusForMoveInto(column: ColumnMapping): WorkOrderStatus | null {
  return column.woStatusOnMove;
}

/** Human-readable refusal, so the interface never has to compose this itself. */
export function unmappedColumnMessage(column: ColumnMapping): string {
  return `"${column.name}" doesn't correspond to a work order status, so this card can't move there. Change the work order instead, or move it to a column that maps to a status.`;
}

// ---------------------------------------------------------------------------
// Reading a board
// ---------------------------------------------------------------------------

export type BoardCard = {
  id: string;
  title: string;
  nextAction: string | null;
  dueDate: Date | null;
  statusNotes: string | null;
  owner: { id: string; displayName: string } | null;
  /** Set when this card is a view onto a work order. */
  workOrder: { id: string; code: string; status: WorkOrderStatus } | null;
  archivedAt: Date | null;
  updatedAt: Date;
};

export type BoardColumnView = ColumnMapping & { color: string | null; cards: BoardCard[] };

export type BoardView = {
  department: { id: string; name: string; slug: string; active: boolean };
  boardId: string;
  columns: BoardColumnView[];
};

const CARD_SELECT = {
  id: true,
  title: true,
  nextAction: true,
  dueDate: true,
  statusNotes: true,
  columnId: true,
  position: true,
  archivedAt: true,
  updatedAt: true,
  owner: { select: { id: true, displayName: true } },
} as const;

/**
 * The board, as rendered.
 *
 * Reads are org-wide by design (FR-002) — any signed-in user may look at any
 * department's board. Authorization applies to writes, per record, elsewhere.
 *
 * Returns null when the slug matches no department, so the caller can 404
 * rather than render an empty board that looks broken.
 */
export async function getBoardView(departmentSlug: string): Promise<BoardView | null> {
  const department = await prisma.department.findUnique({
    where: { slug: departmentSlug },
    select: { id: true, name: true, slug: true, active: true, board: { select: { id: true } } },
  });
  if (!department?.board) return null;

  const columns = await prisma.boardColumn.findMany({
    where: { boardId: department.board.id },
    orderBy: { position: "asc" },
    select: {
      id: true,
      name: true,
      position: true,
      color: true,
      woStatusOnMove: true,
      woStatusesShown: true,
    },
  });

  // Fail loudly if a board reached an invalid configuration, rather than
  // silently dropping the cards whose status maps nowhere.
  assertBoardInvariant(columns);

  const cards = await prisma.card.findMany({
    where: { boardId: department.board.id, archivedAt: null, workOrderId: null },
    orderBy: [{ position: "asc" }, { id: "asc" }],
    select: CARD_SELECT,
  });

  const byColumn = new Map<string, BoardCard[]>();
  for (const c of cards) {
    if (!c.columnId) continue;
    const view: BoardCard = { ...c, workOrder: null };
    byColumn.set(c.columnId, [...(byColumn.get(c.columnId) ?? []), view]);
  }

  return {
    department: {
      id: department.id,
      name: department.name,
      slug: department.slug,
      active: department.active,
    },
    boardId: department.board.id,
    columns: columns.map((col) => ({ ...col, cards: byColumn.get(col.id) ?? [] })),
  };
}

/**
 * Which department boards to offer this user.
 *
 * Reads are org-wide, so this is about usefulness rather than permission: put
 * the departments they actually belong to first, and let them reach the rest.
 * The full roll-up with cards is a later story.
 */
export async function listBoardsForUser(accessibleDepartmentIds: string[]) {
  const departments = await prisma.department.findMany({
    where: { board: { isNot: null } },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      active: true,
      division: { select: { name: true } },
      _count: { select: { workOrders: true } },
    },
  });
  const mine = new Set(accessibleDepartmentIds);
  return {
    mine: departments.filter((d) => mine.has(d.id)),
    others: departments.filter((d) => !mine.has(d.id)),
  };
}
