export const ASSET_STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-800",
  IN_REPAIR: "bg-amber-100 text-amber-800",
  STORAGE: "bg-neutral-100 text-neutral-700",
  RETIRED: "bg-neutral-200 text-neutral-500",
  LOST: "bg-red-100 text-red-800",
  DESTROYED: "bg-red-100 text-red-800",
};

export const WORK_ORDER_STATUS_STYLES: Record<string, string> = {
  OPEN: "bg-blue-100 text-blue-800",
  IN_PROGRESS: "bg-amber-100 text-amber-800",
  WAITING_PARTS: "bg-orange-100 text-orange-800",
  COMPLETE: "bg-green-100 text-green-800",
  CLOSED: "bg-neutral-200 text-neutral-500",
  CANCELLED: "bg-neutral-200 text-neutral-400",
};

export const WORK_ORDER_PRIORITY_STYLES: Record<string, string> = {
  LOW: "text-neutral-500",
  NORMAL: "text-neutral-700",
  HIGH: "text-amber-700 font-medium",
  EVENT_CRITICAL: "text-red-700 font-semibold",
};
