import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/dal";
import { assetQrDataUrl, assetScanUrl } from "@/lib/qr";
import { changeAssetStatus, moveAsset, updateAssetValue } from "../actions";
import type { CustomFieldDef } from "@/lib/custom-fields";
import { LocationField } from "@/components/location-field";
import { Button, buttonClass } from "@/components/button";

const ASSET_STATUSES = ["ACTIVE", "IN_REPAIR", "STORAGE", "RETIRED", "LOST", "DESTROYED"];
const WO_STATUS_STYLES: Record<string, string> = {
  OPEN: "bg-blue-100 text-blue-800",
  IN_PROGRESS: "bg-amber-100 text-amber-800",
  WAITING_PARTS: "bg-orange-100 text-orange-800",
  COMPLETE: "bg-green-100 text-green-800",
  CLOSED: "bg-neutral-200 text-neutral-500",
  CANCELLED: "bg-neutral-200 text-neutral-400",
};

export default async function AssetDetailPage({
  params,
}: {
  params: Promise<{ assetTag: string }>;
}) {
  await requireCurrentUser();
  const { assetTag } = await params;

  const asset = await prisma.asset.findUnique({
    where: { assetTag },
    include: {
      assetType: true,
      owningDepartment: true,
      currentLocation: true,
      locationHistory: {
        orderBy: { movedAt: "desc" },
        include: { location: true, movedBy: true },
        take: 20,
      },
    },
  });
  if (!asset) notFound();

  const [locations, auditEntries, qrDataUrl, workOrders] = await Promise.all([
    prisma.location.findMany({ orderBy: { name: "asc" } }),
    prisma.auditLog.findMany({
      where: { entityType: "Asset", entityId: asset.id },
      orderBy: { createdAt: "desc" },
      include: { user: true },
      take: 20,
    }),
    assetQrDataUrl(asset.assetTag),
    prisma.workOrder.findMany({
      where: { assetId: asset.id },
      orderBy: { reportedAt: "desc" },
      take: 10,
    }),
  ]);

  const fieldDefs = (asset.assetType.customFieldSchema as unknown as CustomFieldDef[]) ?? [];
  const customFields = (asset.customFields as Record<string, unknown>) ?? {};

  const timeline = [
    ...asset.locationHistory.map((h) => ({
      at: h.movedAt,
      label: h.location ? `Moved to ${h.location.name}` : "Moved to",
      custom: h.location ? null : h.customLocationText,
      by: h.movedBy?.displayName,
      notes: h.notes,
    })),
    ...auditEntries
      .filter((a) => a.action !== "created")
      .map((a) => ({
        at: a.createdAt,
        label: a.action,
        custom: null as string | null,
        by: a.user?.displayName,
        notes: null as string | null,
      })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime());

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs uppercase tracking-wide text-neutral-400">{asset.assetType.name}</div>
            <h1 className="text-xl font-semibold text-neutral-900">{asset.name}</h1>
            <div className="text-sm text-neutral-500">
              {asset.assetTag} · {asset.owningDepartment.name}
            </div>
            {asset.description && <p className="mt-2 text-sm text-neutral-700">{asset.description}</p>}
          </div>
          <Link href={`/work-orders/new?asset=${asset.assetTag}`} className={buttonClass("secondary")}>
            Report a problem
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-4 rounded-md border border-neutral-200 bg-white p-4 text-sm sm:grid-cols-4">
          <InfoTile label="Condition" value={asset.condition} />
          <InfoTile
            label="Location"
            value={
              asset.currentLocation ? (
                asset.currentLocation.name
              ) : asset.customLocationText ? (
                <>
                  {asset.customLocationText} <CustomLocationMark />
                </>
              ) : (
                "—"
              )
            }
          />
          <InfoTile label="Value" value={asset.acquisitionCost ? `$${asset.acquisitionCost.toString()}` : "—"} />
          <InfoTile
            label="Acquired"
            value={asset.acquisitionDate ? asset.acquisitionDate.toLocaleDateString() : "—"}
          />
          <InfoTile label="Created" value={asset.createdAt.toLocaleDateString()} />
        </div>

        {fieldDefs.length > 0 && (
          <div className="rounded-md border border-neutral-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-neutral-900">{asset.assetType.name} details</h2>
            <dl className="mt-2 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              {fieldDefs.map((def) => (
                <div key={def.key}>
                  <dt className="text-xs text-neutral-500">{def.label}</dt>
                  <dd className="text-neutral-900">{String(customFields[def.key] ?? "—")}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        {asset.notes && (
          <div className="rounded-md border border-neutral-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-neutral-900">Notes</h2>
            <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-700">{asset.notes}</p>
          </div>
        )}

        {workOrders.length > 0 && (
          <div className="rounded-md border border-neutral-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-neutral-900">Work orders</h2>
            <ul className="mt-2 divide-y divide-neutral-200">
              {workOrders.map((wo) => (
                <li key={wo.id} className="flex items-center justify-between py-2 text-sm">
                  <Link href={`/work-orders/${wo.code}`} className="hover:underline">
                    {wo.code} · {wo.description}
                  </Link>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${WO_STATUS_STYLES[wo.status]}`}>
                    {wo.status.replace("_", " ")}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="rounded-md border border-neutral-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-neutral-900">History</h2>
          <ul className="mt-2 divide-y divide-neutral-200">
            {timeline.length === 0 && <li className="py-2 text-sm text-neutral-500">No history yet.</li>}
            {timeline.map((entry, i) => (
              <li key={i} className="py-2 text-sm">
                <span className="text-neutral-900">
                  {entry.label}
                  {entry.custom && (
                    <>
                      {" "}
                      {entry.custom} <CustomLocationMark />
                    </>
                  )}
                </span>
                {entry.by && <span className="text-neutral-500"> · {entry.by}</span>}
                <span className="ml-2 text-xs text-neutral-400">{entry.at.toLocaleString()}</span>
                {entry.notes && <div className="text-xs text-neutral-500">{entry.notes}</div>}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="space-y-6">
        <div className="rounded-md border border-neutral-200 bg-white p-4 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrDataUrl} alt={`QR code for ${asset.assetTag}`} width={180} height={180} className="mx-auto" />
          <div className="mt-2 text-xs text-neutral-500">{assetScanUrl(asset.assetTag)}</div>
        </div>

        <form
          action={async (formData: FormData) => {
            "use server";
            formData.set("assetId", asset.id);
            await changeAssetStatus(formData);
          }}
          className="space-y-2 rounded-md border border-neutral-200 bg-white p-4"
        >
          <h2 className="text-sm font-semibold text-neutral-900">Status</h2>
          <select
            key={asset.status}
            name="status"
            defaultValue={asset.status}
            className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
          >
            {ASSET_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace("_", " ")}
              </option>
            ))}
          </select>
          <Button type="submit" className="w-full">
            Update status
          </Button>
        </form>

        <form
          action={async (formData: FormData) => {
            "use server";
            formData.set("assetId", asset.id);
            await updateAssetValue(formData);
          }}
          className="space-y-2 rounded-md border border-neutral-200 bg-white p-4"
        >
          <h2 className="text-sm font-semibold text-neutral-900">Value</h2>
          <input
            key={asset.acquisitionCost?.toString() ?? "none"}
            name="acquisitionCost"
            type="number"
            min={0}
            step="0.01"
            defaultValue={asset.acquisitionCost?.toString() ?? ""}
            placeholder="$0.00"
            className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
          />
          <Button type="submit" variant="secondary" className="w-full">
            Save value
          </Button>
        </form>

        <form
          action={async (formData: FormData) => {
            "use server";
            formData.set("assetId", asset.id);
            await moveAsset(formData);
          }}
          className="space-y-2 rounded-md border border-neutral-200 bg-white p-4"
        >
          <h2 className="text-sm font-semibold text-neutral-900">Move</h2>
          <LocationField key={asset.updatedAt.toISOString()} name="locationId" locations={locations} />
          <input
            name="notes"
            placeholder="Notes (optional)"
            className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
          />
          <Button type="submit" variant="secondary" className="w-full">
            Record move
          </Button>
        </form>
      </div>
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-neutral-500">{label}</div>
      <div className="font-medium text-neutral-900">{value}</div>
    </div>
  );
}

function CustomLocationMark() {
  return (
    <span title="Custom location — not on the standard locations list" className="text-amber-500">
      *
    </span>
  );
}
