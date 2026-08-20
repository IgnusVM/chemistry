import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser, getAccessibleDepartmentIds } from "@/lib/dal";
import type { Prisma } from "@/generated/prisma/client";

const STATUS_STYLES: Record<string, string> = {
  OPEN: "bg-blue-100 text-blue-800",
  ASSIGNED: "bg-indigo-100 text-indigo-800",
  IN_PROGRESS: "bg-amber-100 text-amber-800",
  WAITING_PARTS: "bg-orange-100 text-orange-800",
  COMPLETE: "bg-green-100 text-green-800",
  CLOSED: "bg-neutral-200 text-neutral-500",
  CANCELLED: "bg-neutral-200 text-neutral-400",
};

const PRIORITY_STYLES: Record<string, string> = {
  LOW: "text-neutral-500",
  NORMAL: "text-neutral-700",
  HIGH: "text-amber-700 font-medium",
  EVENT_CRITICAL: "text-red-700 font-semibold",
};

export default async function WorkOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; department?: string; status?: string; priority?: string; mine?: string }>;
}) {
  const user = await requireCurrentUser();
  const { q, department, status, priority, mine } = await searchParams;

  const accessibleDeptIds = await getAccessibleDepartmentIds("VIEWER");

  const where: Prisma.WorkOrderWhereInput = {
    departmentId: department ? department : { in: accessibleDeptIds },
  };
  if (status) where.status = status as Prisma.EnumWorkOrderStatusFilter["equals"];
  if (priority) where.priority = priority as Prisma.EnumWorkOrderPriorityFilter["equals"];
  if (mine === "1") where.assignedToUserId = user.id;
  if (q) {
    where.OR = [
      { description: { contains: q, mode: "insensitive" } },
      { code: { contains: q, mode: "insensitive" } },
    ];
  }

  const [workOrders, departments] = await Promise.all([
    prisma.workOrder.findMany({
      where,
      orderBy: [{ priority: "desc" }, { reportedAt: "desc" }],
      include: { asset: true, department: true, assignedTo: true },
      take: 200,
    }),
    prisma.department.findMany({ where: { id: { in: accessibleDeptIds } }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-neutral-900">Work Orders</h1>
          <p className="text-sm text-neutral-500">{workOrders.length} shown</p>
        </div>
        <Link
          href="/work-orders/new"
          className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          + New work order
        </Link>
      </div>

      <form className="flex flex-wrap items-center gap-2 rounded-md border border-neutral-200 bg-white p-3">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search description or WO#…"
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
        <select name="department" defaultValue={department ?? ""} className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm">
          <option value="">All departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <select name="status" defaultValue={status ?? ""} className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm">
          <option value="">All statuses</option>
          {Object.keys(STATUS_STYLES).map((s) => (
            <option key={s} value={s}>
              {s.replace("_", " ")}
            </option>
          ))}
        </select>
        <select name="priority" defaultValue={priority ?? ""} className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm">
          <option value="">All priorities</option>
          {Object.keys(PRIORITY_STYLES).map((p) => (
            <option key={p} value={p}>
              {p.replace("_", " ")}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1.5 text-sm text-neutral-600">
          <input type="checkbox" name="mine" value="1" defaultChecked={mine === "1"} />
          Assigned to me
        </label>
        <button type="submit" className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100">
          Filter
        </button>
      </form>

      <table className="w-full overflow-hidden rounded-md border border-neutral-200 bg-white text-sm">
        <thead className="bg-neutral-100 text-left text-xs uppercase text-neutral-500">
          <tr>
            <th className="px-4 py-2">WO#</th>
            <th className="px-4 py-2">Description</th>
            <th className="px-4 py-2">Asset</th>
            <th className="px-4 py-2">Department</th>
            <th className="px-4 py-2">Priority</th>
            <th className="px-4 py-2">Assigned</th>
            <th className="px-4 py-2">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200">
          {workOrders.map((wo) => (
            <tr key={wo.id} className="hover:bg-neutral-50">
              <td className="px-4 py-2">
                <Link href={`/work-orders/${wo.code}`} className="font-medium text-neutral-900 hover:underline">
                  {wo.code}
                </Link>
              </td>
              <td className="px-4 py-2">
                {wo.description.length > 70 ? `${wo.description.slice(0, 70)}…` : wo.description}
              </td>
              <td className="px-4 py-2 text-neutral-500">
                {wo.asset ? (
                  <Link href={`/assets/${wo.asset.assetTag}`} className="hover:underline">
                    {wo.asset.assetTag}
                  </Link>
                ) : (
                  "—"
                )}
              </td>
              <td className="px-4 py-2 text-neutral-500">{wo.department.name}</td>
              <td className={`px-4 py-2 ${PRIORITY_STYLES[wo.priority]}`}>{wo.priority.replace("_", " ")}</td>
              <td className="px-4 py-2 text-neutral-500">{wo.assignedTo?.displayName ?? "—"}</td>
              <td className="px-4 py-2">
                <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_STYLES[wo.status]}`}>
                  {wo.status.replace("_", " ")}
                </span>
              </td>
            </tr>
          ))}
          {workOrders.length === 0 && (
            <tr>
              <td colSpan={7} className="px-4 py-6 text-center text-neutral-500">
                No work orders match these filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
