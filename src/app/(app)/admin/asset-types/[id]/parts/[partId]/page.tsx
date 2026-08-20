import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireOrgAdmin } from "@/lib/dal";
import { AddPartOrderForm } from "./add-part-order-form";
import { DeletePartOrderButton } from "./delete-part-order-button";

export default async function PartDetailPage({
  params,
}: {
  params: Promise<{ id: string; partId: string }>;
}) {
  await requireOrgAdmin();
  const { id, partId } = await params;

  const part = await prisma.part.findUnique({
    where: { id: partId },
    include: {
      assetType: true,
      orders: { orderBy: { orderedAt: "desc" }, include: { createdBy: true } },
      workOrderUses: {
        orderBy: { createdAt: "desc" },
        include: { workOrder: true, createdBy: true },
        take: 50,
      },
    },
  });
  if (!part || part.assetTypeId !== id) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/admin/asset-types/${id}`} className="text-xs text-neutral-500 hover:underline">
          ← {part.assetType.name}
        </Link>
        <h1 className="text-lg font-semibold text-neutral-900">{part.partNumber}</h1>
        <p className="text-sm text-neutral-500">{part.description}</p>
      </div>

      <div className="rounded-md border border-neutral-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-neutral-900">Order history</h2>
        {part.orders.length > 0 ? (
          <ul className="mt-3 divide-y divide-neutral-200">
            {part.orders.map((order) => (
              <li key={order.id} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <span className="font-medium text-neutral-900">
                    {order.price ? `$${order.price.toString()}` : "No price logged"}
                  </span>
                  <span className="ml-2 text-neutral-500">{order.orderedAt.toLocaleDateString()}</span>
                  {order.purchaseLink && (
                    <a
                      href={order.purchaseLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 text-neutral-500 hover:underline"
                    >
                      link
                    </a>
                  )}
                  <div className="text-xs text-neutral-400">
                    Logged by {order.createdBy?.displayName ?? "Unknown"}
                  </div>
                </div>
                <DeletePartOrderButton orderId={order.id} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-neutral-500">No orders logged yet.</p>
        )}
        <AddPartOrderForm partId={part.id} />
      </div>

      <div className="rounded-md border border-neutral-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-neutral-900">Used on work orders</h2>
        {part.workOrderUses.length > 0 ? (
          <ul className="mt-3 divide-y divide-neutral-200">
            {part.workOrderUses.map((use) => (
              <li key={use.id} className="py-2 text-sm">
                <Link href={`/work-orders/${use.workOrder.code}`} className="font-medium text-neutral-900 hover:underline">
                  {use.workOrder.code}
                </Link>
                <span className="ml-2 text-neutral-500">qty {use.quantity}</span>
                <span className="ml-2 text-xs text-neutral-400">
                  {use.createdBy?.displayName ?? "Unknown"} · {use.createdAt.toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-neutral-500">Not used on any work order yet.</p>
        )}
      </div>
    </div>
  );
}
