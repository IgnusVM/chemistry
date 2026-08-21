import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireOrgAdmin } from "@/lib/dal";
import { AddPartOrderForm } from "./add-part-order-form";
import { AddPartLinkForm } from "./add-part-link-form";
import { PartLinkRow } from "./part-link-row";
import { PartOrderRow } from "./part-order-row";
import { EditPartHeaderForm } from "./edit-part-header-form";
import { resolveBadges } from "@/lib/user-badge-data";
import { UserBadgeLabel } from "@/components/user-badge";

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
      links: { orderBy: { createdAt: "desc" }, include: { createdBy: true } },
      workOrderUses: {
        orderBy: { createdAt: "desc" },
        include: { workOrder: true, createdBy: true },
        take: 50,
      },
    },
  });
  if (!part || part.assetTypeId !== id) notFound();

  const [linkBadges, orderBadges, useBadges] = await Promise.all([
    resolveBadges(part.links.map((l) => l.createdBy)),
    resolveBadges(part.orders.map((o) => o.createdBy)),
    resolveBadges(part.workOrderUses.map((u) => u.createdBy)),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/admin/asset-types/${id}`} className="text-xs text-neutral-500 hover:underline">
          ← {part.assetType.name}
        </Link>
        <div className="mt-2">
          <EditPartHeaderForm part={part} />
        </div>
      </div>

      <div className="rounded-md border border-neutral-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-neutral-900">Links</h2>
        <p className="text-xs text-neutral-500">Where to buy it and roughly what it costs — no order required.</p>
        {part.links.length > 0 ? (
          <ul className="mt-3 divide-y divide-neutral-200">
            {part.links.map((link, i) => (
              <PartLinkRow
                key={link.id}
                link={{ ...link, price: link.price?.toString() ?? null }}
                createdByBadge={linkBadges[i]}
              />
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-neutral-500">No links yet.</p>
        )}
        <AddPartLinkForm partId={part.id} />
      </div>

      <div className="rounded-md border border-neutral-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-neutral-900">Order history</h2>
        {part.orders.length > 0 ? (
          <ul className="mt-3 divide-y divide-neutral-200">
            {part.orders.map((order, i) => (
              <PartOrderRow
                key={order.id}
                order={{ ...order, price: order.price?.toString() ?? null }}
                createdByBadge={orderBadges[i]}
              />
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
            {part.workOrderUses.map((use, i) => (
              <li key={use.id} className="py-2 text-sm">
                <Link href={`/work-orders/${use.workOrder.code}`} className="font-medium text-neutral-900 hover:underline">
                  {use.workOrder.code}
                </Link>
                <span className="ml-2 text-neutral-500">qty {use.quantity}</span>
                <span className="ml-2 text-xs text-neutral-400">
                  <UserBadgeLabel badge={useBadges[i]} /> · {use.createdAt.toLocaleDateString()}
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
