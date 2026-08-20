"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser, hasDepartmentAccess } from "@/lib/dal";
import { recordAudit } from "@/lib/audit";
import { sendWorkOrderAssignedEmail } from "@/lib/mailer";
import { buildAttachmentKey, uploadAttachment, deleteAttachmentObject } from "@/lib/s3";
import { generateWorkOrderCode } from "@/lib/work-order-code";

const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024;

const WO_TYPES = ["CORRECTIVE", "PREVENTIVE", "INSPECTION", "MODIFICATION", "DECOMMISSION"] as const;
const WO_PRIORITIES = ["LOW", "NORMAL", "HIGH", "EVENT_CRITICAL"] as const;
const WO_STATUSES = ["OPEN", "ASSIGNED", "IN_PROGRESS", "WAITING_PARTS", "COMPLETE", "CLOSED", "CANCELLED"] as const;

const createSchema = z.object({
  description: z.string().min(1),
  assetTag: z.string().optional(),
  departmentId: z.string().min(1),
  type: z.enum(WO_TYPES),
  priority: z.enum(WO_PRIORITIES),
});

export type WorkOrderFormState = { error?: string } | undefined;

export async function createWorkOrder(
  _prevState: WorkOrderFormState,
  formData: FormData,
): Promise<WorkOrderFormState> {
  const user = await requireCurrentUser();

  const parsed = createSchema.safeParse({
    description: formData.get("description"),
    assetTag: formData.get("assetTag") || undefined,
    departmentId: formData.get("departmentId"),
    type: formData.get("type"),
    priority: formData.get("priority"),
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

  let workOrder;
  for (let attempt = 0; attempt < 3; attempt++) {
    const code = await generateWorkOrderCode(parsed.data.type);
    try {
      workOrder = await prisma.workOrder.create({
        data: {
          code,
          description: parsed.data.description,
          assetId,
          departmentId: parsed.data.departmentId,
          type: parsed.data.type,
          priority: parsed.data.priority,
          reportedByUserId: user.id,
        },
      });
      break;
    } catch (e) {
      const isCodeCollision = e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
      if (!isCodeCollision || attempt === 2) throw e;
    }
  }
  if (!workOrder) return { error: "Could not generate a work order number. Try again." };

  await recordAudit({
    entityType: "WorkOrder",
    entityId: workOrder.id,
    action: "created",
    userId: user.id,
    changes: { code: workOrder.code, type: workOrder.type, priority: workOrder.priority },
  });

  redirect(`/work-orders/${workOrder.code}`);
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

  revalidatePath(`/work-orders/${workOrder.code}`);
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
        code: workOrder.code,
        description: workOrder.description,
        url: new URL(`/work-orders/${workOrder.code}`, base).toString(),
      });
    }
  }

  revalidatePath(`/work-orders/${workOrder.code}`);
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

  revalidatePath(`/work-orders/${workOrder.code}`);
}

const resolutionSchema = z.object({
  workOrderId: z.string().min(1),
  resolutionCodeId: z.string().optional(),
  resolutionNotes: z.string().optional(),
  laborMinutes: z.string().optional(),
});

export async function updateResolution(formData: FormData) {
  const user = await requireCurrentUser();
  const parsed = resolutionSchema.parse({
    workOrderId: formData.get("workOrderId"),
    resolutionCodeId: formData.get("resolutionCodeId") || undefined,
    resolutionNotes: formData.get("resolutionNotes") || undefined,
    laborMinutes: formData.get("laborMinutes") || undefined,
  });
  const workOrder = await requireWorkOrderAccess(parsed.workOrderId);

  await prisma.workOrder.update({
    where: { id: workOrder.id },
    data: {
      resolutionCodeId: parsed.resolutionCodeId || null,
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

  revalidatePath(`/work-orders/${workOrder.code}`);
}

export type AttachmentFormState = { error?: string } | undefined;

export async function uploadWorkOrderAttachments(
  _prevState: AttachmentFormState,
  formData: FormData,
): Promise<AttachmentFormState> {
  const user = await requireCurrentUser();
  const workOrderId = String(formData.get("workOrderId"));
  const workOrder = await requireWorkOrderAccess(workOrderId);

  const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return { error: "Choose at least one photo." };

  for (const file of files) {
    if (!file.type.startsWith("image/")) {
      return { error: `"${file.name}" isn't an image.` };
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
      return { error: `"${file.name}" is over the 8MB limit.` };
    }
  }

  for (const file of files) {
    const key = buildAttachmentKey(workOrder.id, file.name);
    const buffer = Buffer.from(await file.arrayBuffer());
    try {
      await uploadAttachment(key, buffer, file.type);
    } catch {
      return { error: "Upload failed — storage isn't reachable right now. Try again in a bit." };
    }
    await prisma.workOrderAttachment.create({
      data: {
        workOrderId: workOrder.id,
        s3Key: key,
        filename: file.name,
        mimeType: file.type,
        uploadedByUserId: user.id,
      },
    });
  }

  await recordAudit({
    entityType: "WorkOrder",
    entityId: workOrder.id,
    action: "attachments added",
    userId: user.id,
    changes: { count: files.length },
  });

  revalidatePath(`/work-orders/${workOrder.code}`);
}

export async function deleteWorkOrderAttachment(attachmentId: string) {
  const user = await requireCurrentUser();
  const attachment = await prisma.workOrderAttachment.findUniqueOrThrow({
    where: { id: attachmentId },
    include: { workOrder: true },
  });
  const allowed = await hasDepartmentAccess(attachment.workOrder.departmentId, "MEMBER");
  if (!allowed) throw new Error("Not authorized for this work order's department");

  await deleteAttachmentObject(attachment.s3Key);
  await prisma.workOrderAttachment.delete({ where: { id: attachment.id } });

  await recordAudit({
    entityType: "WorkOrder",
    entityId: attachment.workOrderId,
    action: "attachment removed",
    userId: user.id,
    changes: { filename: attachment.filename },
  });

  revalidatePath(`/work-orders/${attachment.workOrder.code}`);
}
