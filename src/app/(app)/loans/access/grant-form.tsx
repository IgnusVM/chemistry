"use client";

import { useState, useTransition } from "react";
import { grantLoanPrivilege, type LoanFormState } from "../../assets/loan-actions";
import { Button } from "@/components/button";

export function GrantForm({
  departmentId,
  users,
}: {
  departmentId: string;
  users: { id: string; displayName: string }[];
}) {
  const [state, setState] = useState<LoanFormState>(undefined);
  const [pending, startTransition] = useTransition();
  const [resetKey, setResetKey] = useState(0);

  return (
    <form
      key={resetKey}
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        startTransition(async () => {
          const result = await grantLoanPrivilege(undefined, formData);
          setState(result);
          if (!result || !("error" in result)) setResetKey((k) => k + 1);
        });
      }}
      className="mt-3 flex flex-wrap items-end gap-2 border-t border-neutral-100 pt-3"
    >
      <input type="hidden" name="departmentId" value={departmentId} />
      <div className="min-w-0 flex-1">
        <label className="block text-xs font-medium text-neutral-600">Give access to</label>
        <select
          name="userId"
          required
          defaultValue=""
          className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        >
          <option value="" disabled>
            Choose someone…
          </option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.displayName}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" variant="secondary" pending={pending} pendingText="Granting…">
        Grant
      </Button>
      {state?.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
