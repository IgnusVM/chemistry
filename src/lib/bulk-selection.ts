import "server-only";
import { prisma } from "@/lib/prisma";

export { MAX_BULK_ITEMS } from "@/lib/bulk-selection-constants";
const BULK_SELECTION_TTL_MINUTES = 15;

export async function createBulkSelection(entityType: string, userId: string, ids: string[]) {
  const selection = await prisma.bulkSelection.create({
    data: {
      entityType,
      ids,
      createdByUserId: userId,
      expiresAt: new Date(Date.now() + BULK_SELECTION_TTL_MINUTES * 60 * 1000),
    },
  });
  return selection.id;
}

export async function readBulkSelection(
  entityType: string,
  selectionId: string,
  userId: string,
): Promise<string[]> {
  const selection = await prisma.bulkSelection.findUnique({ where: { id: selectionId } });
  if (
    !selection ||
    selection.entityType !== entityType ||
    selection.createdByUserId !== userId ||
    selection.expiresAt < new Date()
  ) {
    return [];
  }
  return selection.ids as string[];
}
