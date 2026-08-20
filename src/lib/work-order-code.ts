import "server-only";
import { prisma } from "@/lib/prisma";
import type { WorkOrderType } from "@/generated/prisma/client";

const TYPE_PREFIXES: Record<WorkOrderType, string> = {
  CORRECTIVE: "CM",
  PREVENTIVE: "PM",
  INSPECTION: "IN",
  MODIFICATION: "MO",
  DECOMMISSION: "DC",
};

function datePartFor(at: Date) {
  const mm = String(at.getMonth() + 1).padStart(2, "0");
  const dd = String(at.getDate()).padStart(2, "0");
  const yy = String(at.getFullYear() % 100).padStart(2, "0");
  return `${mm}${dd}${yy}`;
}

async function countTodayFor(type: WorkOrderType, at: Date) {
  const dayStart = new Date(at.getFullYear(), at.getMonth(), at.getDate());
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  return prisma.workOrder.count({ where: { type, createdAt: { gte: dayStart, lt: dayEnd } } });
}

export async function generateWorkOrderCode(type: WorkOrderType, at: Date = new Date()) {
  const countToday = await countTodayFor(type, at);
  const seq = String(countToday + 1).padStart(3, "0");
  return `${TYPE_PREFIXES[type]}${datePartFor(at)}${seq}`;
}

// Generates `n` sequential codes for one batch, computing the day's starting
// count only once. Safe against the self-collision race that calling
// generateWorkOrderCode() n times in a loop would hit (every call would
// recompute the same count() before any create() commits). Still doesn't
// guard against a genuine external collision (another user creating a
// same-type work order mid-batch) — the caller retries the whole batch
// create on a unique-constraint error, same convention as the single-create
// retry loop.
export async function generateWorkOrderCodeBatch(type: WorkOrderType, n: number, at: Date = new Date()) {
  const countToday = await countTodayFor(type, at);
  const prefix = TYPE_PREFIXES[type];
  const datePart = datePartFor(at);
  return Array.from({ length: n }, (_, i) => `${prefix}${datePart}${String(countToday + i + 1).padStart(3, "0")}`);
}
