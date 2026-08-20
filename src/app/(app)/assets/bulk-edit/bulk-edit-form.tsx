"use client";

import { useActionState, useState } from "react";
import type { Location } from "@/generated/prisma/client";
import { CUSTOM_LOCATION_VALUE } from "@/lib/location-input";
import { ASSET_STATUSES } from "@/lib/constants";
import { bulkEditAssets } from "./actions";
import { Button } from "@/components/button";
const inputClass = "rounded-md border border-neutral-300 px-2 py-1.5 text-sm";

export function BulkEditForm({ ids, locations }: { ids: string[]; locations: Location[] }) {
  const [state, action, pending] = useActionState(bulkEditAssets, undefined);
  const [locationChange, setLocationChange] = useState<"none" | "clear" | "set">("none");
  const [locationId, setLocationId] = useState("");

  return (
    <form action={action} className="space-y-4 rounded-md border border-neutral-200 bg-white p-4">
      {ids.map((id) => (
        <input key={id} type="hidden" name="ids" value={id} />
      ))}

      <div>
        <label className={`block text-xs font-medium text-neutral-600`}>Status</label>
        <select name="status" defaultValue="" className={`${inputClass} mt-1`}>
          <option value="">— No change —</option>
          {ASSET_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace("_", " ")}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-neutral-600">Location</label>
        <select
          name="locationChange"
          value={locationChange}
          onChange={(e) => setLocationChange(e.target.value as "none" | "clear" | "set")}
          className={`${inputClass} mt-1`}
        >
          <option value="none">— No change —</option>
          <option value="clear">Clear location</option>
          <option value="set">Set to…</option>
        </select>

        {locationChange === "set" && (
          <div className="mt-2">
            <select
              name="locationId"
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              className={`${inputClass} w-full`}
            >
              <option value="">Choose a location…</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
              <option value={CUSTOM_LOCATION_VALUE}>Other / custom…</option>
            </select>
            {locationId === CUSTOM_LOCATION_VALUE && (
              <input
                name="customLocationText"
                required
                placeholder="Describe where it is…"
                className={`${inputClass} mt-2 w-full`}
              />
            )}
          </div>
        )}
      </div>

      <Button type="submit" pending={pending} pendingText="Applying…">
        Apply to {ids.length} asset{ids.length === 1 ? "" : "s"}
      </Button>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
