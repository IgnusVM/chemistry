export const ASSET_STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-800",
  IN_REPAIR: "bg-amber-100 text-amber-800",
  STORAGE: "bg-neutral-100 text-neutral-700",
  RETIRED: "bg-neutral-200 text-neutral-500",
  LOST: "bg-red-100 text-red-800",
  DESTROYED: "bg-red-100 text-red-800",
};

/*
 * Completing is green, in-progress is yellow, cancelling is red.
 *
 * Cancelled is the one ending where the work did not happen, so it reads as a
 * stop rather than a finish. The two are the only ways a ticket closes, which is
 * why they are the only two that carry a strong colour.
 */
export const WORK_ORDER_STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-blue-100 text-blue-800",
  IN_PROGRESS: "bg-yellow-100 text-yellow-800",
  WAITING_PARTS: "bg-orange-100 text-orange-800",
  COMPLETE: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
};

export const WORK_ORDER_PRIORITY_STYLES: Record<string, string> = {
  LOW: "text-neutral-500",
  NORMAL: "text-neutral-700",
  HIGH: "text-amber-700 font-medium",
  EVENT_CRITICAL: "text-red-700 font-semibold",
};
