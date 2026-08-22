import "server-only";
import writeXlsxFile, { type SheetData } from "write-excel-file/node";
import type { ExportColumn, ExportValue } from "./columns";

export type ExportFormat = "xlsx" | "csv";

export function isExportFormat(v: string | null): v is ExportFormat {
  return v === "xlsx" || v === "csv";
}

/** Map a value to the cell type write-excel-file expects. */
function cellFor(value: ExportValue) {
  if (value == null) return { value: null };
  if (value instanceof Date) return { value, type: Date, format: "yyyy-mm-dd hh:mm" };
  if (typeof value === "number") return { value, type: Number };
  if (typeof value === "boolean") return { value, type: Boolean };
  return { value: String(value), type: String };
}

/**
 * Real .xlsx with typed cells — dates land as dates and numbers as numbers, so
 * they sort and filter properly in Excel or Sheets instead of being text.
 */
export async function buildXlsx<T>(rows: T[], columns: ExportColumn<T>[]): Promise<Buffer> {
  const header = columns.map((c) => ({ value: c.label, fontWeight: "bold" as const }));
  const body = rows.map((row) => columns.map((c) => cellFor(c.value(row))));
  const sheetData = [header, ...body] as SheetData;

  const file = await writeXlsxFile(sheetData, {
    sheet: "Chemistry export",
    columns: columns.map((c) => ({ width: c.width ?? 18 })),
  });
  return file.toBuffer();
}

/**
 * CSV fallback for Google Sheets or anything that dislikes xlsx. Written by
 * hand rather than pulled from a library: quoting rules are four lines, and the
 * parts that actually bite (a UTF-8 BOM so Excel doesn't mangle accents, CRLF
 * line endings) are things a parser library wouldn't give us anyway.
 */
export function buildCsv<T>(rows: T[], columns: ExportColumn<T>[]): Buffer {
  const escape = (v: ExportValue) => {
    if (v == null) return "";
    const s = v instanceof Date ? v.toISOString() : String(v);
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [
    columns.map((c) => escape(c.label)).join(","),
    ...rows.map((row) => columns.map((c) => escape(c.value(row))).join(",")),
  ];
  return Buffer.from("﻿" + lines.join("\r\n"), "utf8");
}

/** Strips anything a Content-Disposition filename shouldn't carry. */
export function exportFilename(base: string, format: ExportFormat) {
  const stamp = new Date().toISOString().slice(0, 10);
  const safe = base.replace(/[^A-Za-z0-9_-]/g, "-");
  return `${safe}-${stamp}.${format}`;
}

export function exportResponse(body: Buffer, filename: string, format: ExportFormat) {
  return new Response(new Uint8Array(body), {
    headers: {
      "Content-Type":
        format === "xlsx"
          ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          : "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      // Exports reflect a filter at a moment in time; never let one be reused.
      "Cache-Control": "no-store",
    },
  });
}

/**
 * Hard ceiling on an export. Reads are cheap but an unbounded export against a
 * cleared filter would happily try to serialize the entire database into one
 * request; better to cap and say so than to time out.
 */
export const MAX_EXPORT_ROWS = 10000;
