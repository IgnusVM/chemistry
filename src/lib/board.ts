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

export type CardTagView = { id: string; name: string; color: string | null };

export type BoardCard = {
  id: string;
  title: string;
  tags: CardTagView[];
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

/** A board belongs to exactly one owner, of one of two kinds. */
export type BoardOwner = {
  kind: "department" | "division";
  id: string;
  name: string;
  slug: string;
  active: boolean;
};

export type BoardView = {
  owner: BoardOwner;
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
  tags: { select: { tag: { select: { id: true, name: true, color: true } } } },
} as const;

/** Flatten the join rows the board actually renders. */
type WithTagRows = { tags: { tag: CardTagView }[] };
const flattenTags = <T extends WithTagRows>(c: T) => ({ ...c, tags: c.tags.map((t) => t.tag) });

/**
 * How far back a terminal work order stays on the active board.
 *
 * Recently finished work is the useful part -- "what did we get done this
 * week" is a real question -- while an unbounded Done column buries the rest
 * of the board (FR-030, research.md D7).
 */
export const DONE_WINDOW_DAYS = 30;

/** Shared: everything after we know which board we are looking at. */
async function loadBoard(
  boardId: string,
  owner: BoardOwner,
  opts: { showAllDone?: boolean; tagId?: string } = {},
): Promise<BoardView> {
  const columns = await prisma.boardColumn.findMany({
    where: { boardId },
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

  const byColumn = new Map<string, BoardCard[]>();
  const push = (columnId: string, card: BoardCard) =>
    byColumn.set(columnId, [...(byColumn.get(columnId) ?? []), card]);

  // 1. Standalone cards, placed by their stored columnId.
  const tagFilter = opts.tagId ? { tags: { some: { tagId: opts.tagId } } } : {};

  const standalone = await prisma.card.findMany({
    where: { boardId, archivedAt: null, workOrderId: null, ...tagFilter },
    orderBy: [{ position: "asc" }, { id: "asc" }],
    select: CARD_SELECT,
  });
  for (const c of standalone) {
    if (!c.columnId) continue;
    push(c.columnId, { ...flattenTags(c), workOrder: null });
  }

  // 2. Work-order-backed cards, placed by DERIVING the column from the work
  //    order's status. Nothing here reads a stored columnId, which is what
  //    makes card position and status incapable of disagreeing (D1).
  const woCards = await prisma.card.findMany({
    where: { boardId, workOrderId: { not: null }, ...tagFilter },
    orderBy: [{ workOrder: { priority: "desc" } }, { workOrder: { reportedAt: "asc" } }],
    select: {
      ...CARD_SELECT,
      workOrder: {
        select: { id: true, code: true, status: true, closedAt: true, completedAt: true },
      },
    },
  });

  const cutoff = new Date(Date.now() - DONE_WINDOW_DAYS * 86_400_000);
  for (const c of woCards) {
    if (!c.workOrder) continue;
    const column = columnForStatus(columns, c.workOrder.status);
    // assertBoardInvariant above guarantees a column exists for every status.
    if (!column) continue;

    // Terminal work orders age out of the active view but are never deleted.
    if (!opts.showAllDone && TERMINAL_LIKE.includes(c.workOrder.status)) {
      const finished = c.workOrder.closedAt ?? c.workOrder.completedAt ?? c.updatedAt;
      if (finished < cutoff) continue;
    }

    push(column.id, {
      ...flattenTags(c),
      workOrder: { id: c.workOrder.id, code: c.workOrder.code, status: c.workOrder.status },
    });
  }

  return {
    owner,
    boardId,
    columns: columns.map((col) => ({ ...col, cards: byColumn.get(col.id) ?? [] })),
  };
}

/** Statuses whose cards age out of the active board (D7). */
const TERMINAL_LIKE: WorkOrderStatus[] = ["COMPLETE", "CLOSED", "CANCELLED"];

/**
 * A department's board.
 *
 * Reads are org-wide (FR-002) — any signed-in user may look at any department's
 * board. Authorization applies to writes, per record, elsewhere.
 *
 * Returns null when the slug matches no department, so the caller can 404
 * rather than render an empty board that looks broken.
 */
export async function getDepartmentBoard(
  slug: string,
  opts: { showAllDone?: boolean; tagId?: string } = {},
): Promise<BoardView | null> {
  const department = await prisma.department.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true, active: true, board: { select: { id: true } } },
  });
  if (!department?.board) return null;
  return loadBoard(
    department.board.id,
    {
      kind: "department",
      id: department.id,
      name: department.name,
      slug: department.slug,
      active: department.active,
    },
    opts,
  );
}

/**
 * A division's board.
 *
 * **Restricted read.** The caller MUST check `canViewDivisionBoard` first —
 * this function does not, so that the permission decision stays in the one
 * named place the amended Principle II requires rather than being duplicated
 * here and drifting.
 */
export async function getDivisionBoard(
  slug: string,
  opts: { showAllDone?: boolean; tagId?: string } = {},
): Promise<BoardView | null> {
  const division = await prisma.division.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true, active: true, board: { select: { id: true } } },
  });
  if (!division?.board) return null;
  return loadBoard(
    division.board.id,
    {
      kind: "division",
      id: division.id,
      name: division.name,
      slug: division.slug,
      active: division.active,
    },
    opts,
  );
}

/**
 * Which department boards to offer this user.
 *
 * Reads are org-wide, so this is about usefulness rather than permission: put
 * the departments they actually belong to first, and let them reach the rest.
 * The full roll-up with cards is a later story.
 */
export async function listBoardsForUser(
  accessibleDepartmentIds: string[],
  visibleDivisionIds: string[],
) {
  const departments = await prisma.department.findMany({
    where: { board: { isNot: null } },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      active: true,
      division: { select: { name: true } },
    },
  });

  // Division boards are filtered by the caller-supplied visible set rather
  // than listed and hidden in the interface — an unlisted board must be
  // genuinely unreachable, not merely unlinked.
  const divisions = await prisma.division.findMany({
    where: { board: { isNot: null }, id: { in: visibleDivisionIds } },
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true, active: true },
  });

  const mine = new Set(accessibleDepartmentIds);
  return {
    divisions,
    mine: departments.filter((d) => mine.has(d.id)),
    others: departments.filter((d) => !mine.has(d.id)),
  };
}

/** Every tag, for the filter control and the card editor. */
export async function listTags(): Promise<CardTagView[]> {
  return prisma.tag.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, color: true } });
}
