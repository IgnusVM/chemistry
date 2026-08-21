"use client";

import { useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { saveAssetCodeVersion, type SaveCodeVersionState } from "../../code-file-actions";
import { Button } from "@/components/button";

const CodeMirrorEditor = dynamic(() => import("@/components/code/code-mirror-editor").then((m) => m.CodeMirrorEditor), {
  ssr: false,
  loading: () => <div className="h-40 animate-pulse rounded-md border border-neutral-300 bg-neutral-50" />,
});

export function CodeFileEditorForm({
  codeFileId,
  filename,
  currentContent,
  workOrderId,
}: {
  codeFileId: string;
  filename: string;
  currentContent: string;
  workOrderId?: string;
}) {
  const [content, setContent] = useState(currentContent);
  const [message, setMessage] = useState("");
  const [state, setState] = useState<SaveCodeVersionState>(undefined);
  const [pending, startTransition] = useTransition();

  const save = () => {
    const formData = new FormData();
    formData.set("codeFileId", codeFileId);
    formData.set("content", content);
    formData.set("message", message);
    if (workOrderId) formData.set("workOrderId", workOrderId);
    startTransition(async () => {
      const result = await saveAssetCodeVersion(undefined, formData);
      setState(result);
      if (!result) setMessage("");
    });
  };

  return (
    <div className="space-y-2">
      <CodeMirrorEditor filename={filename} value={content} onChange={setContent} />
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <label className="block text-xs font-medium text-neutral-600">Commit message (optional)</label>
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="What changed…"
            className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
          />
        </div>
        <Button type="button" variant="secondary" pending={pending} pendingText="Saving…" onClick={save}>
          Save new version
        </Button>
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
    </div>
  );
}
