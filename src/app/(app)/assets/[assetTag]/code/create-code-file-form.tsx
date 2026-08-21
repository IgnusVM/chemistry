"use client";

import { useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { createAssetCodeFile, type CreateCodeFileState } from "../../code-file-actions";
import { Button } from "@/components/button";

const CodeMirrorEditor = dynamic(() => import("@/components/code/code-mirror-editor").then((m) => m.CodeMirrorEditor), {
  ssr: false,
  loading: () => <div className="h-40 animate-pulse rounded-md border border-neutral-300 bg-neutral-50" />,
});

export function CreateCodeFileForm({ assetId }: { assetId: string }) {
  const [state, setState] = useState<CreateCodeFileState>(undefined);
  const [pending, startTransition] = useTransition();
  const [filename, setFilename] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");

  const submit = () => {
    const formData = new FormData();
    formData.set("assetId", assetId);
    formData.set("filename", filename);
    formData.set("description", description);
    formData.set("content", content);
    startTransition(async () => {
      const result = await createAssetCodeFile(undefined, formData);
      setState(result);
      if (!result) {
        setFilename("");
        setDescription("");
        setContent("");
      }
    });
  };

  return (
    <div className="space-y-2 rounded-md border border-neutral-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-neutral-900">New code file</h2>
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="block text-xs font-medium text-neutral-600">Filename</label>
          <input
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
            placeholder="charging-logic.py"
            className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
          />
        </div>
        <div className="flex-1">
          <label className="block text-xs font-medium text-neutral-600">Description (optional)</label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What this file does…"
            className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
          />
        </div>
      </div>
      <CodeMirrorEditor filename={filename || "file.txt"} value={content} onChange={setContent} />
      <Button type="button" variant="secondary" pending={pending} pendingText="Creating…" onClick={submit}>
        + Create file
      </Button>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
    </div>
  );
}
