import Link from "next/link";
import { notFound } from "next/navigation";
import { PackageOpen } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/dal";
import { assetQrDataUrl, assetScanUrl } from "@/lib/qr";
import { changeAssetStatus, moveAsset, updateAssetValue, addAssetNote } from "../actions";
import type { CustomFieldDef } from "@/lib/custom-fields";
import { LocationField } from "@/components/location-field";
import { Button, buttonClass } from "@/components/button";
import { ASSET_STATUSES } from "@/lib/constants";
import { WORK_ORDER_STATUS_STYLES } from "@/lib/status-styles";
import { renderNoteHtml } from "@/lib/notes";
import { resolveBadges } from "@/lib/user-badge-data";
import { UserBadgeLabel } from "@/components/user-badge";
import { TabbedPageProvider, TabbedPageTabs, JumpToTabButton } from "@/components/tabbed-page";
import { AddNoteForm } from "@/components/add-note-form";
import { LoansPanel } from "./loans/loans-panel";
import { HelpLink } from "@/components/help-link";
import { CopyButton } from "@/components/copy-button";

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
      notes: { orderBy: { createdAt: "asc" }, include: { user: true } },
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

  // Surfaced in the header so "who has this?" is answerable without opening a tab.
  const openLoan = asset.assetType.loanable
    ? await prisma.assetLoan.findFirst({
        where: { assetId: asset.id, checkedInAt: null },
        include: { borrower: true },
      })
    : null;

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

  const detailsContent = (
    <>
      <div className="rounded-md border border-neutral-200 bg-white p-4 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qrDataUrl} alt={`QR code for ${asset.assetTag}`} width={180} height={180} className="mx-auto" />
        <div className="mt-2 flex items-center justify-center gap-1 text-xs text-neutral-500">
          <span className="break-all">{assetScanUrl(asset.assetTag)}</span>
          <CopyButton value={assetScanUrl(asset.assetTag)} label="scan link" />
        </div>
      </div>

      {fieldDefs.length > 0 && (
        <div className="rounded-md border border-neutral-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-neutral-900">{asset.assetType.name} details</h2>
          <dl className="mt-2 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            {fieldDefs.map((def) => (
              <div key={def.key}>
                <dt className="text-xs text-neutral-500">{def.label}</dt>
                <dd className="flex items-center gap-1 text-neutral-900">
                  <span className="min-w-0 break-all">{String(customFields[def.key] ?? "—")}</span>
                  {customFields[def.key] ? (
                    <CopyButton value={String(customFields[def.key])} label={def.label} />
                  ) : null}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}

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
          className="w-full max-w-xs rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
        <Button type="submit" variant="secondary">
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
        <div className="flex items-center gap-1">
          <h2 className="text-sm font-semibold text-neutral-900">Move</h2>
          <HelpLink topic="Locations and moving assets" article="locations/understanding-locations" />
        </div>
        <LocationField key={asset.updatedAt.toISOString()} name="locationId" locations={locations} />
        <input
          name="notes"
          placeholder="Notes (optional)"
          className="w-full max-w-md rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
        <Button type="submit" variant="secondary">
          Record move
        </Button>
      </form>
    </>
  );

  const noteBadges = await resolveBadges(asset.notes.map((n) => n.user));

  const notesContent = (
    <div id="notes-section" className="rounded-md border border-neutral-200 bg-white p-4">
      <div className="flex items-center gap-1">
        <h2 className="text-sm font-semibold text-neutral-900">Notes</h2>
        <HelpLink topic="Writing notes" article="getting-started/notes-and-rich-text" />
      </div>
      <ul className="mt-2 divide-y divide-neutral-200">
        {asset.notes.length === 0 && <li className="py-2 text-sm text-neutral-500">No notes yet.</li>}
        {asset.notes.map((note, i) => (
          <li key={note.id} className="py-2 text-sm">
            <div
              className="prose dark:prose-invert prose-sm max-w-none text-neutral-900"
              dangerouslySetInnerHTML={{ __html: renderNoteHtml(note.body, note.format) }}
            />
            <div className="text-xs text-neutral-400">
              <UserBadgeLabel badge={noteBadges[i]} /> · {note.createdAt.toLocaleString()}
            </div>
          </li>
        ))}
      </ul>
      <AddNoteForm action={addAssetNote} hiddenFieldName="assetId" hiddenFieldValue={asset.id} />
    </div>
  );

  const historyContent = (
    <>
      {workOrders.length > 0 && (
        <div className="rounded-md border border-neutral-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-neutral-900">Work orders</h2>
          <ul className="mt-2 divide-y divide-neutral-200">
            {workOrders.map((wo) => (
              <li key={wo.id} className="flex items-center justify-between py-2 text-sm">
                <Link href={`/work-orders/${wo.code}`} className="hover:underline">
                  {wo.code} · {wo.description}
                </Link>
                <span className={`rounded-full px-2 py-0.5 text-xs ${WORK_ORDER_STATUS_STYLES[wo.status]}`}>
                  {wo.status.replace("_", " ")}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-md border border-neutral-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-neutral-900">Location &amp; activity</h2>
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
    </>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs uppercase tracking-wide text-neutral-400">{asset.assetType.name}</div>
          <h1 className="text-xl font-semibold text-neutral-900">{asset.name}</h1>
          <div className="flex items-center gap-1 text-sm text-neutral-500">
            <span className="font-mono">{asset.assetTag}</span>
            <CopyButton value={asset.assetTag} label="asset tag" />
            <span>· {asset.owningDepartment.name}</span>
          </div>
          {openLoan && (
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-900">
              <PackageOpen className="h-3.5 w-3.5" />
              Checked out to {openLoan.borrower?.displayName ?? "Unknown"}
            </div>
          )}
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
        <InfoTile label="Acquired" value={asset.acquisitionDate ? asset.acquisitionDate.toLocaleDateString() : "—"} />
        <InfoTile label="Created" value={asset.createdAt.toLocaleDateString()} />
      </div>

      <TabbedPageProvider>
        <div className="flex flex-wrap items-end gap-3 rounded-md border border-neutral-200 bg-white p-3">
          <form
            action={async (formData: FormData) => {
              "use server";
              formData.set("assetId", asset.id);
              await changeAssetStatus(formData);
            }}
            className="flex items-end gap-2"
          >
            <div>
              <label className="block text-xs font-medium text-neutral-600">Status</label>
              <select
                key={asset.status}
                name="status"
                defaultValue={asset.status}
                className="mt-1 rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
              >
                {ASSET_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s.replace("_", " ")}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" variant="secondary">
              Update
            </Button>
          </form>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <JumpToTabButton tabId="notes" scrollToId="notes-section">+ Note</JumpToTabButton>
          </div>
        </div>

        <TabbedPageTabs
          tabs={[
            { id: "details", label: "Details", content: detailsContent, color: "fuchsia" },
            { id: "notes", label: "Notes", content: notesContent, color: "blue" },
            // Only asset types opted into lending get a Loans tab — a deployed
            // lantern is never "checked out", so the tab would be dead weight.
            ...(asset.assetType.loanable
              ? [
                  {
                    id: "loans",
                    label: "Loans",
                    content: (
                      <LoansPanel assetId={asset.id} departmentId={asset.owningDepartmentId} />
                    ),
                    color: "teal" as const,
                  },
                ]
              : []),
            { id: "history", label: "History", content: historyContent, color: "amber" },
          ]}
        />
      </TabbedPageProvider>
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
