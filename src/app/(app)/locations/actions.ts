"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/dal";
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
