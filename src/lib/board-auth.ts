import "server-only";
import { prisma } from "@/lib/prisma";
import { hasDepartmentAccess, type DepartmentAccessLevel } from "@/lib/dal";

/**
 * Authorization for board mutations.
 *
 * Deliberately NOT in `board/actions.ts`. Every export from a `"use server"`
 * file is a callable endpoint, so an exported auth helper there would be a
 * publicly invokable function whose whole job is to decide access. The
 * existing `requireWorkOrderAccess` avoids that by staying private to its
 * module; this lives in `lib/` instead so the board actions and any future
 * caller share one implementation without exposing it.
 *
 * The rule these enforce (Constitution Principle II): the department is
 * resolved from the STORED RECORD, never from the request. A board or card id
 * arriving in a form field is caller-supplied and proves nothing.
 */

export class BoardAccessError extends Error {
  constructor(message = "You don't have permission to change this board.") {
    super(message);
    this.name = "BoardAccessError";
  }
}

/** Resolve a board's department from storage and check access against it. */
export async function requireBoardAccess(
  boardId: string,
  minRole: DepartmentAccessLevel = "MEMBER",
) {
  const board = await prisma.board.findUnique({
    where: { id: boardId },
    select: { id: true, departmentId: true, department: { select: { active: true, name: true } } },
  });
  if (!board) throw new BoardAccessError("That board no longer exists.");

  // A deactivated department's board is read-only rather than gone (FR-031),
  // so reads still work and writes stop here.
  if (!board.department.active) {
    throw new BoardAccessError(`${board.department.name} is deactivated, so its board is read-only.`);
  }

  if (!(await hasDepartmentAccess(board.departmentId, minRole))) throw new BoardAccessError();
  return board;
}

/**
 * Same, reached through a card.
 *
 * Returns the work order id when the card is work-order-backed, because the
 * caller must then authorize against the WORK ORDER rather than the board —
 * moving such a card is a status change, not a card write (research.md D1).
 * Board access alone is not sufficient for it.
 */
export async function requireCardAccess(
  cardId: string,
  minRole: DepartmentAccessLevel = "MEMBER",
) {
  const card = await prisma.card.findUnique({
    where: { id: cardId },
    select: { id: true, boardId: true, columnId: true, workOrderId: true, updatedAt: true },
  });
  if (!card) throw new BoardAccessError("That card no longer exists.");

  await requireBoardAccess(card.boardId, minRole);
  return card;
}
