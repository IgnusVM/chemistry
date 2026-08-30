import Link from "next/link";
import { statusLabel } from "@/lib/constants";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/dal";
import { renderNoteHtml } from "@/lib/notes";
import { buttonClass } from "@/components/button";
import { PrintButton } from "./print-button";

export const metadata = { title: "Print work order · Chemistry" };

/**
 * Paper service record for a single work order. A separate route rather than
 * print styles on the detail page, because that page is tabbed — printing it
 * would only ever capture whichever tab happened to be open.
 */
export default async function PrintWorkOrderPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  await requireCurrentUser();
  const { code } = await params;

  const workOrder = await prisma.workOrder.findUnique({
    where: { code },
    include: {
      asset: { include: { assetType: true, currentLocation: true } },
      department: true,
      reportedBy: true,
      assignedTo: true,
      resolutionCode: true,
      notes: { orderBy: { createdAt: "asc" }, include: { user: true } },
      partsUsed: { orderBy: { createdAt: "asc" }, include: { part: true } },
    },
  });
  if (!workOrder) notFound();

  const fmt = (d: Date | null) => (d ? d.toLocaleString() : "–");

  return (
    <div className="mx-auto max-w-3xl">
      {/* Screen-only controls. */}
      <div className="mb-4 flex items-center justify-between gap-3 print:hidden">
        <Link href={`/work-orders/${workOrder.code}`} className="text-sm text-neutral-500 hover:underline">
          ← Back to the ticket
        </Link>
        <div className="flex gap-2">
          <Link href={`/work-orders/${workOrder.code}`} className={buttonClass("secondary")}>
            Cancel
          </Link>
          <PrintButton />
        </div>
      </div>

      <article className="rounded-md border border-neutral-200 bg-white p-8 print:rounded-none print:border-0 print:p-0">
        <header className="flex items-start justify-between gap-6 border-b border-neutral-300 pb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Work Order</h1>
            <p className="mt-0.5 font-mono text-lg text-neutral-800">{workOrder.code}</p>
          </div>
          <div className="text-right text-sm">
            <div className="font-semibold text-neutral-900">Chemistry</div>
            <div className="text-neutral-500">{workOrder.department.name}</div>
            <div className="text-neutral-500">Printed {new Date().toLocaleDateString()}</div>
          </div>
        </header>

        <section className="grid grid-cols-2 gap-x-8 gap-y-3 border-b border-neutral-200 py-4 text-sm sm:grid-cols-3">
          <Field label="Status" value={workOrder.status.replace("_", " ")} />
          <Field label="Priority" value={workOrder.priority.replace("_", " ")} />
          <Field label="Type" value={statusLabel(workOrder.type)} />
          <Field label="Asset" value={workOrder.asset ? `${workOrder.asset.assetTag} · ${workOrder.asset.name}` : "–"} />
          <Field label="Asset type" value={workOrder.asset?.assetType.name ?? "–"} />
          <Field
            label="Location"
            value={workOrder.asset?.currentLocation?.name ?? workOrder.asset?.customLocationText ?? "–"}
          />
          <Field label="Reported by" value={workOrder.reportedBy?.displayName ?? "–"} />
          <Field label="Assigned to" value={workOrder.assignedTo?.displayName ?? "Unassigned"} />
          <Field label="Reported" value={fmt(workOrder.reportedAt)} />
          <Field label="Started" value={fmt(workOrder.startedAt)} />
          <Field label="Completed" value={fmt(workOrder.completedAt)} />
          <Field label="Closed" value={fmt(workOrder.closedAt)} />
        </section>

        <Section title="Problem reported">
          <p className="whitespace-pre-wrap text-sm text-neutral-900">{workOrder.description}</p>
        </Section>

        <Section title="Resolution">
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-xs text-neutral-500">Code</dt>
              <dd className="text-neutral-900">{workOrder.resolutionCode?.label ?? "–"}</dd>
            </div>
            <div>
              <dt className="text-xs text-neutral-500">Notes</dt>
              <dd className="whitespace-pre-wrap text-neutral-900">{workOrder.resolutionNotes || "–"}</dd>
            </div>
            <div>
              <dt className="text-xs text-neutral-500">Labor minutes</dt>
              <dd className="text-neutral-900">{workOrder.laborMinutes ?? "–"}</dd>
            </div>
          </dl>
        </Section>

        <Section title="Parts used">
          {workOrder.partsUsed.length === 0 ? (
            <p className="text-sm text-neutral-500">None recorded.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-neutral-200 text-left text-xs uppercase text-neutral-500">
                <tr>
                  <th className="py-1 pr-2">Part #</th>
                  <th className="py-1 pr-2">Description</th>
                  <th className="py-1">Qty</th>
                </tr>
              </thead>
              <tbody>
                {workOrder.partsUsed.map((use) => (
                  <tr key={use.id} className="border-b border-neutral-100">
                    <td className="py-1.5 pr-2 font-medium text-neutral-900">{use.part.partNumber}</td>
                    <td className="py-1.5 pr-2 text-neutral-600">{use.part.description}</td>
                    <td className="py-1.5 text-neutral-700">{use.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>

        {workOrder.notes.length > 0 && (
          <Section title="Notes">
            <ul className="space-y-3">
              {workOrder.notes.map((note) => (
                <li key={note.id} className="text-sm">
                  <div
                    className="prose prose-sm max-w-none text-neutral-900"
                    dangerouslySetInnerHTML={{ __html: renderNoteHtml(note.body, note.format) }}
                  />
                  <div className="mt-0.5 text-xs text-neutral-500">
                    {note.user?.displayName ?? "Unknown"} · {note.createdAt.toLocaleString()}
                  </div>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* Paper records get signed; leaving room for it is the whole point of
            printing one rather than reading it on a phone. */}
        <section className="mt-10 grid grid-cols-2 gap-8 text-sm">
          <SignatureLine label="Work performed by" />
          <SignatureLine label="Verified by" />
        </section>
      </article>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-neutral-500">{label}</div>
      <div className="font-medium text-neutral-900">{value}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-neutral-200 py-4 break-inside-avoid">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">{title}</h2>
      {children}
    </section>
  );
}

function SignatureLine({ label }: { label: string }) {
  return (
    <div>
      <div className="h-10 border-b border-neutral-400" />
      <div className="mt-1 text-xs text-neutral-500">{label}</div>
    </div>
  );
}
