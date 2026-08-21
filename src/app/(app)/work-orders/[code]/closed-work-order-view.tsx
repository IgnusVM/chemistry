import Link from "next/link";
import { FileText } from "lucide-react";
import { reopenWorkOrder } from "../actions";
import { Button } from "@/components/button";
import { WORK_ORDER_STATUS_STYLES as STATUS_STYLES } from "@/lib/status-styles";
import { renderNoteHtml } from "@/lib/notes";
import type { ResolvedBadge } from "@/lib/user-badge-data";
import { UserBadge, UserBadgeLabel } from "@/components/user-badge";
import type { Prisma } from "@/generated/prisma/client";

type ClosedWorkOrder = Prisma.WorkOrderGetPayload<{
  include: {
    asset: true;
    department: true;
    reportedBy: true;
    assignedTo: true;
    resolutionCode: true;
    notes: { include: { user: true } };
    attachments: { include: { uploadedBy: true } };
    partsUsed: { include: { part: true; createdBy: true } };
  };
}>;

export function ClosedWorkOrderView({
  workOrder,
  attachmentUrls,
  reportedByBadge,
  assignedToBadge,
  noteBadges,
}: {
  workOrder: ClosedWorkOrder;
  attachmentUrls: string[];
  reportedByBadge: ResolvedBadge | null;
  assignedToBadge: ResolvedBadge | null;
  noteBadges: (ResolvedBadge | null)[];
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <div>
          <div className="text-xs uppercase tracking-wide text-neutral-400">
            {workOrder.code} · {workOrder.department.name} · {workOrder.type.replace("_", " ")}
          </div>
          <h1 className="text-xl font-semibold text-neutral-900">{workOrder.description}</h1>
          <div className="mt-1 flex items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_STYLES[workOrder.status] ?? "bg-neutral-200 text-neutral-500"}`}>
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
                <Link href={`/users/${workOrder.reportedBy.id}`} className="inline-flex items-center gap-1.5 hover:underline">
                  <UserBadge badge={reportedByBadge} />
                  {workOrder.reportedBy.displayName}
                </Link>
              ) : (
                "—"
              )
            }
          />
          <InfoTile
            label="Assigned to"
            value={workOrder.assignedTo ? <UserBadgeLabel badge={assignedToBadge} /> : "—"}
          />
          <InfoTile label="Closed" value={workOrder.closedAt ? workOrder.closedAt.toLocaleDateString() : "—"} />
        </div>

        <div className="rounded-md border border-neutral-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-neutral-900">Resolution</h2>
          <dl className="mt-2 space-y-2 text-sm">
            <div>
              <dt className="text-xs text-neutral-500">Code</dt>
              <dd className="text-neutral-900">{workOrder.resolutionCode?.label ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-neutral-500">Notes</dt>
              <dd className="whitespace-pre-wrap text-neutral-900">{workOrder.resolutionNotes || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-neutral-500">Labor minutes</dt>
              <dd className="text-neutral-900">{workOrder.laborMinutes ?? "—"}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-md border border-neutral-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-neutral-900">Parts used</h2>
          {workOrder.partsUsed.length > 0 ? (
            <table className="mt-2 w-full text-sm">
              <thead className="text-left text-xs uppercase text-neutral-500">
                <tr>
                  <th className="py-1 pr-2">Part #</th>
                  <th className="py-1 pr-2">Description</th>
                  <th className="py-1 pr-2">Qty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {workOrder.partsUsed.map((use) => (
                  <tr key={use.id}>
                    <td className="py-2 pr-2 font-medium text-neutral-900">{use.part.partNumber}</td>
                    <td className="py-2 pr-2 text-neutral-600">{use.part.description}</td>
                    <td className="py-2 pr-2 text-neutral-500">{use.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="mt-1 text-sm text-neutral-500">No parts logged.</p>
          )}
        </div>

        {workOrder.attachments.length > 0 && (
          <div className="rounded-md border border-neutral-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-neutral-900">Attachments</h2>
            <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {workOrder.attachments.map((attachment, i) => (
                <a key={attachment.id} href={attachmentUrls[i]} target="_blank" rel="noopener noreferrer">
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
              ))}
            </div>
          </div>
        )}

        {workOrder.notes.length > 0 && (
          <div className="rounded-md border border-neutral-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-neutral-900">Notes</h2>
            <ul className="mt-2 divide-y divide-neutral-200">
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
          </div>
        )}
      </div>

      <div className="space-y-6">
        <div className="space-y-2 rounded-md border border-neutral-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-neutral-900">Closed</h2>
          <p className="text-xs text-neutral-500">
            This work order is closed — everything above is locked. Reopen it to make changes.
          </p>
          <form action={reopenWorkOrder}>
            <input type="hidden" name="workOrderId" value={workOrder.id} />
            <Button type="submit" variant="secondary" className="w-full">
              Reopen work order
            </Button>
          </form>
        </div>
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
