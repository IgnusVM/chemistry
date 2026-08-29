import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/dal";
import { LocationForm } from "./location-form";
import { LocationTree } from "./location-tree";
import type { Location } from "@/generated/prisma/client";
import { HelpLink } from "@/components/help-link";

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

export default async function LocationsPage() {
  await requireCurrentUser();
  const locations = await prisma.location.findMany({ orderBy: { name: "asc" } });
  const tree = buildTree(locations);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-1">
          <h1 className="text-lg font-semibold text-neutral-900">Locations</h1>
          <HelpLink topic="Locations" article="locations/understanding-locations" />
        </div>
      </div>

      <LocationForm locations={locations} />

      <LocationTree tree={tree} allLocations={locations} />
    </div>
  );
}
