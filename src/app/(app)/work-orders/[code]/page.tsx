import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/dal";
import { getAttachmentUrl } from "@/lib/s3";
import { updateWorkOrderStatus, assignWorkOrder, addWorkOrderNote, updateResolution } from "../actions";
import { AttachmentUploadForm } from "./attachment-upload-form";
import { DeleteAttachmentButton } from "./delete-attachment-button";
import { AssetEditForm } from "./asset-edit-form";
import { PartsUsedForm } from "./parts-used-form";
import { DeleteWorkOrderPartButton } from "./delete-work-order-part-button";
import { Button } from "@/components/button";

const STATUS_STYLES: Record<string, string> = {
  OPEN: "bg-blue-100 text-blue-800",
  IN_PROGRESS: "bg-amber-100 text-amber-800",
  WAITING_PARTS: "bg-orange-100 text-orange-800",
  COMPLETE: "bg-green-100 text-green-800",
  CLOSED: "bg-neutral-200 text-neutral-500",
  CANCELLED: "bg-neutral-200 text-neutral-400",
};
const WO_STATUSES = Object.keys(STATUS_STYLES);

export default async function WorkOrderDetailPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  await requireCurrentUser();
  const { code } = await params;

  const workOrder = await prisma.workOrder.findUnique({
    where: { code },
    include: {
      asset: true,
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

  const [departmentMembers, resolutionCodes, attachmentUrls, assets, knownParts] = await Promise.all([
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
  ]);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
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
            label="Reported by"
            value={
              workOrder.reportedBy ? (
                <Link href={`/users/${workOrder.reportedBy.id}`} className="hover:underline">
                  {workOrder.reportedBy.playaName ?? workOrder.reportedBy.displayName}
                </Link>
              ) : (
                "—"
              )
            }
          />
          <InfoTile label="Reported" value={workOrder.reportedAt.toLocaleDateString()} />
          <InfoTile label="Resolution code" value={workOrder.resolutionCode?.label ?? "—"} />
        </div>

        <div className="rounded-md border border-neutral-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-neutral-900">Photos</h2>
          {workOrder.attachments.length > 0 && (
            <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {workOrder.attachments.map((attachment, i) => (
                <div key={attachment.id} className="space-y-1">
                  <a href={attachmentUrls[i]} target="_blank" rel="noopener noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={attachmentUrls[i]}
                      alt={attachment.filename}
                      className="aspect-square w-full rounded-md border border-neutral-200 object-cover"
                    />
                  </a>
                  <div className="flex items-center justify-between text-xs text-neutral-500">
                    <span className="truncate">{attachment.uploadedBy?.displayName ?? "Unknown"}</span>
                    <DeleteAttachmentButton attachmentId={attachment.id} />
                  </div>
                </div>
              ))}
            </div>
          )}
          <AttachmentUploadForm workOrderId={workOrder.id} />
        </div>

        <div className="rounded-md border border-neutral-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-neutral-900">Parts used</h2>
          {workOrder.partsUsed.length > 0 ? (
            <ul className="mt-2 divide-y divide-neutral-200">
              {workOrder.partsUsed.map((use) => (
                <li key={use.id} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <span className="font-medium text-neutral-900">{use.part.partNumber}</span>
                    <span className="ml-2 text-neutral-500">{use.part.description}</span>
                    <span className="ml-2 text-neutral-500">qty {use.quantity}</span>
                  </div>
                  <DeleteWorkOrderPartButton workOrderPartId={use.id} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-sm text-neutral-500">No parts logged yet.</p>
          )}
          {workOrder.asset ? (
            <PartsUsedForm workOrderId={workOrder.id} knownParts={knownParts} />
          ) : (
            <p className="mt-3 text-sm text-neutral-400">Link an asset to this work order to log parts used.</p>
          )}
        </div>

        <form
          action={updateResolution}
          className="space-y-2 rounded-md border border-neutral-200 bg-white p-4"
        >
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
            <Button type="submit" variant="secondary" className="ml-auto">
              Save
            </Button>
          </div>
        </form>

        <div className="rounded-md border border-neutral-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-neutral-900">Notes</h2>
          <ul className="mt-2 divide-y divide-neutral-200">
            {workOrder.notes.length === 0 && <li className="py-2 text-sm text-neutral-500">No notes yet.</li>}
            {workOrder.notes.map((note) => (
              <li key={note.id} className="py-2 text-sm">
                <div className="text-neutral-900">{note.body}</div>
                <div className="text-xs text-neutral-400">
                  {note.user?.displayName ?? "Unknown"} · {note.createdAt.toLocaleString()}
                </div>
              </li>
            ))}
          </ul>
          <form action={addWorkOrderNote} className="mt-3 flex gap-2">
            <input type="hidden" name="workOrderId" value={workOrder.id} />
            <input
              name="body"
              required
              placeholder="Add a note…"
              className="flex-1 rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
            />
            <Button type="submit" variant="secondary">
              Add
            </Button>
          </form>
        </div>
      </div>

      <div className="space-y-6">
        <AssetEditForm
          workOrderId={workOrder.id}
          currentAssetTag={workOrder.asset?.assetTag ?? null}
          assetTags={assets.map((a) => a.assetTag)}
        />

        <form
          action={updateWorkOrderStatus}
          className="space-y-2 rounded-md border border-neutral-200 bg-white p-4"
        >
          <input type="hidden" name="workOrderId" value={workOrder.id} />
          <h2 className="text-sm font-semibold text-neutral-900">Status</h2>
          <select
            key={workOrder.status}
            name="status"
            defaultValue={workOrder.status}
            className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
          >
            {WO_STATUSES.map((s) => (
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
          action={assignWorkOrder}
          className="space-y-2 rounded-md border border-neutral-200 bg-white p-4"
        >
          <input type="hidden" name="workOrderId" value={workOrder.id} />
          <h2 className="text-sm font-semibold text-neutral-900">Assigned to</h2>
          <select
            key={workOrder.assignedToUserId ?? "unassigned"}
            name="assignedToUserId"
            defaultValue={workOrder.assignedToUserId ?? ""}
            className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
          >
            <option value="">Unassigned</option>
            {departmentMembers.map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.user.displayName}
                {m.user.playaName ? ` "${m.user.playaName}"` : ""}
              </option>
            ))}
          </select>
          <Button type="submit" variant="secondary" className="w-full">
            Save assignment
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
