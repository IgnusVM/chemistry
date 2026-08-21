"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser, requireOrgAdmin } from "@/lib/dal";
import { recordAudit } from "@/lib/audit";

const LOCATION_TYPES = [
  "STORAGE_FACILITY",
  "CONTAINER",
  "ZONE",
  "CAMP",
  "PLACEMENT",
  "VEHICLE",
] as const;

const locationSchema = z.object({
  name: z.string().min(1),
  type: z.enum(LOCATION_TYPES),
  parentLocationId: z.string().optional(),
});

export type LocationFormState = { error?: string } | undefined;

export async function createLocation(
  _prevState: LocationFormState,
  formData: FormData,
): Promise<LocationFormState> {
  const user = await requireCurrentUser();

  const parsed = locationSchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
    parentLocationId: formData.get("parentLocationId") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const location = await prisma.location.create({
    data: {
      name: parsed.data.name,
      type: parsed.data.type,
      parentLocationId: parsed.data.parentLocationId || null,
    },
  });

  await recordAudit({
    entityType: "Location",
    entityId: location.id,
    action: "created",
    userId: user.id,
    changes: parsed.data,
  });

  revalidatePath("/locations");
}

const updateLocationSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(LOCATION_TYPES),
  parentLocationId: z.string().optional(),
});

export async function updateLocation(
  _prevState: LocationFormState,
  formData: FormData,
): Promise<LocationFormState> {
  const admin = await requireOrgAdmin();

  const parsed = updateLocationSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    type: formData.get("type"),
    parentLocationId: formData.get("parentLocationId") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { id, parentLocationId } = parsed.data;
  if (parentLocationId) {
    if (parentLocationId === id) {
      return { error: "A location can't be its own parent." };
    }
    let cursor: string | null = parentLocationId;
    while (cursor) {
      const node: { parentLocationId: string | null } | null = await prisma.location.findUnique({
        where: { id: cursor },
        select: { parentLocationId: true },
      });
      if (!node) break;
      if (node.parentLocationId === id) {
        return { error: "Can't move a location under one of its own descendants." };
      }
      cursor = node.parentLocationId;
    }
  }

  await prisma.location.update({
    where: { id },
    data: { name: parsed.data.name, type: parsed.data.type, parentLocationId: parentLocationId || null },
  });

  await recordAudit({
    entityType: "Location",
    entityId: id,
    action: "updated",
    userId: admin.id,
    changes: parsed.data,
  });

  revalidatePath("/locations");
}
