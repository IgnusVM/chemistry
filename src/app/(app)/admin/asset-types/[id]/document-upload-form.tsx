"use client";

import { useActionState, useRef, useState } from "react";
import { uploadAssetTypeDocuments } from "../actions";
import { FileInput } from "@/components/file-input";
import { Button } from "@/components/button";

export function DocumentUploadForm({ assetTypeId }: { assetTypeId: string }) {
  const [state, action, pending] = useActionState(uploadAssetTypeDocuments, undefined);
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
      <input type="hidden" name="assetTypeId" value={assetTypeId} />
      <FileInput
        key={resetKey}
        name="files"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,image/*"
        multiple
        label="Choose documents"
      />
      <Button type="submit" variant="secondary" pending={pending} pendingText="Uploading…">
        Upload document
      </Button>
      {state?.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
