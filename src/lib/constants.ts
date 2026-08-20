// Mirrors the enums in prisma/schema.prisma. Kept as plain string-literal
// tuples (rather than derived from the generated Prisma enum objects) so
// zod's z.enum() gets the exact literal-union typing it expects.
export const ASSET_STATUSES = ["ACTIVE", "IN_REPAIR", "STORAGE", "RETIRED", "LOST", "DESTROYED"] as const;
export const ASSET_CONDITIONS = ["NEW", "GOOD", "FAIR", "POOR", "UNSERVICEABLE"] as const;
export const WO_TYPES = ["CORRECTIVE", "PREVENTIVE", "INSPECTION", "MODIFICATION", "DECOMMISSION"] as const;
export const WO_PRIORITIES = ["LOW", "NORMAL", "HIGH", "EVENT_CRITICAL"] as const;
export const WO_STATUSES = ["OPEN", "IN_PROGRESS", "WAITING_PARTS", "COMPLETE", "CLOSED", "CANCELLED"] as const;
