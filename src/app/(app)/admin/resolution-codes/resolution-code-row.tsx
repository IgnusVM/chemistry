"use client";

import { useState, useTransition } from "react";
import { updateResolutionCode, type ResolutionCodeFormState } from "./actions";
import { Button } from "@/components/button";

const inputClass = "rounded-md border border-neutral-300 px-2 py-1 text-sm";

export function ResolutionCodeRow({ resolutionCode }: { resolutionCode: { id: string; code: string; label: string } }) {
  const [editing, setEditing] = useState(false);
  const [state, setState] = useState<ResolutionCodeFormState>(undefined);
  const [pending, startTransition] = useTransition();

  if (editing) {
    return (
      <tr>
        <td colSpan={3} className="px-4 py-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              startTransition(async () => {
                const result = await updateResolutionCode(undefined, formData);
                setState(result);
                if (!result || !("error" in result)) setEditing(false);
              });
            }}
            className="flex flex-wrap items-end gap-3"
          >
            <input type="hidden" name="id" value={resolutionCode.id} />
            <div>
              <label className="block text-xs font-medium text-neutral-600">Code</label>
              <input
                name="code"
                required
                defaultValue={resolutionCode.code}
                className={`mt-1 font-mono uppercase ${inputClass}`}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-600">Label</label>
              <input name="label" required defaultValue={resolutionCode.label} className={`mt-1 ${inputClass}`} />
            </div>
            <Button type="submit" variant="secondary" pending={pending} pendingText="Saving…">
              Save
            </Button>
            <button type="button" onClick={() => setEditing(false)} className="text-xs text-neutral-500 hover:text-neutral-700">
              Cancel
            </button>
            {state?.error && <p className="w-full text-xs text-red-600">{state.error}</p>}
          </form>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td className="px-4 py-2 font-mono text-xs text-neutral-900">{resolutionCode.code}</td>
      <td className="px-4 py-2">{resolutionCode.label}</td>
      <td className="px-4 py-2 text-right">
        <button type="button" onClick={() => setEditing(true)} className="text-xs text-neutral-400 hover:text-neutral-700">
          Edit
        </button>
      </td>
    </tr>
  );
}
