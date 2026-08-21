"use client";

import { useState, useTransition } from "react";
import { updateLocation, type LocationFormState } from "./actions";
import { Button } from "@/components/button";
import type { Location } from "@/generated/prisma/client";

type LocationWithChildren = Location & { children: LocationWithChildren[] };

const LOCATION_TYPES = ["STORAGE_FACILITY", "CONTAINER", "ZONE", "CAMP", "PLACEMENT", "VEHICLE"];
const inputClass = "rounded-md border border-neutral-300 px-2 py-1 text-sm";

function LocationNode({
  node,
  depth,
  allLocations,
}: {
  node: LocationWithChildren;
  depth: number;
  allLocations: Location[];
}) {
  const [editing, setEditing] = useState(false);
  const [state, setState] = useState<LocationFormState>(undefined);
  const [pending, startTransition] = useTransition();

  const eligibleParents = allLocations.filter((l) => l.id !== node.id);

  return (
    <>
      <li style={{ paddingLeft: `${depth * 1.25}rem` }} className="py-1.5 text-sm">
        {editing ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              startTransition(async () => {
                const result = await updateLocation(undefined, formData);
                setState(result);
                if (!result || !("error" in result)) setEditing(false);
              });
            }}
            className="flex flex-wrap items-end gap-2 rounded-md bg-neutral-50 p-2"
          >
            <input type="hidden" name="id" value={node.id} />
            <div>
              <label className="block text-xs font-medium text-neutral-600">Name</label>
              <input name="name" required defaultValue={node.name} className={`mt-1 ${inputClass}`} />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-600">Type</label>
              <select name="type" required defaultValue={node.type} className={`mt-1 ${inputClass}`}>
                {LOCATION_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.replace("_", " ")}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-600">Parent location</label>
              <select name="parentLocationId" defaultValue={node.parentLocationId ?? ""} className={`mt-1 ${inputClass}`}>
                <option value="">—</option>
                {eligibleParents.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" variant="secondary" pending={pending} pendingText="Saving…">
              Save
            </Button>
            <button type="button" onClick={() => setEditing(false)} className="text-xs text-neutral-500 hover:text-neutral-700">
              Cancel
            </button>
            {state?.error && <p className="w-full text-xs text-red-600">{state.error}</p>}
          </form>
        ) : (
          <>
            <span className="font-medium text-neutral-900">{node.name}</span>{" "}
            <span className="text-xs text-neutral-400">{node.type.replace("_", " ").toLowerCase()}</span>{" "}
            <button type="button" onClick={() => setEditing(true)} className="ml-1 text-xs text-neutral-400 hover:text-neutral-700">
              Edit
            </button>
          </>
        )}
      </li>
      {node.children.map((child) => (
        <LocationNode key={child.id} node={child} depth={depth + 1} allLocations={allLocations} />
      ))}
    </>
  );
}

export function LocationTree({ tree, allLocations }: { tree: LocationWithChildren[]; allLocations: Location[] }) {
  return (
    <ul className="rounded-md border border-neutral-200 bg-white p-4">
      {tree.length === 0 && <li className="text-sm text-neutral-500">No locations yet.</li>}
      {tree.map((node) => (
        <LocationNode key={node.id} node={node} depth={0} allLocations={allLocations} />
      ))}
    </ul>
  );
}
