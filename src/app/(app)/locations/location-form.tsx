"use client";

import { useActionState } from "react";
import { createLocation } from "./actions";
import type { Location } from "@/generated/prisma/client";

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
          <option value="">—</option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
      >
        {pending ? "Adding…" : "Add location"}
      </button>
      {state?.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
