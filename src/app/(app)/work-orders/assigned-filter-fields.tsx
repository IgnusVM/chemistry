"use client";

import { useRef } from "react";

export function AssignedFilterFields({
  assignedToName,
  mine,
  members,
  displayName,
}: {
  assignedToName?: string;
  mine: boolean;
  members: { displayName: string }[];
  displayName: string;
}) {
  const nameInputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <input
        ref={nameInputRef}
        name="assignedToName"
        list="dept-members"
        defaultValue={assignedToName}
        placeholder="Assigned to…"
        className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
      />
      <datalist id="dept-members">
        {members.map((m) => (
          <option key={m.displayName} value={m.displayName} />
        ))}
      </datalist>
      <label className="flex items-center gap-1.5 text-sm text-neutral-600">
        <input
          type="checkbox"
          name="mine"
          value="1"
          defaultChecked={mine}
          onChange={(e) => {
            const input = nameInputRef.current;
            if (!input) return;
            if (e.target.checked) {
              input.value = displayName;
            } else if (input.value === displayName) {
              input.value = "";
            }
          }}
        />
        Assigned to me
      </label>
    </>
  );
}
