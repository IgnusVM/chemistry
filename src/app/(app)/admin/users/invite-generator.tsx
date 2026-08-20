"use client";

import { useState, useTransition } from "react";
import { generateInviteLink } from "./actions";
import { Button } from "@/components/button";

export function InviteGenerator() {
  const [pending, startTransition] = useTransition();
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  return (
    <div className="text-right">
      <Button
        type="button"
        pending={pending}
        pendingText="Generating…"
        onClick={() => {
          setCopied(false);
          startTransition(async () => {
            const url = await generateInviteLink();
            setLink(url);
          });
        }}
      >
        Generate invite link
      </Button>
      {link && (
        <div className="mt-2 flex items-center gap-2">
          <input
            readOnly
            value={link}
            onFocus={(e) => e.target.select()}
            className="w-72 rounded-md border border-neutral-300 px-2 py-1 text-xs text-neutral-600"
          />
          <Button
            type="button"
            variant="ghost"
            className="!px-1.5 !py-0.5 text-xs"
            onClick={() => {
              navigator.clipboard.writeText(link);
              setCopied(true);
            }}
          >
            {copied ? "Copied!" : "Copy"}
          </Button>
        </div>
      )}
      <p className="mt-1 text-xs text-neutral-400">Expires in 7 days, single use.</p>
    </div>
  );
}
