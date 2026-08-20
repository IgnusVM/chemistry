"use client";

import { useActionState, useRef } from "react";
import { uploadAssetTypeDocuments } from "../actions";

export function DocumentUploadForm({ assetTypeId }: { assetTypeId: string }) {
  const [state, action, pending] = useActionState(uploadAssetTypeDocuments, undefined);
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
      <input type="hidden" name="assetTypeId" value={assetTypeId} />
      <input
        type="file"
        name="files"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,image/*"
        multiple
        className="text-sm"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium hover:bg-neutral-100 disabled:opacity-50"
      >
        {pending ? "Uploading…" : "Upload document"}
      </button>
      {state?.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
