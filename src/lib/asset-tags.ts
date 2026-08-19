import { z } from "zod";

export const sequentialTagRangeSchema = z.object({
  prefix: z
    .string()
    .min(1)
    .regex(/^[A-Za-z0-9._-]*$/, "prefix may only contain letters, numbers, dot, dash, underscore"),
  start: z.coerce.number().int().min(0),
  count: z.coerce.number().int().min(1).max(500),
  pad: z.coerce.number().int().min(0).max(8),
});

export function generateSequentialTags(input: z.infer<typeof sequentialTagRangeSchema>) {
  const { prefix, start, count, pad } = input;
  return Array.from({ length: count }, (_, i) => `${prefix}${String(start + i).padStart(pad, "0")}`);
}

export function parseTagList(raw: string) {
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const line of raw.split(/[\n,]/)) {
    const tag = line.trim();
    if (!tag) continue;
    if (seen.has(tag)) continue;
    seen.add(tag);
    tags.push(tag);
  }
  return tags;
}

export const assetTagSchema = z
  .string()
  .min(1)
  .regex(/^[A-Za-z0-9._-]+$/, "use letters, numbers, dot, dash, underscore");
