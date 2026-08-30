"use client";

import { useState } from "react";

/**
 * Holds the quote still.
 *
 * The server picks a random quote per request, which is right: a new one each
 * time you come back to the dashboard. The problem is that "per request"
 * includes requests nobody made. Next's dev server re-fetches this page's RSC
 * payload about once a second, and each of those re-runs the picker, so the
 * quote flickers while you are reading it.
 *
 * Freezing the first value in state fixes it at the only layer that can tell
 * the two apart. The server still renders a real quote, so there is no
 * hydration mismatch and no flash of empty space; subsequent props are ignored,
 * so a background refetch cannot swap it; and a genuine navigation or reload
 * mounts a new component, which is exactly when a new quote is wanted.
 *
 * This is not only a development nicety. Anything that revalidates this route —
 * a server action elsewhere in the app — would otherwise change the quote under
 * the reader in production too.
 */
export function DashboardQuote({ quote }: { quote: { text: string; author: string } }) {
  const [shown] = useState(quote);

  return (
    <blockquote className="border-l-2 border-neutral-200 pl-4">
      <p className="text-sm text-neutral-600 italic">&ldquo;{shown.text}&rdquo;</p>
      <footer className="mt-1 text-xs text-neutral-400">{shown.author}</footer>
    </blockquote>
  );
}
