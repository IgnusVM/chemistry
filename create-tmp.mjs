import { readFileSync, writeFileSync } from "node:fs";

// --- action: accept a title and a list of tasks ---
const a = "src/app/(app)/work-orders/actions.ts";
let s = readFileSync(a, "utf8");
const nl = s.includes("\r\n") ? "\r\n" : "\n";

s = s.replace("  description: z.string().min(1),",
  "  title: z.string().trim().min(1, \"Give it a title.\").max(140),\n  description: z.string().min(1),");
writeFileSync(a, s);

// --- form: title field + task rows ---
const f = "src/app/(app)/work-orders/new/work-order-form.tsx";
let t = readFileSync(f, "utf8");
const from = [
  '      <Field label="Description">',
  '        <textarea name="description" rows={4} required autoFocus className={inputClass} />',
  '      </Field>',
].join(nl);
if (!t.includes(from)) throw new Error("description field not found");

const to = [
  '      <Field label="Title">',
  '        <input name="title" required maxLength={140} autoFocus placeholder="One line: what is wrong" className={inputClass} />',
  '      </Field>',
  '',
  '      <Field label="What’s wrong">',
  '        <textarea',
  '          name="description"',
  '          rows={6}',
  '          required',
  '          placeholder="What happened, what you already tried, anything the next person needs to know…"',
  '          className={inputClass}',
  '        />',
  '      </Field>',
  '',
  '      <TaskFields />',
].join(nl);
t = t.replace(from, to);

// the task rows component
t = t.trimEnd() + nl + nl + [
  '/**',
  ' * Optional checklist, filled in while the ticket is being written.',
  ' *',
  ' * Rows appear as they are used rather than all at once: a ticket usually has',
  ' * no checklist, and three empty boxes on every form would be three things to',
  ' * skip past every time.',
  ' */',
  'function TaskFields() {',
  '  const [count, setCount] = useState(1);',
  '  return (',
  '    <Field label="Tasks (optional)">',
  '      <div className="space-y-1.5">',
  '        {Array.from({ length: count }).map((_, i) => (',
  '          <input',
  '            key={i}',
  '            name="tasks"',
  '            maxLength={50}',
  '            placeholder={i === 0 ? "Something that has to happen first" : "Another task"}',
  '            aria-label={`Task ${i + 1}`}',
  '            className={inputClass}',
  '          />',
  '        ))}',
  '        {count < 10 ? (',
  '          <button',
  '            type="button"',
  '            onClick={() => setCount((c) => c + 1)}',
  '            className="inline-flex h-9 items-center rounded-md px-2 text-xs text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"',
  '          >',
  '            + Another task',
  '          </button>',
  '        ) : null}',
  '      </div>',
  '    </Field>',
  '  );',
  '}',
].join(nl) + nl;

if (!t.includes("useState")) {
  t = t.replace(/import \{([^}]*)\} from "react";/, (m, inner) =>
    inner.includes("useState") ? m : `import {${inner.replace(/\s*$/, "")}, useState } from "react";`);
}
writeFileSync(f, t);
console.log("create form updated");
