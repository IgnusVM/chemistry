import { z } from "zod";

/**
 * Card titles are capped deliberately.
 *
 * A card has to be readable at a glance on a phone, and a title long enough to
 * wrap four lines defeats the board's purpose. The cap is a design constraint,
 * not a storage one (Constitution Principle V).
 */
const title = z.string().trim().min(1, "Give the card a title.").max(120, "Keep the title short enough to scan.");
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : null));

export const createCardSchema = z.object({
  boardId: z.string().min(1),
  title,
  columnId: z.string().optional(),
});

export const updateCardSchema = z.object({
  cardId: z.string().min(1),
  title,
  ownerUserId: z
    .string()
    .optional()
    .transform((v) => (v ? v : null)),
  nextAction: optionalText(200),
  statusNotes: optionalText(2000),
  dueDate: z
    .string()
    .optional()
    .transform((v) => (v ? new Date(v) : null))
    .refine((d) => d === null || !Number.isNaN(d.getTime()), "That date isn't valid."),
});

export const moveCardSchema = z.object({
  cardId: z.string().min(1),
  toColumnId: z.string().min(1),
  // The card's `updatedAt` as the client last saw it. A mismatch means someone
  // else moved it first, and this move is refused rather than silently
  // overwriting theirs (FR-032).
  expectedUpdatedAt: z.string().min(1),
});
