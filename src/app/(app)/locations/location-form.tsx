"use client";

import { useActionState } from "react";
import { createLocation } from "./actions";
import type { Location } from "@/generated/prisma/client";
import { Button } from "@/components/button";

const LOCATION_TYPES = ["STORAGE_FACILITY", "CONTAINER", "ZONE", "CAMP", "PLACEMENT", "VEHICLE"];

export function LocationForm({ locations }: { locations: Location[] }) {
  const [state, action, pending] = useActionState(createLocation, undefined);

  return (
    <form action={action} className="flex flex-wrap items-end gap-3 rounded-md border border-neutral-200 bg-white p-4">
      <div>
        <label className="block text-xs font-medium text-neutral-600">Name</label>
        <input name="name" required className="mt-1 rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
      </div>
      <div>
        <label className="block text-xs font-medium text-neutral-600">Type</label>
        <select name="type" required className="mt-1 rounded-md border border-neutral-300 px-2 py-1.5 text-sm">
          {LOCATION_TYPES.map((t) => (
            <option key={t} value={t}>
              {t.replace("_", " ")}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-neutral-600">Parent location</label>
        <select name="parentLocationId" className="mt-1 rounded-md border border-neutral-300 px-2 py-1.5 text-sm">
          <option value="">(None)</option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" pending={pending} pendingText="Adding…">
        Add location
      </Button>
      {state?.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
