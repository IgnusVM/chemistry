import "server-only";
import { prisma } from "@/lib/prisma";

export async function recordAudit(params: {
  entityType: string;
  entityId: string;
  action: string;
  userId: string | null;
  changes?: unknown;
}) {
  await prisma.auditLog.create({
    data: {
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      userId: params.userId,
      changes: params.changes === undefined ? undefined : (params.changes as object),
    },
  });
}
