import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { TERMINAL_WO_STATUSES } from "@/lib/constants";

export type WorkOrderListParams = {
  q?: string;
  department?: string;
  status?: string;
  priority?: string;
  mine?: string;
  assignedToName?: string;
};

// Sentinel status value meaning "everything not finished" — OPEN, IN_PROGRESS,
// WAITING_PARTS, COMPLETE, but not CLOSED/CANCELLED. Distinct from a real
// WorkOrderStatus enum value so it can't collide with one.
export const OPEN_STATUS_FILTER = "OPEN_ALL";

export function resolveWorkOrderListDefaults(params: WorkOrderListParams) {
  // First-ever visit (no query string at all) defaults to "my open work" —
  // once the filter form has been submitted even once, every field (including
  // cleared ones) is present as an explicit "" in the query string, so this
  // only fires before the user has touched the filters.
  const hasAnyFilterParam = Object.keys(params).length > 0;
  return {
    status: hasAnyFilterParam ? params.status : OPEN_STATUS_FILTER,
    mine: hasAnyFilterParam ? params.mine : "1",
  };
}

export function buildWorkOrderWhere(
  params: WorkOrderListParams,
  ctx: { userId: string; accessibleDeptIds: string[] },
): Prisma.WorkOrderWhereInput {
  const { status, mine } = resolveWorkOrderListDefaults(params);

  const where: Prisma.WorkOrderWhereInput = {
    departmentId: params.department ? params.department : { in: ctx.accessibleDeptIds },
  };
  if (status === OPEN_STATUS_FILTER) {
    where.status = { notIn: [...TERMINAL_WO_STATUSES] };
  } else if (status) {
    where.status = status as Prisma.EnumWorkOrderStatusFilter["equals"];
  }
  if (params.priority) where.priority = params.priority as Prisma.EnumWorkOrderPriorityFilter["equals"];
  if (mine === "1") where.assignedToUserId = ctx.userId;
  if (params.assignedToName) {
    where.assignedTo = { displayName: { contains: params.assignedToName, mode: "insensitive" } };
  }
  if (params.q) {
    where.OR = [
      { description: { contains: params.q, mode: "insensitive" } },
      { code: { contains: params.q, mode: "insensitive" } },
    ];
  }
  return where;
}
