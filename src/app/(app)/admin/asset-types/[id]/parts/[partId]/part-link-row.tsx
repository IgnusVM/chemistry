"use client";

import { useState, useTransition } from "react";
import { updatePartLink, type PartLinkFormState } from "../../../actions";
import { DeletePartLinkButton } from "./delete-part-link-button";
import { Button } from "@/components/button";
import { UserBadgeLabel } from "@/components/user-badge";
import type { ResolvedBadge } from "@/lib/user-badge-data";

const inputClass = "rounded-md border border-neutral-300 px-2 py-1 text-sm";

export function PartLinkRow({
  link,
  createdByBadge,
}: {
  link: { id: string; url: string; price: string | null };
  createdByBadge: ResolvedBadge | null;
}) {
  const [editing, setEditing] = useState(false);
  const [state, setState] = useState<PartLinkFormState>(undefined);
  const [pending, startTransition] = useTransition();

  if (editing) {
    return (
      <li className="py-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            startTransition(async () => {
              const result = await updatePartLink(undefined, formData);
              setState(result);
              if (!result || !("error" in result)) setEditing(false);
            });
          }}
          className="flex flex-wrap items-end gap-2"
        >
          <input type="hidden" name="linkId" value={link.id} />
          <div className="min-w-[16rem] flex-1">
            <label className="block text-xs font-medium text-neutral-600">Link</label>
            <input name="url" type="url" required defaultValue={link.url} className={`mt-1 w-full ${inputClass}`} />
          </div>
          <div className="w-28">
            <label className="block text-xs font-medium text-neutral-600">Price ($)</label>
            <input
              name="price"
              type="number"
              min={0}
              step="0.01"
              defaultValue={link.price ?? ""}
              className={`mt-1 w-full ${inputClass}`}
            />
          </div>
          <Button type="submit" variant="secondary" pending={pending} pendingText="Saving…">
            Save
          </Button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="text-xs text-neutral-500 hover:text-neutral-700"
          >
            Cancel
          </button>
          {state && "error" in state && <p className="w-full text-xs text-red-600">{state.error}</p>}
        </form>
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between py-2 text-sm">
      <div>
        <a href={link.url} target="_blank" rel="noopener noreferrer" className="font-medium text-neutral-900 hover:underline">
          {link.url}
        </a>
        {link.price && <span className="ml-2 text-neutral-500">${link.price.toString()}</span>}
        <div className="text-xs text-neutral-400">
          Added by <UserBadgeLabel badge={createdByBadge} />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => setEditing(true)} className="text-xs text-neutral-400 hover:text-neutral-700">
          Edit
        </button>
        <DeletePartLinkButton linkId={link.id} />
      </div>
    </li>
  );
}
