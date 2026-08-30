import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * The columns a personal kanban starts with.
 *
 * The status mappings match every other board's, even though no work order will
 * ever be auto-placed here. assertBoardInvariant requires each status to live in
 * exactly one column, because a work-order card's column is DERIVED from its
 * status and an unmapped status would make its card invisible. Leaving them
 * empty threw on first load. Division boards carry the same mappings for the
 * same reason.
 */
const PERSONAL_BOARD_COLUMNS = [
  { name: "Ideas", position: 0, color: "slate", woStatusOnMove: null, woStatusesShown: [] },
  { name: "Next up", position: 1, color: "sky", woStatusOnMove: "OPEN" as const, woStatusesShown: ["OPEN" as const] },
  { name: "Doing", position: 2, color: "amber", woStatusOnMove: "IN_PROGRESS" as const, woStatusesShown: ["IN_PROGRESS" as const] },
  { name: "Waiting", position: 3, color: "rose", woStatusOnMove: "WAITING_PARTS" as const, woStatusesShown: ["WAITING_PARTS" as const] },
  { name: "Done", position: 4, color: "emerald", woStatusOnMove: "COMPLETE" as const, woStatusesShown: ["COMPLETE" as const, "CLOSED" as const, "CANCELLED" as const] },
];

/**
 * Create someone's personal kanban, if they do not already have one.
 *
 * Takes a user id rather than reading the session, so it serves both the route
 * (which creates the board lazily on first visit) and anything that has to set
 * one up on another person's behalf. It lives apart from `board.ts` because that
 * module reaches for the session, which drags in enough of Next's runtime to
 * make it unimportable from a plain script.
 */
export async function ensurePersonalBoard(userId: string) {
  const existing = await prisma.board.findUnique({ where: { userId }, select: { id: true } });
  if (existing) return existing;
  return prisma.board.create({
    data: { userId, columns: { create: PERSONAL_BOARD_COLUMNS } },
    select: { id: true },
  });
}
