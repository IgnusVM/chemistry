"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireOrgAdmin } from "@/lib/dal";
import { recordAudit } from "@/lib/audit";
import { assertBoardInvariant, BoardInvariantError, type ColumnMapping } from "@/lib/board";
import { WO_STATUSES } from "@/lib/constants";

/**
 * Column configuration, org-admin only (FR-007).
 *
 * Every write re-validates the board invariant BEFORE committing: each work
 * order status must appear in exactly one column. A status in no column makes
 * those work orders invisible; a status in two puts the same card in two
 * places. Both are worse than refusing the configuration that would cause
 * them, so this refuses.
 */

export type ColumnFormState = { error?: string } | undefined;

const COLORS = ["slate", "sky", "amber", "rose", "emerald", "violet", "teal", "orange"] as const;

const columnSchema = z.object({
  boardId: z.string().min(1),
  columnId: z.string().optional(),
  name: z.string().trim().min(1, "Give the column a name.").max(40),
  color: z.enum(COLORS).optional(),
  woStatusOnMove: z.string().optional(),
  woStatusesShown: z.array(z.string()).default([]),
});

function parseStatuses(values: string[]) {
  return values.filter((v): v is (typeof WO_STATUSES)[number] => (WO_STATUSES as readonly string[]).includes(v));
}

export async function saveColumn(_prev: ColumnFormState, formData: FormData): Promise<ColumnFormState> {
  const admin = await requireOrgAdmin();
  const parsed = columnSchema.safeParse({
    boardId: formData.get("boardId"),
    columnId: formData.get("columnId") || undefined,
    name: formData.get("name"),
    color: formData.get("color") || undefined,
    woStatusOnMove: formData.get("woStatusOnMove") || undefined,
    woStatusesShown: formData.getAll("woStatusesShown").map(String),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const shown = parseStatuses(parsed.data.woStatusesShown);
  const onMove = parsed.data.woStatusOnMove ? parseStatuses([parsed.data.woStatusOnMove])[0] ?? null : null;

  const existing = await prisma.boardColumn.findMany({
    where: { boardId: parsed.data.boardId },
    orderBy: { position: "asc" },
    select: { id: true, name: true, position: true, woStatusOnMove: true, woStatusesShown: true },
  });

  // Build the post-change picture and validate it before writing anything.
  const proposed: ColumnMapping[] = parsed.data.columnId
    ? existing.map((c) =>
        c.id === parsed.data.columnId ? { ...c, name: parsed.data.name, woStatusOnMove: onMove, woStatusesShown: shown } : c,
      )
    : [
        ...existing,
        { id: "new", name: parsed.data.name, position: existing.length, woStatusOnMove: onMove, woStatusesShown: shown },
      ];

  try {
    assertBoardInvariant(proposed);
  } catch (err) {
    if (err instanceof BoardInvariantError) return { error: err.message };
    throw err;
  }

  if (parsed.data.columnId) {
    await prisma.boardColumn.update({
      where: { id: parsed.data.columnId },
      data: { name: parsed.data.name, color: parsed.data.color, woStatusOnMove: onMove, woStatusesShown: shown },
    });
  } else {
    await prisma.boardColumn.create({
      data: {
        boardId: parsed.data.boardId,
        name: parsed.data.name,
        color: parsed.data.color,
        position: existing.length,
        woStatusOnMove: onMove,
        woStatusesShown: shown,
      },
    });
  }

  await recordAudit({
    entityType: "BoardColumn",
    entityId: parsed.data.columnId ?? parsed.data.boardId,
    action: parsed.data.columnId ? "updated" : "created",
    userId: admin.id,
    changes: { name: parsed.data.name, woStatusesShown: shown },
  });
  revalidatePath("/admin/board-columns");
  revalidatePath("/board");
}

export async function reorderColumn(columnId: string, direction: "left" | "right"): Promise<void> {
  await requireOrgAdmin();
  const col = await prisma.boardColumn.findUniqueOrThrow({ where: { id: columnId } });
  const siblings = await prisma.boardColumn.findMany({
    where: { boardId: col.boardId },
    orderBy: { position: "asc" },
  });
  const i = siblings.findIndex((c) => c.id === columnId);
  const j = direction === "left" ? i - 1 : i + 1;
  if (j < 0 || j >= siblings.length) return;

  // Swap positions in a transaction so the board is never briefly inconsistent.
  await prisma.$transaction([
    prisma.boardColumn.update({ where: { id: siblings[i].id }, data: { position: siblings[j].position } }),
    prisma.boardColumn.update({ where: { id: siblings[j].id }, data: { position: siblings[i].position } }),
  ]);
  revalidatePath("/admin/board-columns");
  revalidatePath("/board");
}

/**
 * Deleting a column requires saying where its cards go (FR-008).
 *
 * The cards are moved first, in the same transaction. `onDelete: Restrict` on
 * the foreign key means a mistake here fails loudly at the database rather
 * than quietly destroying work.
 */
export async function deleteColumn(_prev: ColumnFormState, formData: FormData): Promise<ColumnFormState> {
  const admin = await requireOrgAdmin();
  const columnId = String(formData.get("columnId") ?? "");
  const moveTo = String(formData.get("moveCardsToColumnId") ?? "");
  if (!columnId || !moveTo) return { error: "Choose where the cards should go." };
  if (columnId === moveTo) return { error: "Pick a different column for the cards." };

  const col = await prisma.boardColumn.findUniqueOrThrow({ where: { id: columnId } });
  const remaining = await prisma.boardColumn.findMany({
    where: { boardId: col.boardId, id: { not: columnId } },
    orderBy: { position: "asc" },
    select: { id: true, name: true, position: true, woStatusOnMove: true, woStatusesShown: true },
  });
  if (remaining.length === 0) return { error: "A board needs at least one column." };

  // The remaining columns must still cover every status between them.
  const target = remaining.find((c) => c.id === moveTo);
  if (!target) return { error: "That column isn't on this board." };
  const absorbed = remaining.map((c) =>
    c.id === moveTo ? { ...c, woStatusesShown: [...new Set([...c.woStatusesShown, ...col.woStatusesShown])] } : c,
  );
  try {
    assertBoardInvariant(absorbed);
  } catch (err) {
    if (err instanceof BoardInvariantError) return { error: err.message };
    throw err;
  }

  await prisma.$transaction([
    prisma.card.updateMany({ where: { columnId }, data: { columnId: moveTo } }),
    prisma.boardColumn.update({ where: { id: moveTo }, data: { woStatusesShown: absorbed.find((c) => c.id === moveTo)!.woStatusesShown } }),
    prisma.boardColumn.delete({ where: { id: columnId } }),
  ]);

  await recordAudit({
    entityType: "BoardColumn",
    entityId: columnId,
    action: "deleted",
    userId: admin.id,
    changes: { movedCardsTo: moveTo },
  });
  revalidatePath("/admin/board-columns");
  revalidatePath("/board");
}

export { COLORS };
