import "server-only";
import type { CustomFieldDef } from "@/lib/custom-fields";

/**
 * Column catalogues for list exports. Each column knows how to pull its own
 * value off a row, so the export route never has to know the shape of what it's
 * exporting — adding a column here is the only step needed to offer it.
 *
 * Values are returned as real types (Date, number) rather than pre-formatted
 * strings wherever possible: the xlsx writer maps them to genuine Excel date
 * and number cells, so they sort and filter correctly in a spreadsheet instead
 * of being dead text.
 */
export type ExportValue = string | number | Date | boolean | null;

export type ExportColumn<T> = {
  key: string;
  label: string;
  /** Excel column width in characters. */
  width?: number;
  value: (row: T) => ExportValue;
};

/** Shape the assets export query must select. */
export type AssetExportRow = {
  assetTag: string;
  name: string;
  description: string | null;
  status: string;
  condition: string;
  acquisitionCost: { toString(): string } | null;
  acquisitionDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  customFields: unknown;
  assetType: { name: string; manufacturer: string | null; model: string | null };
  owningDepartment: { name: string };
  currentLocation: { name: string } | null;
  customLocationText: string | null;
  createdBy: { displayName: string } | null;
};

export const ASSET_COLUMNS: ExportColumn<AssetExportRow>[] = [
  { key: "assetTag", label: "Asset tag", width: 14, value: (a) => a.assetTag },
  { key: "name", label: "Name", width: 32, value: (a) => a.name },
  { key: "assetType", label: "Asset type", width: 24, value: (a) => a.assetType.name },
  { key: "manufacturer", label: "Manufacturer", width: 18, value: (a) => a.assetType.manufacturer },
  { key: "model", label: "Model", width: 18, value: (a) => a.assetType.model },
  { key: "department", label: "Department", width: 18, value: (a) => a.owningDepartment.name },
  { key: "status", label: "Status", width: 14, value: (a) => a.status.replace("_", " ") },
  { key: "condition", label: "Condition", width: 14, value: (a) => a.condition },
  {
    key: "location",
    label: "Location",
    width: 24,
    // A custom location is free text on the asset rather than a Location row;
    // both need to land in one column or the export looks half-empty.
    value: (a) => a.currentLocation?.name ?? a.customLocationText ?? null,
  },
  {
    key: "acquisitionCost",
    label: "Value",
    width: 12,
    value: (a) => (a.acquisitionCost == null ? null : Number(a.acquisitionCost.toString())),
  },
  { key: "acquisitionDate", label: "Acquired", width: 14, value: (a) => a.acquisitionDate },
  { key: "description", label: "Description", width: 40, value: (a) => a.description },
  { key: "createdBy", label: "Created by", width: 18, value: (a) => a.createdBy?.displayName ?? null },
  { key: "createdAt", label: "Created", width: 18, value: (a) => a.createdAt },
  { key: "updatedAt", label: "Last updated", width: 18, value: (a) => a.updatedAt },
];

/**
 * Custom fields are per-asset-type, so they're only offered when the list is
 * filtered to a single type — otherwise the column set would differ row to row
 * and mostly be blank.
 */
export function assetCustomFieldColumns(defs: CustomFieldDef[]): ExportColumn<AssetExportRow>[] {
  return defs.map((def) => ({
    key: `custom.${def.key}`,
    label: def.label,
    width: 20,
    value: (a: AssetExportRow) => {
      const fields = (a.customFields as Record<string, unknown>) ?? {};
      const raw = fields[def.key];
      if (raw == null || raw === "") return null;
      if (typeof raw === "number" || typeof raw === "boolean") return raw;
      return String(raw);
    },
  }));
}

/** Shape the work orders export query must select. */
export type WorkOrderExportRow = {
  code: string;
  description: string;
  type: string;
  priority: string;
  status: string;
  reportedAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  closedAt: Date | null;
  laborMinutes: number | null;
  resolutionNotes: string | null;
  createdAt: Date;
  asset: { assetTag: string; name: string } | null;
  department: { name: string };
  reportedBy: { displayName: string } | null;
  assignedTo: { displayName: string } | null;
  resolutionCode: { label: string } | null;
  partsUsed: { quantity: number; part: { partNumber: string } }[];
};

export const WORK_ORDER_COLUMNS: ExportColumn<WorkOrderExportRow>[] = [
  { key: "code", label: "WO #", width: 16, value: (w) => w.code },
  { key: "description", label: "Description", width: 44, value: (w) => w.description },
  { key: "status", label: "Status", width: 14, value: (w) => w.status.replace("_", " ") },
  { key: "priority", label: "Priority", width: 14, value: (w) => w.priority.replace("_", " ") },
  { key: "type", label: "Type", width: 14, value: (w) => w.type },
  { key: "assetTag", label: "Asset tag", width: 14, value: (w) => w.asset?.assetTag ?? null },
  { key: "assetName", label: "Asset name", width: 28, value: (w) => w.asset?.name ?? null },
  { key: "department", label: "Department", width: 18, value: (w) => w.department.name },
  { key: "reportedBy", label: "Reported by", width: 18, value: (w) => w.reportedBy?.displayName ?? null },
  { key: "assignedTo", label: "Assigned to", width: 18, value: (w) => w.assignedTo?.displayName ?? null },
  { key: "reportedAt", label: "Reported", width: 18, value: (w) => w.reportedAt },
  { key: "startedAt", label: "Started", width: 18, value: (w) => w.startedAt },
  { key: "completedAt", label: "Completed", width: 18, value: (w) => w.completedAt },
  { key: "closedAt", label: "Closed", width: 18, value: (w) => w.closedAt },
  { key: "resolutionCode", label: "Resolution code", width: 22, value: (w) => w.resolutionCode?.label ?? null },
  { key: "resolutionNotes", label: "Resolution notes", width: 44, value: (w) => w.resolutionNotes },
  { key: "laborMinutes", label: "Labor minutes", width: 14, value: (w) => w.laborMinutes },
  {
    key: "partsUsed",
    label: "Parts used",
    width: 30,
    value: (w) =>
      w.partsUsed.length === 0
        ? null
        : w.partsUsed.map((p) => `${p.part.partNumber} x${p.quantity}`).join(", "),
  },
];

/** Columns pre-ticked when someone opens the export dialog for the first time. */
export const DEFAULT_ASSET_COLUMNS = [
  "assetTag",
  "name",
  "assetType",
  "department",
  "status",
  "condition",
  "location",
];

export const DEFAULT_WORK_ORDER_COLUMNS = [
  "code",
  "description",
  "status",
  "priority",
  "assetTag",
  "department",
  "assignedTo",
  "reportedAt",
];
