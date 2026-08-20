export const CUSTOM_LOCATION_VALUE = "__custom__";

export type LocationInput = { locationId: string | null; customLocationText: string | null };

export function parseLocationInput(formData: FormData, fieldName = "locationId"): LocationInput | { error: string } {
  const raw = formData.get(fieldName);
  if (raw === CUSTOM_LOCATION_VALUE) {
    const customLocationText = String(formData.get("customLocationText") ?? "").trim();
    if (!customLocationText) return { error: "Describe the custom location." };
    return { locationId: null, customLocationText };
  }
  if (typeof raw === "string" && raw) return { locationId: raw, customLocationText: null };
  return { locationId: null, customLocationText: null };
}
