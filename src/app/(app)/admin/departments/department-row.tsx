"use client";

import { useState, useTransition } from "react";
import { updateDepartment, type DepartmentFormState } from "./actions";
import { ToggleActiveButton } from "./toggle-active-button";
import { Button } from "@/components/button";

const inputClass = "rounded-md border border-neutral-300 px-2 py-1 text-sm";

export function DepartmentRow({
  department,
  divisions,
}: {
  department: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    divisionId: string | null;
    divisionName: string | null;
    active: boolean;
    assetCount: number;
    memberCount: number;
  };
  divisions: { id: string; name: string }[];
}) {
  const [editing, setEditing] = useState(false);
  const [state, setState] = useState<DepartmentFormState>(undefined);
  const [pending, startTransition] = useTransition();

  if (editing) {
    return (
      <tr>
        <td colSpan={7} className="px-4 py-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              startTransition(async () => {
                const result = await updateDepartment(undefined, formData);
                setState(result);
                if (!result || !("error" in result)) setEditing(false);
              });
            }}
            className="flex flex-wrap items-end gap-3"
          >
            <input type="hidden" name="id" value={department.id} />
            <div>
              <label className="block text-xs font-medium text-neutral-600">Name</label>
              <input name="name" required defaultValue={department.name} className={`mt-1 ${inputClass}`} />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-600">Slug</label>
              <input name="slug" required defaultValue={department.slug} className={`mt-1 ${inputClass}`} />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-600">Division</label>
              <select name="divisionId" defaultValue={department.divisionId ?? ""} className={`mt-1 ${inputClass}`}>
                <option value="">(None)</option>
                {divisions.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-[12rem] flex-1">
              <label className="block text-xs font-medium text-neutral-600">Description</label>
              <input name="description" defaultValue={department.description ?? ""} className={`mt-1 w-full ${inputClass}`} />
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
      <td className="px-4 py-2 font-medium text-neutral-900">{department.name}</td>
      <td className="px-4 py-2 text-neutral-500">{department.divisionName ?? "–"}</td>
      <td className="px-4 py-2 text-neutral-500">{department.slug}</td>
      <td className="px-4 py-2">{department.assetCount}</td>
      <td className="px-4 py-2">{department.memberCount}</td>
      <td className="px-4 py-2">
        {department.active ? (
          <span className="text-green-700">Active</span>
        ) : (
          <span className="text-neutral-400">Inactive</span>
        )}
      </td>
      <td className="px-4 py-2 text-right">
        <div className="flex items-center justify-end gap-3">
          <button type="button" onClick={() => setEditing(true)} className="text-xs text-neutral-400 hover:text-neutral-700">
            Edit
          </button>
          <ToggleActiveButton departmentId={department.id} active={department.active} />
        </div>
      </td>
    </tr>
  );
}
