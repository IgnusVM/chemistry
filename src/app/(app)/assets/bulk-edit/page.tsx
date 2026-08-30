import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/dal";
import { readBulkSelection } from "@/lib/bulk-selection";
import { BulkEditForm } from "./bulk-edit-form";

export default async function BulkEditAssetsPage({
  searchParams,
}: {
  searchParams: Promise<{ selection?: string }>;
}) {
  const user = await requireCurrentUser();
  const { selection } = await searchParams;

  const ids = selection ? await readBulkSelection("Asset", selection, user.id) : [];

  if (ids.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-lg font-semibold text-neutral-900">Bulk edit assets</h1>
        <p className="text-sm text-neutral-500">
          Your selection has expired or wasn&rsquo;t found. Go back to{" "}
          <Link href="/assets" className="text-fuchsia-700 hover:underline">
            Assets
          </Link>{" "}
          and select some again.
        </p>
      </div>
    );
  }

  const [assets, locations] = await Promise.all([
    prisma.asset.findMany({
      where: { id: { in: ids } },
      orderBy: { assetTag: "asc" },
      select: { id: true, assetTag: true, name: true },
    }),
    prisma.location.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/assets" className="text-xs text-neutral-500 hover:underline">
          ← Assets
        </Link>
        <h1 className="text-lg font-semibold text-neutral-900">Bulk edit {assets.length} assets</h1>
        <p className="text-sm text-neutral-500">
          Only status and location can be changed in bulk. Everything else stays per-asset.
        </p>
      </div>

      <div className="rounded-md border border-neutral-200 bg-white p-4">
        <div className="max-h-40 overflow-y-auto text-sm text-neutral-600">
          {assets.map((a) => (
            <div key={a.id}>
              <span className="font-medium text-neutral-900">{a.assetTag}</span> · {a.name}
            </div>
          ))}
        </div>
      </div>

      <BulkEditForm ids={assets.map((a) => a.id)} locations={locations} />
    </div>
  );
}
