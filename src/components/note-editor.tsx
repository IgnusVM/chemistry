"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

const RichTextEditor = dynamic(
  () => import("@/components/rich-text/rich-text-editor").then((m) => m.RichTextEditor),
  { ssr: false, loading: () => <div className="h-40 animate-pulse rounded-md border border-neutral-300 bg-neutral-50" /> },
);

export function NoteEditor({
  bodyFieldName = "body",
  formatFieldName = "format",
  placeholder = "Add a note…",
}: {
  bodyFieldName?: string;
  formatFieldName?: string;
  placeholder?: string;
}) {
  const [mode, setMode] = useState<"HTML" | "MARKDOWN">("HTML");
  const [html, setHtml] = useState("");
  const [markdown, setMarkdown] = useState("");

  return (
    <div>
      <div className="mb-1.5 flex items-center gap-3 text-xs">
        <button
          type="button"
          onClick={() => setMode("HTML")}
          className={mode === "HTML" ? "font-semibold text-fuchsia-700" : "text-neutral-500 hover:text-neutral-700"}
        >
          Rich text
        </button>
        <button
          type="button"
          onClick={() => setMode("MARKDOWN")}
          className={mode === "MARKDOWN" ? "font-semibold text-fuchsia-700" : "text-neutral-500 hover:text-neutral-700"}
        >
          Markdown
        </button>
      </div>
      <input type="hidden" name={formatFieldName} value={mode} />
      {mode === "HTML" ? (
        <>
          <input type="hidden" name={bodyFieldName} value={html} />
          <RichTextEditor value={html} onChange={setHtml} />
        </>
      ) : (
        <textarea
          name={bodyFieldName}
          rows={5}
          value={markdown}
          onChange={(e) => setMarkdown(e.target.value)}
          placeholder={`${placeholder} Markdown supported — **bold**, lists, and fenced code blocks.`}
          className="w-full rounded-md border border-neutral-300 px-2 py-1.5 font-mono text-sm"
        />
      )}
    </div>
  );
}
