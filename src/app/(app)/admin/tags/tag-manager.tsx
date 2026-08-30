"use client";

import { useActionState, useState, useTransition } from "react";
import { createTag, updateTag, deleteTag, type TagFormState } from "./actions";
import { Button } from "@/components/button";
import { TagChip } from "@/app/(app)/board/tag-chip";
import { ColourPicker } from "./colour-picker";

type Tag = { id: string; name: string; color: string | null; _count: { cards: number } };

export function TagManager({ tags }: { tags: Tag[] }) {
  const [state, action, pending] = useActionState<TagFormState, FormData>(createTag, undefined);
  const [editState, editAction, editPending] = useActionState<TagFormState, FormData>(updateTag, undefined);
  const [editing, setEditing] = useState<string | null>(null);
  const [removing, startRemove] = useTransition();

  return (
    <div className="space-y-4">
      <form action={action} className="flex flex-wrap items-end gap-3 rounded-md border border-neutral-200 bg-white p-4">
        <div>
          <label className="block text-xs font-medium text-neutral-600">Name</label>
          <input
            name="name"
            required
            maxLength={24}
            placeholder="e.g. Lamplighters"
            className="mt-1 rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
          />
        </div>
        <ColourPicker />
        <Button type="submit" pending={pending} pendingText="Adding…">Add tag</Button>
        {state?.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
      </form>

      <ul className="flex flex-wrap gap-2">
        {tags.map((t) =>
          editing === t.id ? (
            <li key={t.id} className="w-full rounded-md border border-neutral-200 bg-white p-4">
              <form action={editAction} className="flex flex-wrap items-end gap-3">
                <input type="hidden" name="tagId" value={t.id} />
                <div>
                  <label className="block text-xs font-medium text-neutral-600">Name</label>
                  <input
                    name="name"
                    required
                    maxLength={24}
                    defaultValue={t.name}
                    className="mt-1 rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
                  />
                </div>
                <ColourPicker defaultValue={t.color ?? "slate"} />
                <Button type="submit" variant="secondary" pending={editPending} pendingText="Saving…">Save</Button>
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="inline-flex h-11 items-center rounded px-2 text-xs text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
                >
                  Cancel
                </button>
                {editState?.error && <p className="w-full text-sm text-red-600">{editState.error}</p>}
              </form>
              <p className="mt-2 text-xs text-neutral-500">
                Renaming or recolouring changes this tag everywhere it is used — it is one tag across
                every board, which is what makes filtering by it mean anything.
              </p>
            </li>
          ) : (
            <li
              key={t.id}
              className="inline-flex items-center gap-1.5 rounded-md border border-neutral-200 bg-white py-1 pr-1 pl-2"
            >
              <TagChip tag={t} />
              <span className="text-xs text-neutral-400 tabular-nums" title={`${t._count.cards} cards`}>
                {t._count.cards}
              </span>
              <button
                type="button"
                onClick={() => setEditing(t.id)}
                className="inline-flex h-11 items-center rounded px-1.5 text-xs text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
              >
                Edit
              </button>
              <button
                type="button"
                disabled={removing}
                onClick={() => startRemove(() => void deleteTag(t.id))}
                className="inline-flex h-11 items-center rounded px-1.5 text-xs text-neutral-600 hover:bg-neutral-100 hover:text-rose-600 disabled:opacity-50"
              >
                Remove
              </button>
            </li>
          ),
        )}
        {tags.length === 0 && (
          <li className="text-sm text-neutral-500">
            No tags yet. Tags are usually a team — add one above and it becomes available on every board.
          </li>
        )}
      </ul>
    </div>
  );
}
