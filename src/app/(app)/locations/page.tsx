import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/dal";
import { LocationForm } from "./location-form";
import type { Location } from "@/generated/prisma/client";

type LocationWithChildren = Location & { children: LocationWithChildren[] };

function buildTree(locations: Location[]): LocationWithChildren[] {
  const byId = new Map<string, LocationWithChildren>(
    locations.map((l) => [l.id, { ...l, children: [] }]),
  );
  const roots: LocationWithChildren[] = [];
  for (const loc of byId.values()) {
    if (loc.parentLocationId && byId.has(loc.parentLocationId)) {
      byId.get(loc.parentLocationId)!.children.push(loc);
    } else {
      roots.push(loc);
    }
  }
  return roots;
}

function LocationNode({ node, depth }: { node: LocationWithChildren; depth: number }) {
  return (
    <>
      <li style={{ paddingLeft: `${depth * 1.25}rem` }} className="py-1.5 text-sm">
        <span className="font-medium text-neutral-900">{node.name}</span>{" "}
        <span className="text-xs text-neutral-400">{node.type.replace("_", " ").toLowerCase()}</span>
      </li>
      {node.children.map((child) => (
        <LocationNode key={child.id} node={child} depth={depth + 1} />
      ))}
    </>
  );
}

export default async function LocationsPage() {
  await requireCurrentUser();
  const locations = await prisma.location.findMany({ orderBy: { name: "asc" } });
  const tree = buildTree(locations);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-neutral-900">Locations</h1>
        <p className="text-sm text-neutral-500">
          Storage facilities off-season, camps and placements during events.
        </p>
      </div>

      <LocationForm locations={locations} />

      <ul className="rounded-md border border-neutral-200 bg-white p-4">
        {tree.length === 0 && <li className="text-sm text-neutral-500">No locations yet.</li>}
        {tree.map((node) => (
          <LocationNode key={node.id} node={node} depth={0} />
        ))}
      </ul>
    </div>
  );
}
