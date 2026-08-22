import { notFound } from "next/navigation";
import Link from "next/link";
import { FileText, Printer } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/dal";
import { getAttachmentUrl } from "@/lib/s3";
import { updateWorkOrderStatus, assignWorkOrder, addWorkOrderNote, updateResolution } from "../actions";
import { AttachmentUploadForm } from "./attachment-upload-form";
import { DeleteAttachmentButton } from "./delete-attachment-button";
import { AssetEditForm } from "./asset-edit-form";
import { PartsUsedForm } from "./parts-used-form";
import { DeleteWorkOrderPartButton } from "./delete-work-order-part-button";
import { ClosedWorkOrderView } from "./closed-work-order-view";
import { CodeFileEditorForm } from "@/components/code/code-file-editor-form";
import { TabbedPageProvider, TabbedPageTabs, JumpToTabButton } from "@/components/tabbed-page";
import { AddNoteForm } from "@/components/add-note-form";
import { Button, buttonClass } from "@/components/button";
import { WORK_ORDER_STATUS_STYLES as STATUS_STYLES } from "@/lib/status-styles";
import { WO_STATUSES } from "@/lib/constants";
import { renderNoteHtml } from "@/lib/notes";
import { resolveBadge, resolveBadges } from "@/lib/user-badge-data";
import { UserBadge, UserBadgeLabel } from "@/components/user-badge";

