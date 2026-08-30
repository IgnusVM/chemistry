import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { TERMINAL_WO_STATUSES } from "@/lib/constants";

export type WorkOrderListParams = {
  q?: string;
  searchBy?: string;
  department?: string;
  status?: string;
  priority?: string;
  mine?: string;
  assignedToName?: string;
  location?: string;
};

// Sentinel status value meaning "everything not finished" — OPEN, IN_PROGRESS,
// WAITING_PARTS, COMPLETE, but not CLOSED/CANCELLED. Distinct from a real
// WorkOrderStatus enum value so it can't collide with one.
export const OPEN_STATUS_FILTER = "OPEN_ALL";

/** What the "search by" selector offers. "Any field" is the default. */
export const WORK_ORDER_SEARCH_FIELDS = [
  { value: "any", label: "Any field" },
  { value: "code", label: "Work order number" },
  { value: "description", label: "Description" },
  { value: "asset", label: "Asset tag or name" },
  { value: "assignedTo", label: "Assigned to" },
  { value: "reportedBy", label: "Reported by" },
  { value: "resolution", label: "Resolution notes" },
  { value: "notes", label: "Notes" },
  { value: "department", label: "Department" },
] as const;

const like = (q: string) => ({ contains: q, mode: "insensitive" as const });

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

// Reads are org-wide: any signed-in user can see any work order, the same way
// assets have always behaved. `department` is therefore an ordinary filter and
// nothing here is an access boundary — write authorization is enforced per
// record by requireWorkOrderAccess and by the bulk actions, which re-check
// hasDepartmentAccess against each record they actually touch.
export function buildWorkOrderWhere(
  params: WorkOrderListParams,
  ctx: { userId: string },
): Prisma.WorkOrderWhereInput {
  const { status, mine } = resolveWorkOrderListDefaults(params);
  const and: Prisma.WorkOrderWhereInput[] = [];

  if (params.department) and.push({ departmentId: params.department });
  if (status === OPEN_STATUS_FILTER) {
    and.push({ status: { notIn: [...TERMINAL_WO_STATUSES] } });
  } else if (status) {
    and.push({ status: status as Prisma.EnumWorkOrderStatusFilter["equals"] });
  }
  if (params.priority) {
    and.push({ priority: params.priority as Prisma.EnumWorkOrderPriorityFilter["equals"] });
  }
  if (mine === "1") and.push({ assignedToUserId: ctx.userId });
  if (params.assignedToName) {
    and.push({ assignedTo: { displayName: like(params.assignedToName) } });
  }
  // A work order has no location of its own; it inherits the one from the asset
  // it is about, which is how someone thinks about it — "what is broken at Home
  // Base" rather than "which tickets carry this location".
  if (params.location) and.push({ asset: { currentLocationId: params.location } });

  const q = params.q?.trim();
  if (q) {
    const byField: Record<string, Prisma.WorkOrderWhereInput> = {
      code: { code: like(q) },
      description: { description: like(q) },
      asset: { asset: { OR: [{ assetTag: like(q) }, { name: like(q) }] } },
      assignedTo: { assignedTo: { displayName: like(q) } },
      reportedBy: { reportedBy: { displayName: like(q) } },
      resolution: { resolutionNotes: like(q) },
      notes: { notes: { some: { body: like(q) } } },
      department: { department: { name: like(q) } },
    };

    const by = params.searchBy && params.searchBy !== "any" ? params.searchBy : null;
    if (by && byField[by]) and.push(byField[by]);
    else and.push({ OR: Object.values(byField) });
  }

  // AND rather than merging keys: the location filter and an asset search both
  // constrain `asset`, and merging would have one quietly overwrite the other.
  return and.length ? { AND: and } : {};
}
