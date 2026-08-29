"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser, hasDepartmentAccess } from "@/lib/dal";
import { recordAudit } from "@/lib/audit";
import { requireBoardAccess, requireCardAccess, BoardAccessError } from "@/lib/board-auth";
import { unmappedColumnMessage } from "@/lib/board";
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
 * Two genuinely different operations behind one verb:
 *
 *   - **standalone card** — write `columnId` on the card.
 *   - **work-order-backed card** — write the WORK ORDER's status. The card row
 *     is never touched, because its column is derived (research.md D1). This
 *     also means the move is authorized as a work order edit rather than a
 *     board edit: someone who may write the board but not that work order must
 *     not be able to change its status by dragging a card.
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

  const target = await prisma.boardColumn.findUnique({
    where: { id: parsed.data.toColumnId },
    select: { id: true, boardId: true, name: true, woStatusOnMove: true, woStatusesShown: true, position: true },
  });
  // A column from another board would move the card off its own board.
  if (!target || target.boardId !== card.boardId) return { error: "That column isn't on this board." };

  // --- work-order-backed: change the work order, never the card -------------
  if (card.workOrderId) {
    if (!target.woStatusOnMove) {
      // Refusing is the point. Allowing it would leave the card somewhere its
      // work order's status does not correspond to, which is exactly the lie
      // the derived-column design exists to prevent (FR-021).
      return { error: unmappedColumnMessage(target) };
    }

    const wo = await prisma.workOrder.findUnique({
      where: { id: card.workOrderId },
      select: { id: true, code: true, status: true, departmentId: true },
    });
    if (!wo) return { error: "That work order no longer exists." };

    // Authorized as a work order edit, not a board edit.
    if (!(await hasDepartmentAccess(wo.departmentId, "MEMBER"))) {
      return { error: "You don't have permission to change that work order." };
    }
    if (wo.status === target.woStatusOnMove) return { ok: true };

    await prisma.workOrder.update({
      where: { id: wo.id },
      data: { status: target.woStatusOnMove },
    });
    await recordAudit({
      entityType: "WorkOrder",
      entityId: wo.id,
      action: "status changed from board",
      userId: user.id,
      changes: { from: wo.status, to: target.woStatusOnMove },
    });
    await revalidateBoard(card.boardId);
    revalidatePath(`/work-orders/${wo.code}`);
    return { ok: true };
  }

  // --- standalone ----------------------------------------------------------
  // Optimistic concurrency: if someone else moved this card since the client
  // last saw it, refuse and say so rather than silently discarding their move
  // (FR-032). Compared at millisecond precision on both sides.
  if (card.updatedAt.toISOString() !== parsed.data.expectedUpdatedAt) {
    return { error: "Somebody else moved this card first. Reloading will show where it is now." };
  }

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

/** Assign the exact set of tags on a card. Replaces, rather than adds. */
export async function setCardTags(
  _prev: BoardActionState,
  formData: FormData,
): Promise<BoardActionState> {
  const user = await requireCurrentUser();
  const cardId = String(formData.get("cardId") ?? "");
  const tagIds = formData.getAll("tagIds").map(String).filter(Boolean);
  if (!cardId) return { error: "Invalid input" };

  let card;
  try {
    card = await requireCardAccess(cardId);
  } catch (err) {
    return toState(err);
  }

  // Replace wholesale inside a transaction so a card is never briefly
  // untagged, which would flicker on any board someone has open.
  await prisma.$transaction([
    prisma.cardTag.deleteMany({ where: { cardId } }),
    prisma.cardTag.createMany({ data: tagIds.map((tagId) => ({ cardId, tagId })), skipDuplicates: true }),
  ]);

  await recordAudit({
    entityType: "Card",
    entityId: cardId,
    action: "tags set",
    userId: user.id,
    changes: { tagIds },
  });
  await revalidateBoard(card.boardId);
  return { ok: true };
}
