"use client";

import { useActionState, useTransition } from "react";
import { createTag, deleteTag, TAG_COLORS, type TagFormState } from "./actions";
import { Button } from "@/components/button";
import { TagChip } from "@/app/(app)/board/tag-chip";

export function TagManager({
  tags,
}: {
  tags: { id: string; name: string; color: string | null; _count: { cards: number } }[];
}) {
  const [state, action, pending] = useActionState<TagFormState, FormData>(createTag, undefined);
  const [removing, startRemove] = useTransition();

  return (
    <div className="space-y-4">
      <form action={action} className="flex flex-wrap items-end gap-3 rounded-md border border-neutral-200 bg-white p-4">
        <div>
          <label className="block text-xs font-medium text-neutral-600">Name</label>
          <input name="name" required maxLength={24} placeholder="e.g. Lamplighters" className="mt-1 rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-600">Colour</label>
          <select name="color" defaultValue="slate" className="mt-1 rounded-md border border-neutral-300 px-2 py-1.5 text-sm">
            {TAG_COLORS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <Button type="submit" pending={pending} pendingText="Adding…">Add tag</Button>
        {state?.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
      </form>

      <ul className="flex flex-wrap gap-2">
        {tags.map((t) => (
          <li key={t.id} className="inline-flex items-center gap-1.5 rounded-md border border-neutral-200 bg-white py-1 pr-1 pl-2">
            <TagChip tag={t} />
            <span className="text-xs text-neutral-400 tabular-nums">{t._count.cards}</span>
            <button
              type="button"
              disabled={removing}
              onClick={() => startRemove(() => void deleteTag(t.id))}
              className="rounded px-1.5 py-0.5 text-xs text-neutral-400 hover:bg-neutral-100 hover:text-rose-600 disabled:opacity-50"
            >
              Remove
            </button>
          </li>
        ))}
        {tags.length === 0 && <li className="text-sm text-neutral-500">No tags yet.</li>}
      </ul>
    </div>
  );
}
