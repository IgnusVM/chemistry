"use client";

import { useId, useRef, useState } from "react";
import { Paperclip, Upload } from "lucide-react";

export function FileInput({
  name,
  accept,
  multiple,
  label = "Choose files",
}: {
  name: string;
  accept?: string;
  multiple?: boolean;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<string[]>([]);
  const id = useId();

  return (
    <div>
      <input
        ref={inputRef}
        id={id}
        name={name}
        type="file"
        accept={accept}
        multiple={multiple}
        className="sr-only"
        onChange={(e) => setFiles(Array.from(e.target.files ?? []).map((f) => f.name))}
      />
      <label
        htmlFor={id}
        className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 transition-all duration-150 ease-out hover:border-fuchsia-300 hover:bg-fuchsia-50/60 hover:text-fuchsia-900 active:scale-[0.97]"
      >
        <Upload className="h-3.5 w-3.5" />
        {label}
      </label>
      {files.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {files.map((name, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600"
            >
              <Paperclip className="h-3 w-3" />
              {name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
