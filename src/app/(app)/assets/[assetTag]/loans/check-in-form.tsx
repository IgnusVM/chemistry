"use client";

import { useState, useTransition } from "react";
import { checkInAsset, type LoanFormState } from "../../loan-actions";
import { Button } from "@/components/button";

export function CheckInForm({ loanId }: { loanId: string }) {
  const [state, setState] = useState<LoanFormState>(undefined);
  const [pending, startTransition] = useTransition();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        startTransition(async () => {
          setState(await checkInAsset(undefined, formData));
        });
      }}
      className="mt-3 space-y-3 border-t border-amber-200 pt-3"
    >
      <input type="hidden" name="loanId" value={loanId} />
      <div>
        <label className="block text-xs font-medium text-neutral-600">
          Condition on return (optional)
        </label>
        <input
          name="notes"
          placeholder="Back in one piece…"
          className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm"
        />
      </div>
      <Button type="submit" pending={pending} pendingText="Checking in…">
        Check back in
      </Button>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
