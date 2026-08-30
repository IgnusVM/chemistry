import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export type AssetListParams = {
  q?: string;
  searchBy?: string;
  department?: string;
  status?: string;
  type?: string;
  location?: string;
  condition?: string;
};

/**
 * What the "search by" selector offers.
 *
 * "Any field" is the default and stays the default: someone with a number in
 * their hand should be able to paste it in and find the thing, without first
 * deciding what kind of number it is.
 */
export const ASSET_SEARCH_FIELDS = [
  { value: "any", label: "Any field" },
  { value: "assetTag", label: "Asset tag" },
  { value: "name", label: "Name" },
  { value: "description", label: "Description" },
  { value: "type", label: "Asset type" },
  { value: "department", label: "Department" },
  { value: "location", label: "Location" },
  { value: "notes", label: "Notes" },
  { value: "custom", label: "Custom fields (serials, lots, batches)" },
] as const;

const like = (q: string) => ({ contains: q, mode: "insensitive" as const });

/**
 * Assets whose custom fields contain the query, anywhere.
 *
 * Custom fields are a JSON blob whose keys differ per asset type, so there is
 * no column to filter on and Prisma's JSON filters need a specific path — which
 * would mean the caller already knowing which field a serial lives in, the
 * thing they are searching to find out. Casting the whole blob to text and
 * matching it is what makes "any field" honest.
 *
 * ILIKE rather than Prisma's `string_contains`, which is case-sensitive: nobody
 * types a serial with the same capitalisation it was entered with.
 *
 * It is a sequential scan. At this organisation's scale (hundreds of assets)
 * that is nothing; if the fleet ever reaches a size where it matters, the fix
 * is a GIN index on the blob, not a narrower search.
 */
async function assetIdsMatchingCustomFields(q: string): Promise<string[]> {
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM "Asset" WHERE "customFields"::text ILIKE ${`%${q}%`}
  `;
  return rows.map((r) => r.id);
}

export async function buildAssetWhere(params: AssetListParams): Promise<Prisma.AssetWhereInput> {
  const and: Prisma.AssetWhereInput[] = [];

  if (params.department) and.push({ owningDepartmentId: params.department });
  if (params.type) and.push({ assetTypeId: params.type });
  if (params.location) and.push({ currentLocationId: params.location });
  if (params.status) and.push({ status: params.status as Prisma.EnumAssetStatusFilter["equals"] });
  if (params.condition) {
    and.push({ condition: params.condition as Prisma.EnumAssetConditionFilter["equals"] });
  }

  const q = params.q?.trim();
  if (q) {
    const byField: Record<string, Prisma.AssetWhereInput> = {
      assetTag: { assetTag: like(q) },
      name: { name: like(q) },
      description: { description: like(q) },
      type: { assetType: { name: like(q) } },
      department: { owningDepartment: { name: like(q) } },
      location: {
        OR: [{ currentLocation: { name: like(q) } }, { customLocationText: like(q) }],
      },
      notes: { notes: { some: { body: like(q) } } },
    };

    const by = params.searchBy && params.searchBy !== "any" ? params.searchBy : null;

    if (by === "custom") {
      and.push({ id: { in: await assetIdsMatchingCustomFields(q) } });
    } else if (by && byField[by]) {
      and.push(byField[by]);
    } else {
      const customIds = await assetIdsMatchingCustomFields(q);
      and.push({
        OR: [
          ...Object.values(byField).flatMap((f) => (f.OR ? f.OR : [f])),
          ...(customIds.length ? [{ id: { in: customIds } }] : []),
        ],
      });
    }
  }

  // AND rather than merging keys: a location filter and a location search both
  // want to constrain the same relation, and merging would have one quietly
  // overwrite the other.
  return and.length ? { AND: and } : {};
}