export default async function WorkOrderDetailPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const user = await requireCurrentUser();
  const { code } = await params;

  const workOrder = await prisma.workOrder.findUnique({
    where: { code },
    include: {
      asset: { include: { assetType: true } },
      department: true,
      reportedBy: true,
      assignedTo: true,
      resolutionCode: true,
      notes: { orderBy: { createdAt: "asc" }, include: { user: true } },
      attachments: { orderBy: { createdAt: "desc" }, include: { uploadedBy: true } },
      partsUsed: { orderBy: { createdAt: "desc" }, include: { part: true, createdBy: true } },
    },
  });
  if (!workOrder) notFound();

  if (workOrder.status === "CLOSED") {
    const attachmentUrls = await Promise.all(workOrder.attachments.map((a) => getAttachmentUrl(a.s3Key)));
    const [reportedByBadge, assignedToBadge, noteBadges] = await Promise.all([
      resolveBadge(workOrder.reportedBy),
      resolveBadge(workOrder.assignedTo),
      resolveBadges(workOrder.notes.map((n) => n.user)),
    ]);
    return (
      <ClosedWorkOrderView
        workOrder={workOrder}
        attachmentUrls={attachmentUrls}
        reportedByBadge={reportedByBadge}
        assignedToBadge={assignedToBadge}
        noteBadges={noteBadges}
      />
    );
  }

  const [departmentMembers, resolutionCodes, attachmentUrls, assets, knownParts, otherWorkOrders] = await Promise.all([
    prisma.departmentMembership.findMany({
      where: { departmentId: workOrder.departmentId },
      include: { user: true },
      orderBy: { user: { displayName: "asc" } },
    }),
    prisma.resolutionCode.findMany({ orderBy: { label: "asc" } }),
    Promise.all(workOrder.attachments.map((a) => getAttachmentUrl(a.s3Key))),
    prisma.asset.findMany({
      where: { owningDepartmentId: workOrder.departmentId },
      select: { assetTag: true },
      orderBy: { assetTag: "asc" },
      take: 500,
    }),
    workOrder.assetId
      ? prisma.part.findMany({
          where: { assetType: { assets: { some: { id: workOrder.assetId } } } },
          select: { partNumber: true, description: true },
          orderBy: { partNumber: "asc" },
        })
      : Promise.resolve([]),
    workOrder.assetId
      ? prisma.workOrder.findMany({
          where: { assetId: workOrder.assetId, id: { not: workOrder.id } },
          orderBy: { reportedAt: "desc" },
          take: 50,
        })
      : Promise.resolve([]),
  ]);

  // Code lives on the asset TYPE, and only org admins can change it, so this
  // card is both scoped by type and hidden entirely from everyone else.
  const codeFiles =
    user.isOrgAdmin && workOrder.asset
      ? await prisma.assetCodeFile.findMany({
          where: { assetTypeId: workOrder.asset.assetTypeId },
          orderBy: { filename: "asc" },
          include: { versions: { orderBy: { createdAt: "desc" }, take: 1 } },
        })
      : [];

  const [reportedByBadge, assignedToBadge, noteBadges, attachmentBadges] = await Promise.all([
    resolveBadge(workOrder.reportedBy),
    resolveBadge(workOrder.assignedTo),
    resolveBadges(workOrder.notes.map((n) => n.user)),
    resolveBadges(workOrder.attachments.map((a) => a.uploadedBy)),
  ]);

  const detailsContent = (
    <>
      <AssetEditForm
        workOrderId={workOrder.id}
        currentAssetTag={workOrder.asset?.assetTag ?? null}
        assetTags={assets.map((a) => a.assetTag)}
      />

      <form id="resolution-form" action={updateResolution} className="space-y-2 rounded-md border border-neutral-200 bg-white p-4">
        <input type="hidden" name="workOrderId" value={workOrder.id} />
        <h2 className="text-sm font-semibold text-neutral-900">Resolution</h2>
        <select
          key={workOrder.resolutionCodeId ?? "none"}
          name="resolutionCodeId"
          defaultValue={workOrder.resolutionCodeId ?? ""}
          className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        >
          <option value="">Resolution code…</option>
          {resolutionCodes.map((rc) => (
            <option key={rc.id} value={rc.id}>
              {rc.label}
            </option>
          ))}
        </select>
        <textarea
          name="resolutionNotes"
          rows={3}
          defaultValue={workOrder.resolutionNotes ?? ""}
          placeholder="What was done to resolve this…"
          className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
        <div className="flex items-center gap-2">
          <label className="text-xs text-neutral-600">Labor minutes</label>
          <input
            name="laborMinutes"
            type="number"
            min={0}
            defaultValue={workOrder.laborMinutes ?? ""}
            className="w-24 rounded-md border border-neutral-300 px-2 py-1 text-sm"
          />
          <span className="ml-auto text-xs text-neutral-400">Saved with the button up top</span>
        </div>
      </form>

      <div id="parts-section" className="rounded-md border border-neutral-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-neutral-900">Parts used</h2>
        {workOrder.partsUsed.length > 0 ? (
          <table className="mt-2 w-full text-sm">
            <thead className="text-left text-xs uppercase text-neutral-500">
              <tr>
                <th className="py-1 pr-2">Part #</th>
                <th className="py-1 pr-2">Description</th>
                <th className="py-1 pr-2">Qty</th>
                <th className="py-1" />
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {workOrder.partsUsed.map((use) => (
                <tr key={use.id}>
                  <td className="py-2 pr-2 font-medium text-neutral-900">{use.part.partNumber}</td>
                  <td className="py-2 pr-2 text-neutral-600">{use.part.description}</td>
                  <td className="py-2 pr-2 text-neutral-500">{use.quantity}</td>
                  <td className="py-2 text-right">
                    <DeleteWorkOrderPartButton workOrderPartId={use.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="mt-1 text-sm text-neutral-500">No parts logged yet.</p>
        )}
        {workOrder.asset ? (
          <PartsUsedForm workOrderId={workOrder.id} knownParts={knownParts} />
        ) : (
          <p className="mt-3 text-sm text-neutral-400">Link an asset to this work order to log parts used.</p>
        )}
      </div>

      <div id="notes-section" className="rounded-md border border-neutral-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-neutral-900">Notes</h2>
        <ul className="mt-2 divide-y divide-neutral-200">
          {workOrder.notes.length === 0 && <li className="py-2 text-sm text-neutral-500">No notes yet.</li>}
          {workOrder.notes.map((note, i) => (
            <li key={note.id} className="py-2 text-sm">
              <div
                className="prose prose-sm max-w-none text-neutral-900"
                dangerouslySetInnerHTML={{ __html: renderNoteHtml(note.body, note.format) }}
              />
              <div className="text-xs text-neutral-400">
                <UserBadgeLabel badge={noteBadges[i]} /> · {note.createdAt.toLocaleString()}
              </div>
            </li>
          ))}
        </ul>
        <AddNoteForm action={addWorkOrderNote} hiddenFieldName="workOrderId" hiddenFieldValue={workOrder.id} />
      </div>

      {codeFiles.length > 0 && (
        <div className="space-y-4 rounded-md border border-neutral-200 bg-white p-4">
          <div>
            <h2 className="text-sm font-semibold text-neutral-900">Code</h2>
            <p className="text-xs text-neutral-500">
              Source for <span className="font-medium">{workOrder.asset?.assetType?.name}</span>.
              Saving here publishes a new version for every asset of that type and records that it
              came from this ticket.
            </p>
          </div>
          {codeFiles.map((file) => (
            <div key={file.id} className="space-y-1">
              <div className="text-xs font-medium text-neutral-600">
                {file.filename}
                {file.description && <span className="ml-1 font-normal text-neutral-400">— {file.description}</span>}
              </div>
              <CodeFileEditorForm
                codeFileId={file.id}
                filename={file.filename}
                currentContent={file.versions[0]?.content ?? ""}
                workOrderId={workOrder.id}
              />
            </div>
          ))}
        </div>
      )}
    </>
  );

  const historyContent = (
    <div className="rounded-md border border-neutral-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-neutral-900">
        Other work orders on {workOrder.asset ? workOrder.asset.assetTag : "this asset"}
      </h2>
      {!workOrder.asset ? (
        <p className="mt-1 text-sm text-neutral-400">Link an asset to this work order to see its repair history.</p>
      ) : otherWorkOrders.length === 0 ? (
        <p className="mt-1 text-sm text-neutral-500">No other work orders on this asset.</p>
      ) : (
        <ul className="mt-2 divide-y divide-neutral-200">
          {otherWorkOrders.map((wo) => (
            <li key={wo.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <Link href={`/work-orders/${wo.code}`} className="min-w-0 hover:underline">
                <span className="font-medium text-neutral-900">{wo.code}</span>{" "}
                <span className="text-neutral-600">
                  {wo.description.length > 70 ? `${wo.description.slice(0, 70)}…` : wo.description}
                </span>
              </Link>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${STATUS_STYLES[wo.status]}`}>
                {wo.status.replace("_", " ")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  const attachmentsContent = (
    <div id="attachments-section" className="rounded-md border border-neutral-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-neutral-900">Attachments</h2>
      <p className="text-xs text-neutral-500">Photos, reports, receipts — anything worth keeping with this ticket.</p>
      {workOrder.attachments.length > 0 && (
        <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {workOrder.attachments.map((attachment, i) => (
            <div key={attachment.id} className="space-y-1">
              <a href={attachmentUrls[i]} target="_blank" rel="noopener noreferrer">
                {attachment.mimeType.startsWith("image/") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={attachmentUrls[i]}
                    alt={attachment.filename}
                    className="aspect-square w-full rounded-md border border-neutral-200 object-cover"
                  />
                ) : (
                  <div className="flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-md border border-neutral-200 bg-neutral-50 p-2 text-center">
                    <FileText className="h-8 w-8 text-neutral-400" />
                    <span className="line-clamp-2 text-xs text-neutral-600">{attachment.filename}</span>
                  </div>
                )}
              </a>
              <div className="flex items-center justify-between text-xs text-neutral-500">
                <span className="truncate"><UserBadgeLabel badge={attachmentBadges[i]} /></span>
                <DeleteAttachmentButton attachmentId={attachment.id} />
              </div>
            </div>
          ))}
        </div>
      )}
      <AttachmentUploadForm workOrderId={workOrder.id} />
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs uppercase tracking-wide text-neutral-400">
          {workOrder.code} · {workOrder.department.name} · {workOrder.type.replace("_", " ")}
        </div>
        <h1 className="text-xl font-semibold text-neutral-900">{workOrder.description}</h1>
        <div className="mt-1 flex items-center gap-2">
          <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_STYLES[workOrder.status]}`}>
            {workOrder.status.replace("_", " ")}
          </span>
          <span className="text-xs text-neutral-500">Priority: {workOrder.priority.replace("_", " ")}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 rounded-md border border-neutral-200 bg-white p-4 text-sm sm:grid-cols-4">
        <InfoTile
          label="Asset"
          value={
            workOrder.asset ? (
              <Link href={`/assets/${workOrder.asset.assetTag}`} className="hover:underline">
                {workOrder.asset.assetTag}
              </Link>
            ) : (
              "—"
            )
          }
        />
        <InfoTile
          label="Assigned to"
          value={
            workOrder.assignedTo ? <UserBadgeLabel badge={assignedToBadge} /> : "Unassigned"
          }
        />
        <InfoTile
          label="Reported by"
          value={
            workOrder.reportedBy ? (
              <Link href={`/users/${workOrder.reportedBy.id}`} className="inline-flex items-center gap-1.5 hover:underline">
                <UserBadge badge={reportedByBadge} />
                {workOrder.reportedBy.displayName}
              </Link>
            ) : (
              "—"
            )
          }
        />
        <InfoTile label="Reported" value={workOrder.reportedAt.toLocaleDateString()} />
      </div>

      <TabbedPageProvider>
        <div className="flex flex-wrap items-end gap-3 rounded-md border border-neutral-200 bg-white p-3">
          <form action={updateWorkOrderStatus} className="flex items-end gap-2">
            <input type="hidden" name="workOrderId" value={workOrder.id} />
            <div>
              <label className="block text-xs font-medium text-neutral-600">Status</label>
              <select
                key={workOrder.status}
                name="status"
                defaultValue={workOrder.status}
                className="mt-1 rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
              >
                {WO_STATUSES.map((s) => (
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

          <form action={assignWorkOrder} className="flex items-end gap-2">
            <input type="hidden" name="workOrderId" value={workOrder.id} />
            <div>
              <label className="block text-xs font-medium text-neutral-600">Assigned to</label>
              <select
                key={workOrder.assignedToUserId ?? "unassigned"}
                name="assignedToUserId"
                defaultValue={workOrder.assignedToUserId ?? ""}
                className="mt-1 rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
              >
                <option value="">Unassigned</option>
                {departmentMembers.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.user.displayName}
                    {m.user.name ? ` (${m.user.name})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" variant="secondary">
              Assign
            </Button>
          </form>

          <form action={updateWorkOrderStatus}>
            <input type="hidden" name="workOrderId" value={workOrder.id} />
            <input type="hidden" name="status" value="CLOSED" />
            <Button type="submit" variant="secondary">
              Close ticket
            </Button>
          </form>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <JumpToTabButton tabId="details" scrollToId="notes-section">+ Note</JumpToTabButton>
            <JumpToTabButton tabId="details" scrollToId="parts-section">+ Part</JumpToTabButton>
            <JumpToTabButton tabId="attachments" scrollToId="attachments-section">+ Attachment</JumpToTabButton>
            <Link href={`/work-orders/${workOrder.code}/print`} className={buttonClass("secondary")}>
              <Printer className="h-4 w-4" />
              Print
            </Link>
            <Button type="submit" form="resolution-form">
              Save resolution
            </Button>
          </div>
        </div>

        <TabbedPageTabs
          tabs={[
            { id: "details", label: "Details", content: detailsContent, color: "fuchsia" },
            { id: "history", label: "History", content: historyContent, color: "amber" },
            { id: "attachments", label: "Attachments", content: attachmentsContent, color: "teal" },
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
