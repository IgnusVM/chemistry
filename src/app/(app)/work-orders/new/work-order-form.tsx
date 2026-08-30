"use client";
import { FileText } from "lucide-react";

import { useActionState, useState } from "react";
import { createWorkOrder } from "../actions";
import type { Department, Asset } from "@/generated/prisma/client";
import { Button } from "@/components/button";
import { WO_TYPES, WO_PRIORITIES, WO_TASK_MAX_LENGTH, statusLabel } from "@/lib/constants";

const inputClass = "w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm";

export function WorkOrderForm({
  departments,
  prefillAsset,
}: {
  departments: Department[];
  prefillAsset: (Asset & { owningDepartment: Department }) | null;
}) {
  const [state, action, pending] = useActionState(createWorkOrder, undefined);

  return (
    <form action={action} className="space-y-4 rounded-md border border-neutral-200 bg-white p-4">
      <Field label="Asset tag (optional)">
        <input
          name="assetTag"
          defaultValue={prefillAsset?.assetTag ?? ""}
          placeholder="LL-0042"
          className={inputClass}
        />
        {prefillAsset && (
          <p className="mt-1 text-xs text-neutral-400">{prefillAsset.name}</p>
        )}
      </Field>

      <Field label="Department">
        <select
          name="departmentId"
          required
          defaultValue={prefillAsset?.owningDepartmentId ?? ""}
          className={inputClass}
        >
          <option value="">Select…</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Type">
          <select name="type" defaultValue="CORRECTIVE" className={inputClass}>
            {WO_TYPES.map((t) => (
              <option key={t} value={t}>
                {statusLabel(t)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Priority">
          <select name="priority" defaultValue="NORMAL" className={inputClass}>
            {WO_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {statusLabel(p)}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Title">
        <input name="title" required maxLength={140} autoFocus placeholder="One line: what is wrong" className={inputClass} />
      </Field>

      <Field label="What’s wrong">
        <textarea
          name="description"
          rows={6}
          required
          placeholder="What happened, what you already tried, anything the next person needs to know…"
          className={inputClass}
        />
      </Field>

      <TaskFields />

      <Button type="submit" pending={pending} pendingText="Creating…">
        Create work order
      </Button>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-neutral-600">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}


/**
 * Optional checklist, filled in while the ticket is being written.
 *
 * Rows appear as they are used rather than all at once. Most tickets have no
 * checklist, and three empty boxes on every form would be three things to skip
 * past every time one is filed.
 */
function TaskRow({ index }: { index: number }) {
  const [showInstructions, setShowInstructions] = useState(false);
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1">
        <input
          name="tasks"
          maxLength={WO_TASK_MAX_LENGTH}
          placeholder={index === 0 ? "Something that has to happen" : "Another task"}
          aria-label={`Task ${index + 1}`}
          className={`${inputClass} min-w-0 flex-1`}
        />
        <button
          type="button"
          onClick={() => setShowInstructions((v) => !v)}
          aria-expanded={showInstructions}
          aria-label={`${showInstructions ? "Hide" : "Add"} instructions for task ${index + 1}`}
          title={showInstructions ? "Hide instructions" : "Add instructions"}
          className="-my-3 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
        >
          <FileText className="h-4 w-4" aria-hidden />
        </button>
      </div>
      {/* Always submitted, even when hidden, so instructions stay aligned with
          their task by index on the server. */}
      <textarea
        name="taskInstructions"
        rows={3}
        maxLength={2000}
        hidden={!showInstructions}
        placeholder="What to do, in as much detail as it needs"
        aria-label={`Instructions for task ${index + 1}`}
        className={`${inputClass} resize-y`}
      />
    </div>
  );
}

function TaskFields() {
  const [count, setCount] = useState(1);
  return (
    <Field label="Tasks (optional)">
      <div className="space-y-1.5">
        {Array.from({ length: count }).map((_, i) => (
          <TaskRow key={i} index={i} />
        ))}
        {count < 10 ? (
          <button
            type="button"
            onClick={() => setCount((c) => c + 1)}
            className="inline-flex h-9 items-center rounded-md px-2 text-xs text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
          >
            + Another task
          </button>
        ) : null}
      </div>
    </Field>
  );
}