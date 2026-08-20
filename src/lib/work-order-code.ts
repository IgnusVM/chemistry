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

export async function generateWorkOrderCode(type: WorkOrderType, at: Date = new Date()) {
  const prefix = TYPE_PREFIXES[type];
  const mm = String(at.getMonth() + 1).padStart(2, "0");
  const dd = String(at.getDate()).padStart(2, "0");
  const yy = String(at.getFullYear() % 100).padStart(2, "0");
  const datePart = `${mm}${dd}${yy}`;

  const dayStart = new Date(at.getFullYear(), at.getMonth(), at.getDate());
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  const countToday = await prisma.workOrder.count({
    where: { type, createdAt: { gte: dayStart, lt: dayEnd } },
  });

  const seq = String(countToday + 1).padStart(3, "0");
  return `${prefix}${datePart}${seq}`;
}
