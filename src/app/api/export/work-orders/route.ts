import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser, getAccessibleDepartmentIds } from "@/lib/dal";
import { buildWorkOrderWhere, type WorkOrderListParams } from "@/app/(app)/work-orders/where";
import { WORK_ORDER_COLUMNS } from "@/lib/export/columns";
import {
  buildCsv,
  buildXlsx,
  exportFilename,
  exportResponse,
  isExportFormat,
  type ExportFormat,
  MAX_EXPORT_ROWS,
} from "@/lib/export/write";

export async function GET(req: NextRequest) {
  const user = await requireCurrentUser();
  const sp = req.nextUrl.searchParams;

  const rawFormat = sp.get("format");
  const format: ExportFormat = isExportFormat(rawFormat) ? rawFormat : "xlsx";
  const requested = (sp.get("columns") ?? "").split(",").filter(Boolean);

  const params: WorkOrderListParams = {
    q: sp.get("q") ?? undefined,
    department: sp.get("department") ?? undefined,
    status: sp.get("status") ?? undefined,
    priority: sp.get("priority") ?? undefined,
    mine: sp.get("mine") ?? undefined,
    assignedToName: sp.get("assignedToName") ?? undefined,
  };

  // Department scoping is applied by the shared where-builder, so an export can
  // never reach past what this user is allowed to see in the list itself.
  const accessibleDeptIds = await getAccessibleDepartmentIds("VIEWER");
  const where = buildWorkOrderWhere(params, { userId: user.id, accessibleDeptIds });

  const columns = WORK_ORDER_COLUMNS.filter((c) => requested.includes(c.key));
  if (columns.length === 0) {
    return new Response("Pick at least one column to export.", { status: 400 });
  }

  const rows = await prisma.workOrder.findMany({
    where,
    orderBy: [{ priority: "desc" }, { reportedAt: "desc" }],
    take: MAX_EXPORT_ROWS,
    include: {
      asset: { select: { assetTag: true, name: true } },
      department: { select: { name: true } },
      reportedBy: { select: { displayName: true } },
      assignedTo: { select: { displayName: true } },
      resolutionCode: { select: { label: true } },
      partsUsed: { select: { quantity: true, part: { select: { partNumber: true } } } },
    },
  });

  const filename = exportFilename("work-orders", format);
  const body =
    format === "xlsx"
      ? await buildXlsx(rows, columns)
      : buildCsv(rows, columns);

  return exportResponse(body, filename, format);
}
