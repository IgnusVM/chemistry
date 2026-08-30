"use client";

import { useState, useTransition } from "react";
import { ShieldCheck } from "lucide-react";
import { setDirector } from "./actions";

/**
 * The Director badge, and the control that grants it.
 *
 * Two rules that are easy to lose sight of:
 *
 *   1. The toggle is rendered only for the root Director. That is presentation,
 *      not protection — `setDirector` refuses anyone else regardless of what
 *      the page chose to draw.
 *   2. The ROOT's own badge is deliberately not shown. Their standing in the
 *      organisation is their department role, and a "Director" chip beside
 *      their name would invite exactly the confusion about hierarchy it is
 *      meant to avoid. Other Directors do show the badge.
 */
export function DirectorBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-700">
      <ShieldCheck className="h-3 w-3" aria-hidden />
      Director
    </span>
  );
}

export function DirectorToggle({
  userId,
  isDirector,
  isRoot,
}: {
  userId: string;
  isDirector: boolean;
  isRoot: boolean;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (isRoot) {
    return (
      <span className="text-xs whitespace-nowrap text-neutral-500" title="Set by configuration">
        Director (permanent)
      </span>
    );
  }

  return (
    <div>
      <label className="flex items-center gap-2 text-xs whitespace-nowrap text-neutral-600">
        <input
          type="checkbox"
          checked={isDirector}
          disabled={pending}
          onChange={(e) => {
            const next = e.target.checked;
            setError(null);
            start(async () => {
              try {
                await setDirector(userId, next);
              } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to update.");
              }
            });
          }}
        />
        Director
      </label>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
