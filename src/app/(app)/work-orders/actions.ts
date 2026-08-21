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
import { WO_TYPES, WO_PRIORITIES, WO_STATUSES, ALLOWED_ATTACHMENT_TYPES, NOTE_FORMATS } from "@/lib/constants";
import { sanitizeNoteBody } from "@/lib/notes";

const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;

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

const reopenSchema = z.object({
  workOrderId: z.string().min(1),
});

export async function reopenWorkOrder(formData: FormData) {
  const user = await requireCurrentUser();
  const parsed = reopenSchema.parse({
    workOrderId: formData.get("workOrderId"),
  });
  const workOrder = await requireWorkOrderAccess(parsed.workOrderId);

  await prisma.workOrder.update({
    where: { id: workOrder.id },
    data: { status: "OPEN", closedAt: null },
  });

  await recordAudit({
    entityType: "WorkOrder",
    entityId: workOrder.id,
    action: "reopened",
    userId: user.id,
    changes: { from: workOrder.status },
  });

  revalidatePath(`/work-orders/${workOrder.code}`);
}

const assetSchema = z.object({
  workOrderId: z.string().min(1),
  assetTag: z.string().optional(),
});

export type UpdateAssetState = { error?: string } | undefined;

export async function updateWorkOrderAsset(
  _prevState: UpdateAssetState,
  formData: FormData,
): Promise<UpdateAssetState> {
  const user = await requireCurrentUser();
  const parsed = assetSchema.parse({
    workOrderId: formData.get("workOrderId"),
    assetTag: formData.get("assetTag") || undefined,
  });
  const workOrder = await requireWorkOrderAccess(parsed.workOrderId);

  let assetId: string | null = null;
  if (parsed.assetTag) {
    const asset = await prisma.asset.findUnique({ where: { assetTag: parsed.assetTag } });
    if (!asset) return { error: `No asset with tag "${parsed.assetTag}".` };
    assetId = asset.id;
  }

  await prisma.workOrder.update({ where: { id: workOrder.id }, data: { assetId } });

  await recordAudit({
    entityType: "WorkOrder",
    entityId: workOrder.id,
    action: assetId ? "asset linked" : "asset unlinked",
    userId: user.id,
    changes: { assetTag: parsed.assetTag ?? null },
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
    data: { assignedToUserId },
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
  format: z.enum(NOTE_FORMATS),
});

export async function addWorkOrderNote(formData: FormData) {
  const user = await requireCurrentUser();
  const parsed = noteSchema.parse({
    workOrderId: formData.get("workOrderId"),
    body: formData.get("body"),
    format: formData.get("format"),
  });
  const workOrder = await requireWorkOrderAccess(parsed.workOrderId);

  await prisma.workOrderNote.create({
    data: {
      workOrderId: workOrder.id,
      userId: user.id,
      body: sanitizeNoteBody(parsed.body, parsed.format),
      format: parsed.format,
    },
  });

  await recordAudit({
    entityType: "WorkOrder",
    entityId: workOrder.id,
    action: "note added",
    userId: user.id,
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
  if (files.length === 0) return { error: "Choose at least one file." };

  for (const file of files) {
    if (!ALLOWED_ATTACHMENT_TYPES.includes(file.type)) {
      return { error: `"${file.name}" isn't a supported file type.` };
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
      return { error: `"${file.name}" is over the 20MB limit.` };
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

const workOrderPartSchema = z.object({
  workOrderId: z.string().min(1),
  partNumber: z.string().min(1),
  description: z.string().optional(),
  quantity: z.coerce.number().int().positive().default(1),
  price: z.coerce.number().nonnegative().optional(),
  orderQuantity: z.coerce.number().int().positive().default(1),
  orderedAt: z.coerce.date().optional(),
});

export type WorkOrderPartFormState = { error: string } | { ok: true } | undefined;

export async function addWorkOrderPart(
  _prevState: WorkOrderPartFormState,
  formData: FormData,
): Promise<WorkOrderPartFormState> {
  const user = await requireCurrentUser();
  const parsed = workOrderPartSchema.safeParse({
    workOrderId: formData.get("workOrderId"),
    partNumber: formData.get("partNumber"),
    description: formData.get("description") || undefined,
    quantity: formData.get("quantity") || undefined,
    price: formData.get("price") || undefined,
    orderQuantity: formData.get("orderQuantity") || undefined,
    orderedAt: formData.get("orderedAt") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const workOrder = await requireWorkOrderAccess(parsed.data.workOrderId);
  const asset = workOrder.assetId ? await prisma.asset.findUnique({ where: { id: workOrder.assetId } }) : null;
  if (!asset) {
    return { error: "Link an asset to this work order before logging parts used." };
  }

  let part = await prisma.part.findUnique({
    where: { assetTypeId_partNumber: { assetTypeId: asset.assetTypeId, partNumber: parsed.data.partNumber } },
  });
  if (!part) {
    if (!parsed.data.description) {
      return { error: `"${parsed.data.partNumber}" is a new part — add a description to create it.` };
    }
    part = await prisma.part.create({
      data: {
        assetTypeId: asset.assetTypeId,
        partNumber: parsed.data.partNumber,
        description: parsed.data.description,
      },
    });
    await recordAudit({
      entityType: "Part",
      entityId: part.id,
      action: "created from work order",
      userId: user.id,
      changes: { partNumber: part.partNumber, workOrderCode: workOrder.code },
    });
  }

  await prisma.workOrderPart.create({
    data: {
      workOrderId: workOrder.id,
      partId: part.id,
      quantity: parsed.data.quantity,
      createdByUserId: user.id,
    },
  });

  if (parsed.data.price !== undefined || parsed.data.orderedAt) {
    await prisma.partOrder.create({
      data: {
        partId: part.id,
        price: parsed.data.price,
        quantity: parsed.data.orderQuantity,
        orderedAt: parsed.data.orderedAt,
        createdByUserId: user.id,
      },
    });
  }

  await recordAudit({
    entityType: "WorkOrder",
    entityId: workOrder.id,
    action: "part used",
    userId: user.id,
    changes: { partNumber: part.partNumber, quantity: parsed.data.quantity },
  });

  revalidatePath(`/work-orders/${workOrder.code}`);
  revalidatePath(`/admin/asset-types/${asset.assetTypeId}`);
  return { ok: true };
}

export async function deleteWorkOrderPart(workOrderPartId: string) {
  const user = await requireCurrentUser();
  const use = await prisma.workOrderPart.findUniqueOrThrow({
    where: { id: workOrderPartId },
    include: { workOrder: true },
  });
  const allowed = await hasDepartmentAccess(use.workOrder.departmentId, "MEMBER");
  if (!allowed) throw new Error("Not authorized for this work order's department");

  await prisma.workOrderPart.delete({ where: { id: use.id } });

  await recordAudit({
    entityType: "WorkOrder",
    entityId: use.workOrderId,
    action: "part usage removed",
    userId: user.id,
  });

  revalidatePath(`/work-orders/${use.workOrder.code}`);
}
