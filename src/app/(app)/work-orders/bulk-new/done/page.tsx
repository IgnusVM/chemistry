import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/dal";
import { readBulkSelection } from "@/lib/bulk-selection";
import { buttonClass } from "@/components/button";

export default async function BulkNewWorkOrdersDonePage({
  searchParams,
}: {
  searchParams: Promise<{ selection?: string }>;
}) {
  const user = await requireCurrentUser();
  const { selection } = await searchParams;

  const ids = selection ? await readBulkSelection("WorkOrder", selection, user.id) : [];
  const workOrders = ids.length
    ? await prisma.workOrder.findMany({
        where: { id: { in: ids } },
        orderBy: { code: "asc" },
        select: { code: true, title: true, description: true, asset: { select: { assetTag: true } } },
      })
    : [];

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-neutral-900">
          {workOrders.length > 0 ? `Created ${workOrders.length} work orders` : "Nothing to show"}
        </h1>
        <p className="text-sm text-neutral-500">
          {workOrders.length > 0
            ? "Each links to its own detail page."
            : "This confirmation link has expired."}
        </p>
      </div>

      {workOrders.length > 0 && (
        <ul className="divide-y divide-neutral-200 rounded-md border border-neutral-200 bg-white">
          {workOrders.map((wo) => (
            <li key={wo.code} className="flex items-center justify-between px-4 py-2.5 text-sm">
              <Link href={`/work-orders/${wo.code}`} className="font-medium text-neutral-900 hover:underline">
                {wo.code}
              </Link>
              <span className="text-neutral-500">
                {wo.asset?.assetTag ?? "—"} · {(wo.title || wo.description).length > 50 ? `${(wo.title || wo.description).slice(0, 50)}…` : wo.title || wo.description}
              </span>
            </li>
          ))}
        </ul>
      )}

      <Link href="/work-orders" className={buttonClass("secondary")}>
        Back to Work Orders
      </Link>
    </div>
  );
}
