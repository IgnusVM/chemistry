import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser, getAccessibleDepartmentIds } from "@/lib/dal";
import { Button, buttonClass } from "@/components/button";
import { Pagination } from "@/components/pagination";
import { parsePage, parsePageSize } from "@/lib/list-page";
import { SelectionProvider } from "@/components/selection/selection-context";
import { SelectAllHeaderCheckbox } from "@/components/selection/select-all-checkbox";
import { RowCheckbox } from "@/components/selection/row-checkbox";
import { SelectionToolbar } from "@/components/selection/selection-toolbar";
import { AssignedFilterFields } from "./assigned-filter-fields";
import { buildWorkOrderWhere, resolveWorkOrderListDefaults, OPEN_STATUS_FILTER, type WorkOrderListParams } from "./where";
import { WORK_ORDER_STATUS_STYLES as STATUS_STYLES, WORK_ORDER_PRIORITY_STYLES as PRIORITY_STYLES } from "@/lib/status-styles";

export default async function WorkOrdersPage({
  searchParams,
}: {
  searchParams: Promise<WorkOrderListParams & { page?: string; pageSize?: string }>;
}) {
  const user = await requireCurrentUser();
  const params = await searchParams;
  const { q, department, priority, assignedToName } = params;
  const page = parsePage(params.page);
  const pageSize = parsePageSize(params.pageSize);
  const { status, mine } = resolveWorkOrderListDefaults(params);

  const accessibleDeptIds = await getAccessibleDepartmentIds("VIEWER");
  const where = buildWorkOrderWhere(params, { userId: user.id, accessibleDeptIds });

  const [workOrders, total, departments, members] = await Promise.all([
    prisma.workOrder.findMany({
      where,
      orderBy: [{ priority: "desc" }, { reportedAt: "desc" }],
      include: { asset: true, department: true, assignedTo: true },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.workOrder.count({ where }),
    prisma.department.findMany({ where: { id: { in: accessibleDeptIds } }, orderBy: { name: "asc" } }),
    prisma.user.findMany({
      where: { memberships: { some: { departmentId: { in: accessibleDeptIds } } } },
      orderBy: { displayName: "asc" },
      select: { displayName: true },
    }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-neutral-900">Work Orders</h1>
          <p className="text-sm text-neutral-500">{total} total</p>
        </div>
        <Link href="/work-orders/new" className={buttonClass()}>
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
          <option value={OPEN_STATUS_FILTER}>Open (not closed/cancelled)</option>
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
        <AssignedFilterFields
          assignedToName={assignedToName}
          mine={mine === "1"}
          members={members}
          displayName={user.displayName}
        />
        <Button type="submit" variant="secondary">
          Filter
        </Button>
      </form>

      <SelectionProvider pageIds={workOrders.map((w) => w.id)} totalMatching={total}>
        <SelectionToolbar
          entityType="WorkOrder"
          filterParams={{ q, department, status, priority, mine, assignedToName }}
          actions={[{ label: "Bulk close selected", targetPath: "/work-orders/bulk-close" }]}
        />

        <table className="w-full overflow-hidden rounded-md border border-neutral-200 bg-white text-sm">
          <thead className="bg-neutral-100 text-left text-xs uppercase text-neutral-500">
            <tr>
              <th className="w-8 px-2 py-2 sm:px-4">
                <SelectAllHeaderCheckbox />
              </th>
              <th className="px-2 py-2 sm:px-4">WO#</th>
              <th className="px-2 py-2 sm:px-4">Description</th>
              <th className="hidden px-2 py-2 sm:px-4 sm:table-cell">Asset</th>
              <th className="hidden px-2 py-2 sm:px-4 lg:table-cell">Department</th>
              <th className="hidden px-2 py-2 sm:px-4 md:table-cell">Priority</th>
              <th className="hidden px-2 py-2 sm:px-4 lg:table-cell">Assigned</th>
              <th className="px-2 py-2 sm:px-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {workOrders.map((wo) => (
              <tr key={wo.id} className="hover:bg-neutral-50">
                <td className="px-2 py-2 sm:px-4">
                  <RowCheckbox id={wo.id} label={`Select ${wo.code}`} />
                </td>
                <td className="px-2 py-2 sm:px-4">
                  <Link href={`/work-orders/${wo.code}`} className="font-medium text-neutral-900 hover:underline">
                    {wo.code}
                  </Link>
                </td>
                <td className="px-2 py-2 sm:px-4">
                  {wo.description.length > 70 ? `${wo.description.slice(0, 70)}…` : wo.description}
                </td>
                <td className="hidden px-2 py-2 sm:px-4 text-neutral-500 sm:table-cell">
                  {wo.asset ? (
                    <Link href={`/assets/${wo.asset.assetTag}`} className="hover:underline">
                      {wo.asset.assetTag}
                    </Link>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="hidden px-2 py-2 sm:px-4 text-neutral-500 lg:table-cell">{wo.department.name}</td>
                <td className={`hidden px-2 py-2 sm:px-4 md:table-cell ${PRIORITY_STYLES[wo.priority]}`}>
                  {wo.priority.replace("_", " ")}
                </td>
                <td className="hidden px-2 py-2 sm:px-4 text-neutral-500 lg:table-cell">{wo.assignedTo?.displayName ?? "—"}</td>
                <td className="px-2 py-2 sm:px-4">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_STYLES[wo.status]}`}>
                    {wo.status.replace("_", " ")}
                  </span>
                </td>
              </tr>
            ))}
            {workOrders.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-neutral-500">
                  No work orders match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </SelectionProvider>

      <Pagination
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={pageSize}
        basePath="/work-orders"
        params={params}
      />
    </div>
  );
}
