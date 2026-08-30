import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/dal";
import { readBulkSelection } from "@/lib/bulk-selection";
import { BulkCloseForm } from "./bulk-close-form";

export default async function BulkCloseWorkOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ selection?: string }>;
}) {
  const user = await requireCurrentUser();
  const { selection } = await searchParams;

  const ids = selection ? await readBulkSelection("WorkOrder", selection, user.id) : [];

  if (ids.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-lg font-semibold text-neutral-900">Bulk close work orders</h1>
        <p className="text-sm text-neutral-500">
          Your selection has expired or wasn&rsquo;t found. Go back to{" "}
          <Link href="/work-orders" className="text-fuchsia-700 hover:underline">
            Work Orders
          </Link>{" "}
          and select some again.
        </p>
      </div>
    );
  }

  const [workOrders, resolutionCodes] = await Promise.all([
    prisma.workOrder.findMany({
      where: { id: { in: ids } },
      orderBy: { code: "asc" },
      select: { id: true, code: true, title: true, description: true, status: true, asset: { select: { assetTag: true } } },
    }),
    prisma.resolutionCode.findMany({ orderBy: { label: "asc" } }),
  ]);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/work-orders" className="text-xs text-neutral-500 hover:underline">
          ← Work Orders
        </Link>
        <h1 className="text-lg font-semibold text-neutral-900">Bulk close {workOrders.length} work orders</h1>
        <p className="text-sm text-neutral-500">
          Only fields universal to every selected work order are shown — asset stays per-work-order.
        </p>
      </div>

      <div className="rounded-md border border-neutral-200 bg-white p-4">
        <div className="max-h-40 overflow-y-auto text-sm text-neutral-600">
          {workOrders.map((wo) => (
            <div key={wo.id}>
              <span className="font-medium text-neutral-900">{wo.code}</span> — {wo.title || wo.description}
              {wo.asset && <span className="text-neutral-400"> · {wo.asset.assetTag}</span>}
              {wo.status === "CLOSED" && <span className="ml-1 text-xs text-neutral-400">(already closed)</span>}
            </div>
          ))}
        </div>
      </div>

      <BulkCloseForm ids={workOrders.map((w) => w.id)} resolutionCodes={resolutionCodes} />
    </div>
  );
}
