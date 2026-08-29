"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/dal";
import { recordAudit } from "@/lib/audit";
import { requireBoardAccess, requireCardAccess, BoardAccessError } from "@/lib/board-auth";
import { createCardSchema, updateCardSchema, moveCardSchema } from "./schemas";

/**
 * Board mutations.
 *
 * Every export here is a publicly callable endpoint, so each one independently
 * establishes the user and resolves the owning department or division FROM THE
 * STORED RECORD before deciding anything (Constitution Principle II). A board
 * or card id arriving in a form field is caller-supplied and proves nothing.
 *
 * The authorization itself lives in `@/lib/board-auth` rather than here,
 * because a helper exported from a `"use server"` file would itself be
 * callable.
 */

export type BoardActionState = { error?: string; ok?: true } | undefined;

/** Turn thrown auth failures into a message the interface can show. */
function toState(err: unknown): BoardActionState {
  if (err instanceof BoardAccessError) return { error: err.message };
  throw err;
}

async function revalidateBoard(boardId: string) {
  const board = await prisma.board.findUnique({
    where: { id: boardId },
    select: { department: { select: { slug: true } }, division: { select: { slug: true } } },
  });
  if (board?.department) revalidatePath(`/board/${board.department.slug}`);
  if (board?.division) revalidatePath(`/board/division/${board.division.slug}`);
  revalidatePath("/board");
}

export async function createCard(
  _prev: BoardActionState,
  formData: FormData,
): Promise<BoardActionState> {
  const user = await requireCurrentUser();
  const parsed = createCardSchema.safeParse({
    boardId: formData.get("boardId"),
    title: formData.get("title"),
    columnId: formData.get("columnId") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  try {
    await requireBoardAccess(parsed.data.boardId);
  } catch (err) {
    return toState(err);
  }

  // Default to the leftmost column when none is given, so a card created from
  // the board header lands somewhere sensible without asking.
  const columnId =
    parsed.data.columnId ??
    (
      await prisma.boardColumn.findFirst({
        where: { boardId: parsed.data.boardId },
        orderBy: { position: "asc" },
        select: { id: true },
      })
    )?.id;
  if (!columnId) return { error: "That board has no columns yet." };

  // New cards go to the top of their column: the thing just added is the thing
  // most likely to be acted on, and appending would bury it.
  const top = await prisma.card.aggregate({
    where: { columnId, archivedAt: null },
    _min: { position: true },
  });

  const card = await prisma.card.create({
    data: {
      boardId: parsed.data.boardId,
      columnId,
      title: parsed.data.title,
      position: (top._min.position ?? 0) - 1,
      createdByUserId: user.id,
    },
  });

  await recordAudit({
    entityType: "Card",
    entityId: card.id,
    action: "created",
    userId: user.id,
    changes: { title: card.title },
  });
  await revalidateBoard(parsed.data.boardId);
  return { ok: true };
}

export async function updateCard(
  _prev: BoardActionState,
  formData: FormData,
): Promise<BoardActionState> {
  const user = await requireCurrentUser();
  const parsed = updateCardSchema.safeParse({
    cardId: formData.get("cardId"),
    title: formData.get("title"),
    ownerUserId: formData.get("ownerUserId") ?? undefined,
    nextAction: formData.get("nextAction") ?? undefined,
    statusNotes: formData.get("statusNotes") ?? undefined,
    dueDate: formData.get("dueDate") ?? undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  let card;
  try {
    card = await requireCardAccess(parsed.data.cardId);
  } catch (err) {
    return toState(err);
  }

  const { cardId, ...data } = parsed.data;
  await prisma.card.update({ where: { id: cardId }, data });
  await recordAudit({
    entityType: "Card",
    entityId: cardId,
    action: "updated",
    userId: user.id,
    changes: { title: data.title },
  });
  await revalidateBoard(card.boardId);
  return { ok: true };
}

/**
 * Move a card between columns.
 *
 * Standalone cards only at this stage. Work-order-backed cards move by having
 * their work order's status changed instead — that path arrives with US3, and
 * until it does they are refused here rather than being written directly,
 * which would decouple the card from its work order (research.md D1).
 */
export async function moveCard(
  _prev: BoardActionState,
  formData: FormData,
): Promise<BoardActionState> {
  const user = await requireCurrentUser();
  const parsed = moveCardSchema.safeParse({
    cardId: formData.get("cardId"),
    toColumnId: formData.get("toColumnId"),
    expectedUpdatedAt: formData.get("expectedUpdatedAt"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  let card;
  try {
    card = await requireCardAccess(parsed.data.cardId);
  } catch (err) {
    return toState(err);
  }

  if (card.workOrderId) {
    return {
      error: "This card belongs to a work order. Change the work order's status to move it.",
    };
  }

  // Optimistic concurrency: if someone else moved this card since the client
  // last saw it, refuse and say so rather than silently discarding their move
  // (FR-032). Compared at millisecond precision on both sides.
  if (card.updatedAt.toISOString() !== parsed.data.expectedUpdatedAt) {
    return { error: "Somebody else moved this card first. Reloading will show where it is now." };
  }

  const target = await prisma.boardColumn.findUnique({
    where: { id: parsed.data.toColumnId },
    select: { id: true, boardId: true },
  });
  // A column from another board would move the card off its own board.
  if (!target || target.boardId !== card.boardId) return { error: "That column isn't on this board." };

  const top = await prisma.card.aggregate({
    where: { columnId: target.id, archivedAt: null },
    _min: { position: true },
  });

  await prisma.card.update({
    where: { id: card.id },
    data: { columnId: target.id, position: (top._min.position ?? 0) - 1 },
  });

  await recordAudit({
    entityType: "Card",
    entityId: card.id,
    action: "moved",
    userId: user.id,
    changes: { fromColumnId: card.columnId, toColumnId: target.id },
  });
  await revalidateBoard(card.boardId);
  return { ok: true };
}

export async function archiveCard(cardId: string): Promise<BoardActionState> {
  const user = await requireCurrentUser();
  let card;
  try {
    card = await requireCardAccess(cardId);
  } catch (err) {
    return toState(err);
  }
  // A work-order card's lifecycle belongs to its work order, not to the board.
  if (card.workOrderId) {
    return { error: "This card belongs to a work order. Close the work order instead." };
  }

  await prisma.card.update({ where: { id: cardId }, data: { archivedAt: new Date() } });
  await recordAudit({ entityType: "Card", entityId: cardId, action: "archived", userId: user.id });
  await revalidateBoard(card.boardId);
  return { ok: true };
}

export async function deleteCard(cardId: string): Promise<BoardActionState> {
  const user = await requireCurrentUser();
  let card;
  try {
    card = await requireCardAccess(cardId);
  } catch (err) {
    return toState(err);
  }
  if (card.workOrderId) {
    return { error: "This card belongs to a work order and can't be deleted from the board." };
  }

  await prisma.card.delete({ where: { id: cardId } });
  await recordAudit({ entityType: "Card", entityId: cardId, action: "deleted", userId: user.id });
  await revalidateBoard(card.boardId);
  return { ok: true };
}
