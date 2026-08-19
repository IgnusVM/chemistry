import { z } from "zod";

export const CUSTOM_FIELD_TYPES = ["string", "number", "boolean", "date", "select"] as const;
export type CustomFieldType = (typeof CUSTOM_FIELD_TYPES)[number];

export const customFieldDefSchema = z
  .object({
    key: z
      .string()
      .min(1)
      .regex(/^[a-zA-Z][a-zA-Z0-9_]*$/, "key must be a valid identifier"),
    label: z.string().min(1),
    type: z.enum(CUSTOM_FIELD_TYPES),
    required: z.boolean().optional(),
    options: z.array(z.string().min(1)).optional(),
  })
  .refine((def) => def.type !== "select" || (def.options && def.options.length > 0), {
    message: "select fields must declare at least one option",
    path: ["options"],
  });

export type CustomFieldDef = z.infer<typeof customFieldDefSchema>;

export const customFieldSchemaSchema = z.array(customFieldDefSchema).refine(
  (defs) => new Set(defs.map((d) => d.key)).size === defs.length,
  { message: "custom field keys must be unique" },
);

function zodForField(def: CustomFieldDef): z.ZodTypeAny {
  let base: z.ZodTypeAny;
  switch (def.type) {
    case "string":
      base = z.string();
      break;
    case "number":
      base = z.coerce.number();
      break;
    case "boolean":
      base = z.coerce.boolean();
      break;
    case "date":
      base = z.coerce.date();
      break;
    case "select":
      base = z.enum(def.options as [string, ...string[]]);
      break;
  }
  return def.required ? base : base.optional().nullable();
}

export function buildCustomFieldsSchema(defs: CustomFieldDef[]) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const def of defs) {
    shape[def.key] = zodForField(def);
  }
  return z.object(shape).strict();
}

export function validateCustomFields(defs: CustomFieldDef[], values: unknown) {
  return buildCustomFieldsSchema(defs).parse(values);
}
