"use client";

import { useActionState, useRef } from "react";
import { uploadWorkOrderAttachments } from "../actions";

export function AttachmentUploadForm({ workOrderId }: { workOrderId: string }) {
  const [state, action, pending] = useActionState(uploadWorkOrderAttachments, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        await action(formData);
        formRef.current?.reset();
      }}
      className="mt-3 flex flex-wrap items-center gap-2"
    >
      <input type="hidden" name="workOrderId" value={workOrderId} />
      <input
        type="file"
        name="files"
        accept="image/*"
        multiple
        className="text-sm"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium hover:bg-neutral-100 disabled:opacity-50"
      >
        {pending ? "Uploading…" : "Upload photos"}
      </button>
      {state?.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
