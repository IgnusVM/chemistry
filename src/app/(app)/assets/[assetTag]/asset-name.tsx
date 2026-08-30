"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Pencil } from "lucide-react";
import { renameAsset, type RenameAssetState } from "../actions";
import { Button } from "@/components/button";

/**
 * The asset's name, editable in place.
 *
 * It swaps the heading for an input rather than opening a panel: renaming is a
 * one-field correction, usually a typo caught while standing in front of the
 * thing, and a whole form for it would be more ceremony than the task deserves.
 *
 * Only the name. The asset tag beneath it stays fixed, because it is printed on
 * the sticker and encoded in that sticker's QR code.
 */
export function AssetName({ assetId, name }: { assetId: string; name: string }) {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, action, pending] = useActionState<RenameAssetState, FormData>(
    async (prev, fd) => {
      const res = await renameAsset(prev, fd);
      if (!res?.error) setOpen(false);
      return res;
    },
    undefined,
  );

  useEffect(() => {
    if (open) inputRef.current?.select();
  }, [open]);

  if (!open) {
    return (
      <div className="flex items-center gap-1">
        <h1 className="text-xl font-semibold text-neutral-900">{name}</h1>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Rename this asset"
          // Same negative-margin trick the help control uses: the activation
          // region reaches 44px without the heading row growing to match.
          className="-my-3 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 print:hidden"
        >
          <Pencil className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>
    );
  }

  return (
    <form action={action} className="print:hidden">
      <input type="hidden" name="assetId" value={assetId} />
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          name="name"
          defaultValue={name}
          required
          maxLength={200}
          aria-label="Asset name"
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
          }}
          className="min-w-0 flex-1 rounded-md border border-neutral-300 px-2 py-1 text-xl font-semibold text-neutral-900 focus:border-neutral-400 focus:outline-none"
        />
        <Button type="submit" variant="secondary" pending={pending} pendingText="Saving…">
          Save
        </Button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="inline-flex h-11 items-center rounded px-2 text-xs text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
        >
          Cancel
        </button>
      </div>
      {state?.error ? <p className="mt-1 text-sm text-red-600">{state.error}</p> : null}
    </form>
  );
}
