"use client";

import { useTransition } from "react";
import { toggleDepartmentActive } from "./actions";

export function ToggleActiveButton({
  departmentId,
  active,
}: {
  departmentId: string;
  active: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => toggleDepartmentActive(departmentId, !active))}
      className="text-xs text-neutral-500 hover:text-neutral-900 disabled:opacity-50"
    >
      {active ? "Deactivate" : "Activate"}
    </button>
  );
}
