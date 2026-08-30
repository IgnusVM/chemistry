"use client";

import { useActionState, useRef, useEffect } from "react";
import { Plus } from "lucide-react";
import { createCard, type BoardActionState } from "./actions";

/**
 * Inline card capture.
 *
 * Title only, submitted without leaving the board (SC-002). Everything else on
 * a card is optional and added later — asking for more here is how a board
 * stops being faster than typing a message in chat, which is the bar it has to
 * clear to get used at all.
 */
export function NewCardForm({ boardId, columnId }: { boardId: string; columnId: string }) {
  const [state, action, pending] = useActionState<BoardActionState, FormData>(createCard, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Clear and refocus after a successful add, so several cards can be captured
  // in a row without reaching for the field again.
  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      inputRef.current?.focus();
    }
  }, [state]);

  return (
    // Matches the column header and the card list above it. It used to sit at
    // 4px while they sat at 12px and 8px, so the same column edge had three
    // different insets down its length and the submit button looked stuck to
    // the border.
    <form ref={formRef} action={action} className="px-3 pt-1 pb-3">
      <input type="hidden" name="boardId" value={boardId} />
      <input type="hidden" name="columnId" value={columnId} />
      <div className="flex items-center gap-1.5">
        <input
          ref={inputRef}
          name="title"
          required
          maxLength={120}
          placeholder="Add a card…"
          aria-label="New card title"
          className="min-w-0 flex-1 rounded-md border border-neutral-200 bg-white px-2 py-2 text-sm placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none"
        />
        <button
          type="submit"
          disabled={pending}
          aria-label="Add card"
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-100 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" aria-hidden />
        </button>
      </div>
      {state?.error ? <p className="mt-1 px-0.5 text-xs text-rose-600">{state.error}</p> : null}
    </form>
  );
}
