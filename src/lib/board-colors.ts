/**
 * Shared colour vocabulary for board columns and tags.
 *
 * Deliberately a plain module, NOT exported from any `"use server"` file.
 * Every export from a server-action file is replaced by an action reference,
 * so a constant exported there arrives on the client as a function and blows
 * up at first use — which is exactly how `TAG_COLORS.map is not a function`
 * happened, passing tsc, lint, and build on the way.
 */
export const BOARD_COLORS = [
  "slate", "stone", "red", "orange", "amber", "lime",
  "emerald", "teal", "cyan", "sky", "blue", "indigo",
  "violet", "purple", "pink", "rose",
] as const;

export type BoardColor = (typeof BOARD_COLORS)[number];
