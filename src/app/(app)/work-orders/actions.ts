"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser, hasDepartmentAccess } from "@/lib/dal";
import { recordAudit } from "@/lib/audit";
import { sendWorkOrderAssignedEmail } from "@/lib/mailer";

const WO_TYPES = ["CORRECTIVE", "PREVENTIVE", "INSPECTION", "MODIFICATION", "DECOMMISSION"] as const;
const WO_PRIORITIES = ["LOW", "NORMAL", "HIGH", "EVENT_CRITICAL"] as const;
const WO_STATUSES = ["OPEN", "ASSIGNED", "IN_PROGRESS", "WAITING_PARTS", "COMPLETE", "CLOSED", "CANCELLED"] as const;

const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  assetTag: z.string().optional(),
  departmentId: z.string().min(1),
  type: z.enum(WO_TYPES),
  priority: z.enum(WO_PRIORITIES),
  failureCodeId: z.string().optional(),
});

export type WorkOrderFormState = { error?: string } | undefined;

export async function createWorkOrder(
  _prevState: WorkOrderFormState,
  formData: FormData,
): Promise<WorkOrderFormState> {
  const user = await requireCurrentUser();

  const parsed = createSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    assetTag: formData.get("assetTag") || undefined,
    departmentId: formData.get("departmentId"),
    type: formData.get("type"),
    priority: formData.get("priority"),
    failureCodeId: formData.get("failureCodeId") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const allowed = await hasDepartmentAccess(parsed.data.departmentId, "MEMBER");
  if (!allowed) return { error: "You don't have permission to file work orders for that department." };

  let assetId: string | null = null;
  if (parsed.data.assetTag) {
    const asset = await prisma.asset.findUnique({ where: { assetTag: parsed.data.assetTag } });
    if (!asset) return { error: `No asset with tag "${parsed.data.assetTag}".` };
    assetId = asset.id;
  }

  const workOrder = await prisma.workOrder.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description,
      assetId,
      departmentId: parsed.data.departmentId,
      type: parsed.data.type,
      priority: parsed.data.priority,
      failureCodeId: parsed.data.failureCodeId || null,
      reportedByUserId: user.id,
    },
  });

  await recordAudit({
    entityType: "WorkOrder",
    entityId: workOrder.id,
    action: "created",
    userId: user.id,
    changes: { title: workOrder.title, type: workOrder.type, priority: workOrder.priority },
  });

  redirect(`/work-orders/${workOrder.woNumber}`);
}

async function requireWorkOrderAccess(workOrderId: string, minRole: "MEMBER" | "LEAD" = "MEMBER") {
  const workOrder = await prisma.workOrder.findUniqueOrThrow({ where: { id: workOrderId } });
  const allowed = await hasDepartmentAccess(workOrder.departmentId, minRole);
  if (!allowed) throw new Error("Not authorized for this work order's department");
  return workOrder;
}

const statusSchema = z.object({
  workOrderId: z.string().min(1),
  status: z.enum(WO_STATUSES),
});

export async function updateWorkOrderStatus(formData: FormData) {
  const user = await requireCurrentUser();
  const parsed = statusSchema.parse({
    workOrderId: formData.get("workOrderId"),
    status: formData.get("status"),
  });
  const workOrder = await requireWorkOrderAccess(parsed.workOrderId);

  const now = new Date();
  await prisma.workOrder.update({
    where: { id: workOrder.id },
    data: {
      status: parsed.status,
      startedAt: parsed.status === "IN_PROGRESS" && !workOrder.startedAt ? now : undefined,
      completedAt: parsed.status === "COMPLETE" ? now : undefined,
      closedAt: parsed.status === "CLOSED" ? now : undefined,
    },
  });

  await recordAudit({
    entityType: "WorkOrder",
    entityId: workOrder.id,
    action: "status changed",
    userId: user.id,
    changes: { from: workOrder.status, to: parsed.status },
  });

  revalidatePath(`/work-orders/${workOrder.woNumber}`);
}

const assignSchema = z.object({
  workOrderId: z.string().min(1),
  assignedToUserId: z.string().optional(),
});

export async function assignWorkOrder(formData: FormData) {
  const user = await requireCurrentUser();
  const parsed = assignSchema.parse({
    workOrderId: formData.get("workOrderId"),
    assignedToUserId: formData.get("assignedToUserId") || undefined,
  });
  const workOrder = await requireWorkOrderAccess(parsed.workOrderId);

  const assignedToUserId = parsed.assignedToUserId || null;
  await prisma.workOrder.update({
    where: { id: workOrder.id },
    data: {
      assignedToUserId,
      status: assignedToUserId && workOrder.status === "OPEN" ? "ASSIGNED" : workOrder.status,
    },
  });

  await recordAudit({
    entityType: "WorkOrder",
    entityId: workOrder.id,
    action: assignedToUserId ? "assigned" : "unassigned",
    userId: user.id,
    changes: { assignedToUserId },
  });

  if (assignedToUserId) {
    const assignee = await prisma.user.findUnique({ where: { id: assignedToUserId } });
    if (assignee?.notifyByEmail) {
      const base = process.env.APP_BASE_URL ?? "http://localhost:3000";
      await sendWorkOrderAssignedEmail({
        email: assignee.email,
        woNumber: workOrder.woNumber,
        title: workOrder.title,
        url: new URL(`/work-orders/${workOrder.woNumber}`, base).toString(),
      });
    }
  }

  revalidatePath(`/work-orders/${workOrder.woNumber}`);
}

const noteSchema = z.object({
  workOrderId: z.string().min(1),
  body: z.string().min(1),
});

export async function addWorkOrderNote(formData: FormData) {
  const user = await requireCurrentUser();
  const parsed = noteSchema.parse({
    workOrderId: formData.get("workOrderId"),
    body: formData.get("body"),
  });
  const workOrder = await requireWorkOrderAccess(parsed.workOrderId);

  await prisma.workOrderNote.create({
    data: { workOrderId: workOrder.id, userId: user.id, body: parsed.body },
  });

  revalidatePath(`/work-orders/${workOrder.woNumber}`);
}

const resolutionSchema = z.object({
  workOrderId: z.string().min(1),
  resolutionNotes: z.string().optional(),
  laborMinutes: z.string().optional(),
});

export async function updateResolution(formData: FormData) {
  const user = await requireCurrentUser();
  const parsed = resolutionSchema.parse({
    workOrderId: formData.get("workOrderId"),
    resolutionNotes: formData.get("resolutionNotes") || undefined,
    laborMinutes: formData.get("laborMinutes") || undefined,
  });
  const workOrder = await requireWorkOrderAccess(parsed.workOrderId);

  await prisma.workOrder.update({
    where: { id: workOrder.id },
    data: {
      resolutionNotes: parsed.resolutionNotes,
      laborMinutes: parsed.laborMinutes ? Number(parsed.laborMinutes) : null,
    },
  });

  await recordAudit({
    entityType: "WorkOrder",
    entityId: workOrder.id,
    action: "resolution updated",
    userId: user.id,
  });

  revalidatePath(`/work-orders/${workOrder.woNumber}`);
}
