"use client";

import { useActionState, useRef, useState } from "react";
import { uploadWorkOrderAttachments } from "../actions";
import { FileInput } from "@/components/file-input";
import { Button } from "@/components/button";

export function AttachmentUploadForm({ workOrderId }: { workOrderId: string }) {
  const [state, action, pending] = useActionState(uploadWorkOrderAttachments, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const [resetKey, setResetKey] = useState(0);

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        await action(formData);
        formRef.current?.reset();
        setResetKey((k) => k + 1);
      }}
      className="mt-3 flex flex-wrap items-center gap-3"
    >
      <input type="hidden" name="workOrderId" value={workOrderId} />
      <FileInput key={resetKey} name="files" accept="image/*" multiple label="Choose photos" />
      <Button type="submit" variant="secondary" pending={pending} pendingText="Uploading…">
        Upload photos
      </Button>
      {state?.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
