"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { BOARD_COLORS } from "@/lib/board-colors";

/**
 * Pick a tag colour by looking at it.
 *
 * This replaces a `<select>` that listed the colour *words* — "slate", "sky",
 * "amber" — so choosing one meant knowing what the app's amber looks like
 * before you saw it.
 *
 * The values are palette tokens, not hex. That is deliberate and worth
 * defending: the app themes itself by remapping palette variables, so a stored
 * hex would be correct in one theme and wrong in the other, and a colour picked
 * on a light screen could be unreadable on a dark one. Every token here is a
 * tuned triple — border, background, text — that holds up in both, which an
 * arbitrary colour cannot promise.
 */
const SWATCH: Record<string, string> = {
  slate: "bg-slate-200 text-slate-800",
  stone: "bg-stone-200 text-stone-800",
  red: "bg-red-200 text-red-800",
  orange: "bg-orange-200 text-orange-800",
  amber: "bg-amber-200 text-amber-800",
  lime: "bg-lime-200 text-lime-800",
  emerald: "bg-emerald-200 text-emerald-800",
  teal: "bg-teal-200 text-teal-800",
  cyan: "bg-cyan-200 text-cyan-800",
  sky: "bg-sky-200 text-sky-800",
  blue: "bg-blue-200 text-blue-800",
  indigo: "bg-indigo-200 text-indigo-800",
  violet: "bg-violet-200 text-violet-800",
  purple: "bg-purple-200 text-purple-800",
  pink: "bg-pink-200 text-pink-800",
  rose: "bg-rose-200 text-rose-800",
};

export function ColourPicker({
  name = "color",
  defaultValue = "slate",
  label = "Colour",
}: {
  name?: string;
  defaultValue?: string;
  label?: string;
}) {
  const [value, setValue] = useState(defaultValue);

  return (
    <fieldset>
      <legend className="text-xs font-medium text-neutral-600">{label}</legend>
      <input type="hidden" name={name} value={value} />
      <div className="mt-1 flex flex-wrap gap-1.5">
        {BOARD_COLORS.map((c) => {
          const on = value === c;
          return (
            <button
              key={c}
              type="button"
              onClick={() => setValue(c)}
              aria-pressed={on}
              // The name is the accessible label. A swatch grid that announces
              // only "button" is unusable without sight, and colour is never
              // the only carrier of meaning in this app.
              aria-label={c}
              title={c}
              className={`inline-flex h-8 w-8 items-center justify-center rounded-md border transition-[box-shadow,border-color] ${SWATCH[c]} ${
                on
                  ? "border-neutral-900 ring-2 ring-neutral-900 ring-offset-1"
                  : "border-black/10 hover:border-neutral-400"
              }`}
            >
              {on ? <Check className="h-4 w-4" aria-hidden /> : null}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
