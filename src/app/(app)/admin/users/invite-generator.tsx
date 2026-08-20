"use client";

import { useState, useTransition } from "react";
import { generateInviteLink } from "./actions";

export function InviteGenerator() {
  const [pending, startTransition] = useTransition();
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  return (
    <div className="text-right">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setCopied(false);
          startTransition(async () => {
            const url = await generateInviteLink();
            setLink(url);
          });
        }}
        className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
      >
        {pending ? "Generating…" : "Generate invite link"}
      </button>
      {link && (
        <div className="mt-2 flex items-center gap-2">
          <input
            readOnly
            value={link}
            onFocus={(e) => e.target.select()}
            className="w-72 rounded-md border border-neutral-300 px-2 py-1 text-xs text-neutral-600"
          />
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(link);
              setCopied(true);
            }}
            className="text-xs font-medium text-neutral-700 hover:text-neutral-900"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      )}
      <p className="mt-1 text-xs text-neutral-400">Expires in 7 days, single use.</p>
    </div>
  );
}
