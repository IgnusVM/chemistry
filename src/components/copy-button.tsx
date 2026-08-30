"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, X } from "lucide-react";

/**
 * Copy one short value — an asset tag, a work order number, a serial.
 *
 * These get read off a screen and typed into a radio call, a spreadsheet or a
 * supplier's website, and a mistyped asset tag is a wrong record rather than an
 * error. Copying is the whole feature.
 *
 * It reports failure rather than pretending. The clipboard API needs a secure
 * context, so over plain http on a laptop at the event it will refuse, and a
 * button that silently does nothing is worse than one that says so.
 */
export function CopyButton({
  value,
  label,
  className = "",
}: {
  /** The exact text to place on the clipboard. */
  value: string;
  /** What is being copied, for the accessible name: "asset tag", "work order number". */
  label: string;
  className?: string;
}) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const timer = useRef<number | null>(null);

  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);

  async function copy() {
    if (timer.current) window.clearTimeout(timer.current);
    try {
      await navigator.clipboard.writeText(value);
      setState("copied");
    } catch {
      setState("failed");
    }
    timer.current = window.setTimeout(() => setState("idle"), 1800);
  }

  const Icon = state === "copied" ? Check : state === "failed" ? X : Copy;

  return (
    <button
      type="button"
      onClick={copy}
      // The state is announced, not just coloured: "Copied" has to reach someone
      // using a screen reader, and green-vs-grey is not a message.
      aria-label={
        state === "copied" ? `${label} copied`
        : state === "failed" ? `Could not copy ${label}`
        : `Copy ${label}`
      }
      title={state === "failed" ? "Couldn't copy — select the text instead" : `Copy ${label}`}
      // Negative margin keeps the 44px target from growing the line it sits in.
      className={`-my-3 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md align-middle transition-colors print:hidden ${
        state === "copied"
          ? "text-green-700"
          : state === "failed"
            ? "text-red-600"
            : "text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
      } ${className}`}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      <span role="status" aria-live="polite" className="sr-only">
        {state === "copied" ? `${label} copied` : state === "failed" ? `Could not copy ${label}` : ""}
      </span>
    </button>
  );
}
