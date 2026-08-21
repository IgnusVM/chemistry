import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ClipboardList, ArrowRight, Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/dal";
import { buttonClass } from "@/components/button";
import { WORK_ORDER_STATUS_STYLES as STATUS_STYLES, WORK_ORDER_PRIORITY_STYLES } from "@/lib/status-styles";
import { TERMINAL_WO_STATUSES } from "@/lib/constants";

/**
 * QR scan landing. When the scanned asset has nothing open, this gets out of the
 * way and redirects straight to the asset. When it does have open tickets, it
 * stops and offers them first — the whole point of scanning a tag in the field
 * is usually "is someone already on this?".
 */
export default async function ScanLandingPage({
  params,
}: {
  params: Promise<{ assetTag: string }>;
}) {
  await requireCurrentUser();
  const { assetTag } = await params;

  const asset = await prisma.asset.findUnique({
    where: { assetTag },
    select: { id: true, assetTag: true, name: true, owningDepartment: { select: { name: true } } },
  });
  if (!asset) notFound();

  const openWorkOrders = await prisma.workOrder.findMany({
    where: { assetId: asset.id, status: { notIn: [...TERMINAL_WO_STATUSES] } },
    orderBy: [{ priority: "desc" }, { reportedAt: "desc" }],
    include: { assignedTo: { select: { displayName: true } } },
    take: 10,
  });

  if (openWorkOrders.length === 0) {
    redirect(`/assets/${asset.assetTag}`);
  }

  return (
    <div className="mx-auto max-w-md space-y-4">
      <div>
        <div className="text-xs uppercase tracking-wide text-neutral-400">
          {asset.assetTag} · {asset.owningDepartment.name}
        </div>
        <h1 className="text-lg font-semibold text-neutral-900">{asset.name}</h1>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-amber-900">
          <ClipboardList className="h-4 w-4" />
          {openWorkOrders.length === 1
            ? "There's an open ticket on this asset"
            : `There are ${openWorkOrders.length} open tickets on this asset`}
        </div>

        <ul className="mt-3 space-y-2">
          {openWorkOrders.map((wo) => (
            <li key={wo.id}>
              <Link
                href={`/work-orders/${wo.code}`}
                className="flex items-center gap-3 rounded-lg border border-amber-200 bg-white p-3 active:bg-amber-50/60"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-medium text-neutral-900">{wo.code}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_STYLES[wo.status]}`}>
                      {wo.status.replace("_", " ")}
                    </span>
                    <span className={`text-xs ${WORK_ORDER_PRIORITY_STYLES[wo.priority]}`}>
                      {wo.priority.replace("_", " ")}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-sm text-neutral-600">{wo.description}</p>
                  <p className="mt-0.5 text-xs text-neutral-400">
                    {wo.assignedTo ? `Assigned to ${wo.assignedTo.displayName}` : "Unassigned"}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-neutral-400" />
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-2">
        <Link href={`/assets/${asset.assetTag}`} className={buttonClass("secondary", "w-full py-2.5")}>
          Go to the asset
        </Link>
        <Link
          href={`/work-orders/new?assetTag=${encodeURIComponent(asset.assetTag)}`}
          className={buttonClass("ghost", "w-full py-2.5")}
        >
          <Plus className="h-4 w-4" />
          Report a different problem
        </Link>
      </div>
    </div>
  );
}
