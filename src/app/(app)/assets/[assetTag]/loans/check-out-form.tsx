"use client";

import { useState, useTransition } from "react";
import { checkOutAsset, type LoanFormState } from "../../loan-actions";
import { Button } from "@/components/button";

export function CheckOutForm({
  assetId,
  currentUserId,
  canLendToOthers,
  members,
}: {
  assetId: string;
  currentUserId: string;
  canLendToOthers: boolean;
  members: { id: string; displayName: string }[];
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
          const result = await checkOutAsset(undefined, formData);
          setState(result);
          if (!result || !("error" in result)) setResetKey((k) => k + 1);
        });
      }}
      className="mt-3 space-y-3 border-t border-neutral-100 pt-3"
    >
      <input type="hidden" name="assetId" value={assetId} />

      {canLendToOthers ? (
        <div>
          <label className="block text-xs font-medium text-neutral-600">Checking out to</label>
          <select
            name="borrowerUserId"
            defaultValue={currentUserId}
            className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
          >
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.id === currentUserId ? `${m.displayName} (me)` : m.displayName}
              </option>
            ))}
          </select>
        </div>
      ) : (
        // Without lead rights the borrower is always you; the server enforces
        // this too, so a forged field can't reassign the loan.
        <input type="hidden" name="borrowerUserId" value={currentUserId} />
      )}

      <div>
        <label className="block text-xs font-medium text-neutral-600">Notes (optional)</label>
        <input
          name="notes"
          placeholder="Taking it to the build site…"
          className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
      </div>

      <Button type="submit" pending={pending} pendingText="Checking out…">
        Check out
      </Button>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
