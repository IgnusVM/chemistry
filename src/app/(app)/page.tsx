import Link from "next/link";
import { FlaskConical } from "lucide-react";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const [assetsByStatus, departmentCount, assetCount, recentAudit] = await Promise.all([
    prisma.asset.groupBy({ by: ["status"], _count: true }),
    prisma.department.count({ where: { active: true } }),
    prisma.asset.count(),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { user: true },
    }),
  ]);

  const statusCounts = Object.fromEntries(assetsByStatus.map((row) => [row.status, row._count]));

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-neutral-900">
          <FlaskConical className="h-6 w-6 text-white" strokeWidth={2} />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Dashboard</h1>
          <p className="text-sm text-neutral-500">A live look at the fleet across every Ops department.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile label="Total assets" value={assetCount} />
        <StatTile label="Active departments" value={departmentCount} />
        <StatTile label="In repair" value={statusCounts.IN_REPAIR ?? 0} />
        <StatTile label="In storage" value={statusCounts.STORAGE ?? 0} />
      </div>

      <div className="flex gap-3">
        <Link
          href="/assets/new"
          className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          + New asset
        </Link>
        <Link
          href="/assets"
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
        >
          View all assets
        </Link>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-neutral-900">Recent activity</h2>
        <ul className="mt-3 divide-y divide-neutral-200 rounded-md border border-neutral-200 bg-white">
          {recentAudit.length === 0 && (
            <li className="px-4 py-3 text-sm text-neutral-500">No activity yet.</li>
          )}
          {recentAudit.map((entry) => (
            <li key={entry.id} className="px-4 py-3 text-sm text-neutral-700">
              <span className="font-medium">{entry.user?.displayName ?? "System"}</span>{" "}
              {entry.action} {entry.entityType} <span className="text-neutral-400">#{entry.entityId.slice(0, 8)}</span>
              <span className="ml-2 text-neutral-400">
                {entry.createdAt.toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-neutral-200 bg-white p-4">
      <div className="text-2xl font-semibold text-neutral-900">{value}</div>
      <div className="text-xs text-neutral-500">{label}</div>
    </div>
  );
}
