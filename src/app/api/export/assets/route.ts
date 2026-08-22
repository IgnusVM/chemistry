import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/dal";
import { buildAssetWhere, type AssetListParams } from "@/app/(app)/assets/where";
import type { CustomFieldDef } from "@/lib/custom-fields";
import {
  ASSET_COLUMNS,
  assetCustomFieldColumns,
  type AssetExportRow,
  type ExportColumn,
} from "@/lib/export/columns";
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
  await requireCurrentUser();
  const sp = req.nextUrl.searchParams;

  const rawFormat = sp.get("format");
  const format: ExportFormat = isExportFormat(rawFormat) ? rawFormat : "xlsx";
  const requested = (sp.get("columns") ?? "").split(",").filter(Boolean);

  // Same where-builder the list page uses, so an export can never disagree with
  // the rows the user was looking at when they pressed Export.
  const params: AssetListParams = {
    q: sp.get("q") ?? undefined,
    department: sp.get("department") ?? undefined,
    status: sp.get("status") ?? undefined,
    type: sp.get("type") ?? undefined,
  };
  const where = buildAssetWhere(params);

  // Custom fields are only meaningful when a single type is selected.
  let available: ExportColumn<AssetExportRow>[] = ASSET_COLUMNS;
  if (params.type) {
    const assetType = await prisma.assetType.findUnique({ where: { id: params.type } });
    if (assetType) {
      const defs = (assetType.customFieldSchema as unknown as CustomFieldDef[]) ?? [];
      available = [...ASSET_COLUMNS, ...assetCustomFieldColumns(defs)];
    }
  }

  // Preserve the order the catalogue defines rather than the order they arrived
  // in, so two people exporting the same columns get identical sheets.
  const columns = available.filter((c) => requested.includes(c.key));
  if (columns.length === 0) {
    return new Response("Pick at least one column to export.", { status: 400 });
  }

  const rows = await prisma.asset.findMany({
    where,
    orderBy: { assetTag: "asc" },
    take: MAX_EXPORT_ROWS,
    include: {
      assetType: { select: { name: true, manufacturer: true, model: true } },
      owningDepartment: { select: { name: true } },
      currentLocation: { select: { name: true } },
      createdBy: { select: { displayName: true } },
    },
  });

  const filename = exportFilename("assets", format);
  const body =
    format === "xlsx"
      ? await buildXlsx(rows, columns)
      : buildCsv(rows, columns);

  return exportResponse(body, filename, format);
}
