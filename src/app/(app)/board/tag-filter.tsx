"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { X } from "lucide-react";
import type { CardTagView } from "@/lib/board";
import { TagChip } from "./tag-chip";

/**
 * Filter by tag.
 *
 * The active filter lives in the URL rather than in component state, which is
 * what makes FR-029 true rather than aspirational: a filter cannot persist
 * invisibly across sessions if it is visible in the address bar and gone the
 * moment you navigate afresh. A board that is quietly filtered is a board that
 * lies, and lying is the specific failure this feature exists to end.
 */
export function TagFilter({ tags, activeTagId }: { tags: CardTagView[]; activeTagId?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  if (tags.length === 0) return null;

  function apply(tagId: string | null) {
    const next = new URLSearchParams(params.toString());
    if (tagId) next.set("tag", tagId);
    else next.delete("tag");
    router.push(next.size ? `${pathname}?${next}` : pathname);
  }

  const active = tags.find((t) => t.id === activeTagId);

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {active ? (
        <>
          <span className="text-xs font-medium text-neutral-700">Showing only</span>
          <TagChip tag={active} />
          <button
            type="button"
            onClick={() => apply(null)}
            className="inline-flex items-center gap-1 rounded border border-neutral-300 bg-white px-1.5 py-0.5 text-[11px] font-medium text-neutral-600 hover:bg-neutral-100"
          >
            <X className="h-3 w-3" aria-hidden />
            Clear
          </button>
        </>
      ) : (
        <>
          <span className="text-xs text-neutral-500">Filter:</span>
          {tags.map((t) => (
            <button key={t.id} type="button" onClick={() => apply(t.id)} className="hover:opacity-80">
              <TagChip tag={t} />
            </button>
          ))}
        </>
      )}
    </div>
  );
}
