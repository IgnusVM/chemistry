// Mirrors the enums in prisma/schema.prisma. Kept as plain string-literal
// tuples (rather than derived from the generated Prisma enum objects) so
// zod's z.enum() gets the exact literal-union typing it expects.
export const ASSET_STATUSES = ["ACTIVE", "IN_REPAIR", "STORAGE", "RETIRED", "LOST", "DESTROYED"] as const;
export const ASSET_CONDITIONS = ["NEW", "GOOD", "FAIR", "POOR", "UNSERVICEABLE"] as const;
export const WO_TYPES = ["CORRECTIVE", "PREVENTIVE", "INSPECTION", "MODIFICATION", "DECOMMISSION", "GENERAL"] as const;
export const WO_PRIORITIES = ["LOW", "NORMAL", "HIGH", "EVENT_CRITICAL"] as const;
export const WO_STATUSES = ["PENDING", "IN_PROGRESS", "WAITING_PARTS", "COMPLETE", "CANCELLED"] as const;
export const NOTE_FORMATS = ["HTML", "MARKDOWN"] as const;

// A work order in one of these is finished; everything else counts as still
// active. Expressed as the terminal set rather than an "open" list so adding a
// new in-progress status doesn't silently drop it out of every open-WO query.
// Spread it at Prisma call sites (`notIn: [...TERMINAL_WO_STATUSES]`) — Prisma's
// filter types want a mutable array and reject a readonly tuple.
export const TERMINAL_WO_STATUSES = ["COMPLETE", "CANCELLED"] as const;

// Work still asking something of the person it is assigned to, which is now
// exactly the inverse of TERMINAL_WO_STATUSES: a ticket is either still open or
// it has ended, and there is no third state in between.
export const ACTIVE_WO_STATUSES = ["PENDING", "IN_PROGRESS", "WAITING_PARTS"] as const;

// Photos, PDFs, and common office docs — covers repair photos, receipts, and
// service reports, the three things attachments get used for in practice.
// Not `as const`: only ever used for `.includes(file.type)` runtime checks
// against an arbitrary string, never for zod enum literal inference.
export const ALLOWED_ATTACHMENT_TYPES: string[] = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

/**
 * `WAITING_PARTS` -> `Waiting parts`, for prose.
 *
 * Status badges keep their own uppercase convention (`status.replace("_", " ")`)
 * because a badge is a label, not a sentence. This is for the places that read as
 * prose — the board column editor lists which statuses a column shows, and raw
 * enum names there read as an unfinished screen.
 */
export function statusLabel(status: string) {
  const s = status.replace(/_/g, " ").toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * The parent status a sub-status belongs to.
 *
 * Open and Closed are not stored. A ticket that has ended is COMPLETE or
 * CANCELLED and everything else means it is still open, so the parent is a
 * function of the sub-status. Storing both would be two records that have to
 * agree, and the board already learned that lesson the hard way.
 */
export function parentStatus(status: string): "OPEN" | "CLOSED" {
  return (TERMINAL_WO_STATUSES as readonly string[]).includes(status) ? "CLOSED" : "OPEN";
}

export function parentStatusLabel(status: string) {
  return parentStatus(status) === "CLOSED" ? "Closed" : "Open";
}

/** Reads as "Open / In progress", the way the ticket header shows it. */
export function fullStatusLabel(status: string) {
  return `${parentStatusLabel(status)} / ${statusLabel(status)}`;
}

// A work order task is a checklist line, not a description. Short enough to
// scan a list of them at a glance, which is the only reason to have them.
export const WO_TASK_MAX_LENGTH = 50;
