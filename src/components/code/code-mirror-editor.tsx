"use client";

import CodeMirror from "@uiw/react-codemirror";
import { python } from "@codemirror/lang-python";
import { cpp } from "@codemirror/lang-cpp";
import { javascript } from "@codemirror/lang-javascript";
import type { Extension } from "@codemirror/state";

// Language inferred from the filename's extension — same idea GitHub uses.
// Falls back to no language extension (plain text with line numbers/folding
// still work fine) for anything unrecognized.
function languageFor(filename: string): Extension[] {
  const ext = filename.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "py":
      return [python()];
    case "c":
    case "h":
    case "cpp":
    case "hpp":
    case "ino":
      return [cpp()];
    case "js":
    case "jsx":
    case "ts":
    case "tsx":
      return [javascript({ jsx: true, typescript: ext.startsWith("ts") })];
    default:
      return [];
  }
}

export function CodeMirrorEditor({
  filename,
  value,
  onChange,
  readOnly = false,
}: {
  filename: string;
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-md border border-neutral-300">
      <CodeMirror
        value={value}
        onChange={onChange}
        readOnly={readOnly}
        extensions={languageFor(filename)}
        basicSetup={{ lineNumbers: true, foldGutter: true }}
        height="20rem"
        className="text-sm"
      />
    </div>
  );
}
