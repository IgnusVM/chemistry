/**
 * Board density, remembered per device.
 *
 * A cookie rather than localStorage, deliberately: the board is
 * server-rendered, so reading the preference on the server means the first
 * paint is already correct. localStorage would render comfortable, hydrate,
 * then snap to compact — a layout jump on every single board load.
 *
 * Unlike the tag filter, this SHOULD persist. A filter changes what data you
 * are looking at, so remembering it invisibly makes the board lie (FR-029).
 * Density only changes how it looks, and a preference you have to re-set every
 * visit is just an annoyance.
 */
export const DENSITY_COOKIE = "chemistry.board-density";

export type Density = "comfortable" | "compact";

export function parseDensity(value: string | undefined): Density {
  return value === "compact" ? "compact" : "comfortable";
}
