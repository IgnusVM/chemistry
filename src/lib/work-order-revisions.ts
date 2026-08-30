import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

/**
 * Undo for work order edits.
 *
 * Five steps, which is the number a person can hold in their head. Deeper
 * history would be an audit log, and this application already has one of those
 * — this is a different job: taking back the edit you just made because you
 * pasted into the wrong field.
 *
 * A revision records only the FIELDS THAT CHANGED, with both sides. Not a
 * snapshot of the whole ticket: two people editing different fields would then
 * have one silently reverting the other's work on undo. Restoring only what an
 * edit touched keeps an undo honest about its own scope.
 *
 * Undone revisions are kept rather than deleted, which is what makes redo
 * possible. The pointer between "done" and "undone" is the `undone` flag plus
 * ordering by time.
 */

export const UNDO_DEPTH = 5;

/** Fields a person may edit, and therefore undo. */
export const EDITABLE_FIELDS = [
  "title",
  "description",
  "priority",
  "type",
  "resolutionNotes",
  "laborMinutes",
] as const;

export type EditableField = (typeof EDITABLE_FIELDS)[number];

export type RevisionState = {
  canUndo: boolean;
  canRedo: boolean;
  /** What undoing would put back, for the button's tooltip. */
  undoLabel: string | null;
  redoLabel: string | null;
};

const LABELS: Record<EditableField, string> = {
  title: "title",
  description: "description",
  priority: "priority",
  type: "type",
  resolutionNotes: "resolution notes",
  laborMinutes: "labour minutes",
};

function describe(changed: Record<string, unknown>): string {
  const names = Object.keys(changed).map((k) => LABELS[k as EditableField] ?? k);
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/**
 * Record an edit, and trim the history to the undo depth.
 *
 * Making a NEW edit discards anything that was undone: the redo stack belongs
 * to the branch the user stepped back through, and once they change something
 * else that branch is gone. Keeping it would let redo reapply a value that no
 * longer relates to the ticket's current state.
 */
export async function recordRevision(
  tx: Prisma.TransactionClient,
  workOrderId: string,
  userId: string,
  before: Record<string, unknown>,
  after: Record<string, unknown>,
) {
  if (Object.keys(after).length === 0) return;

  await tx.workOrderRevision.deleteMany({ where: { workOrderId, undone: true } });
  await tx.workOrderRevision.create({
    data: {
      workOrderId,
      editedByUserId: userId,
      before: before as Prisma.InputJsonValue,
      after: after as Prisma.InputJsonValue,
    },
  });

  // Keep the newest UNDO_DEPTH. Older ones are beyond reach of the button, and
  // the audit log is where permanent history lives.
  const keep = await tx.workOrderRevision.findMany({
    where: { workOrderId, undone: false },
    orderBy: { createdAt: "desc" },
    skip: UNDO_DEPTH,
    select: { id: true },
  });
  if (keep.length) {
    await tx.workOrderRevision.deleteMany({ where: { id: { in: keep.map((r) => r.id) } } });
  }
}

/** Whether the buttons should be offered, and what they would do. */
export async function getRevisionState(workOrderId: string): Promise<RevisionState> {
  const [undoable, redoable] = await Promise.all([
    prisma.workOrderRevision.findFirst({
      where: { workOrderId, undone: false },
      orderBy: { createdAt: "desc" },
      select: { after: true },
    }),
    prisma.workOrderRevision.findFirst({
      where: { workOrderId, undone: true },
      orderBy: { createdAt: "asc" },
      select: { after: true },
    }),
  ]);

  return {
    canUndo: !!undoable,
    canRedo: !!redoable,
    undoLabel: undoable ? describe(undoable.after as Record<string, unknown>) : null,
    redoLabel: redoable ? describe(redoable.after as Record<string, unknown>) : null,
  };
}
