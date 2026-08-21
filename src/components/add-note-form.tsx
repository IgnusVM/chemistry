"use client";

import { useState, useTransition } from "react";
import { NoteEditor } from "@/components/note-editor";
import { Button } from "@/components/button";

export function AddNoteForm({
  action,
  hiddenFieldName,
  hiddenFieldValue,
}: {
  action: (formData: FormData) => Promise<void> | void;
  hiddenFieldName: string;
  hiddenFieldValue: string;
}) {
  const [pending, startTransition] = useTransition();
  // NoteEditor owns its own controlled state (Tiptap content / markdown
  // text) internally — a native form.reset() can't reach into that, so
  // clearing it after a successful add means remounting it with a fresh
  // key, same pattern used for FileInput elsewhere in this app.
  const [resetKey, setResetKey] = useState(0);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        startTransition(async () => {
          await action(formData);
          setResetKey((k) => k + 1);
        });
      }}
      className="mt-3 space-y-2"
    >
      <input type="hidden" name={hiddenFieldName} value={hiddenFieldValue} />
      <NoteEditor key={resetKey} />
      <Button type="submit" variant="secondary" pending={pending} pendingText="Adding…">
        Add note
      </Button>
    </form>
  );
}
