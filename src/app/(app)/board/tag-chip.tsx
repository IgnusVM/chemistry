import type { CardTagView } from "@/lib/board";

/**
 * Colours are supplementary, never the signal.
 *
 * The tag's NAME is always shown (FR-027). Colour helps someone scan a
 * familiar board quickly; it must not be the only thing carrying meaning, for
 * colour-blind readers and for anyone reading a phone in direct sun — which is
 * the actual deployment context.
 */
const TAG_STYLE: Record<string, string> = {
  slate: "border-slate-300 bg-slate-100 text-slate-800",
  stone: "border-stone-300 bg-stone-100 text-stone-800",
  red: "border-red-300 bg-red-100 text-red-800",
  orange: "border-orange-300 bg-orange-100 text-orange-800",
  amber: "border-amber-300 bg-amber-100 text-amber-800",
  lime: "border-lime-300 bg-lime-100 text-lime-800",
  emerald: "border-emerald-300 bg-emerald-100 text-emerald-800",
  teal: "border-teal-300 bg-teal-100 text-teal-800",
  cyan: "border-cyan-300 bg-cyan-100 text-cyan-800",
  sky: "border-sky-300 bg-sky-100 text-sky-800",
  blue: "border-blue-300 bg-blue-100 text-blue-800",
  indigo: "border-indigo-300 bg-indigo-100 text-indigo-800",
  violet: "border-violet-300 bg-violet-100 text-violet-800",
  purple: "border-purple-300 bg-purple-100 text-purple-800",
  pink: "border-pink-300 bg-pink-100 text-pink-800",
  rose: "border-rose-300 bg-rose-100 text-rose-800",
};

export function TagChip({ tag }: { tag: CardTagView }) {
  return (
    <span
      className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[11px] font-medium ${
        TAG_STYLE[tag.color ?? ""] ?? TAG_STYLE.slate
      }`}
    >
      {tag.name}
    </span>
  );
}
