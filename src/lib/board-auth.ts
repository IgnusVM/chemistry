import "server-only";
import { prisma } from "@/lib/prisma";
import { hasDepartmentAccess, getCurrentUser, type DepartmentAccessLevel } from "@/lib/dal";

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

/**
 * Resolve a board's owner from storage and check write access against it.
 *
 * The two owner kinds have different rules, and the branch is here rather than
 * at call sites so no action has to know which kind it is dealing with:
 *   - department board -> department membership at `minRole`, or org admin
 *   - division board   -> the division lead, or org admin. Same set that may
 *                         read it; there is no one who can see a division
 *                         board but not write to it.
 */
export async function requireBoardAccess(
  boardId: string,
  minRole: DepartmentAccessLevel = "MEMBER",
) {
  const board = await prisma.board.findUnique({
    where: { id: boardId },
    select: {
      id: true,
      departmentId: true,
      divisionId: true,
      department: { select: { active: true, name: true } },
      division: { select: { active: true, name: true } },
    },
  });
  if (!board) throw new BoardAccessError("That board no longer exists.");

  const owner = board.department ?? board.division;
  // The CHECK constraint Board_owner_exactly_one makes this unreachable, but a
  // board with no owner would otherwise be silently writable by anyone.
  if (!owner) throw new BoardAccessError("That board has no owner.");

  // A deactivated owner's board is read-only rather than gone (FR-031), so
  // reads still work and writes stop here.
  if (!owner.active) {
    throw new BoardAccessError(`${owner.name} is deactivated, so its board is read-only.`);
  }

  if (board.divisionId) {
    if (!(await canViewDivisionBoard(board.divisionId))) throw new BoardAccessError();
    return board;
  }

  if (!board.departmentId || !(await hasDepartmentAccess(board.departmentId, minRole))) {
    throw new BoardAccessError();
  }
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

/**
 * Whether this user may READ a division board.
 *
 * The application's first restricted read (constitution Principle II, amended
 * 1.1.0). Department boards are org-wide readable; division boards are not.
 *
 * Deliberately narrow: the division's own lead, and org admins. **Not**
 * department leads, even leads of departments inside that division.
 *
 * This is the one named function the rule lives in. Every caller — the board
 * page, the index, and anything added later — asks here. A restriction spread
 * across queries is one that cannot be audited, which is exactly why the
 * amended principle requires it be centralized.
 */
export async function canViewDivisionBoard(divisionId: string): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;
  if (user.isOrgAdmin) return true;

  const division = await prisma.division.findUnique({
    where: { id: divisionId },
    select: { leadUserId: true },
  });
  return division?.leadUserId === user.id;
}

/** Same rule, applied to a set — one query rather than one per division. */
export async function visibleDivisionIds(): Promise<string[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const divisions = await prisma.division.findMany({
    where: user.isOrgAdmin ? {} : { leadUserId: user.id },
    select: { id: true },
  });
  return divisions.map((d) => d.id);
}
