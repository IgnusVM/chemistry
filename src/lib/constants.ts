// Mirrors the enums in prisma/schema.prisma. Kept as plain string-literal
// tuples (rather than derived from the generated Prisma enum objects) so
// zod's z.enum() gets the exact literal-union typing it expects.
export const ASSET_STATUSES = ["ACTIVE", "IN_REPAIR", "STORAGE", "RETIRED", "LOST", "DESTROYED"] as const;
export const ASSET_CONDITIONS = ["NEW", "GOOD", "FAIR", "POOR", "UNSERVICEABLE"] as const;
export const WO_TYPES = ["CORRECTIVE", "PREVENTIVE", "INSPECTION", "MODIFICATION", "DECOMMISSION"] as const;
export const WO_PRIORITIES = ["LOW", "NORMAL", "HIGH", "EVENT_CRITICAL"] as const;
export const WO_STATUSES = ["OPEN", "IN_PROGRESS", "WAITING_PARTS", "COMPLETE", "CLOSED", "CANCELLED"] as const;

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
