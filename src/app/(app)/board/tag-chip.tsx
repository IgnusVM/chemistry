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
  slate: "border-slate-300 bg-slate-100 text-slate-700",
  sky: "border-sky-300 bg-sky-100 text-sky-800",
  amber: "border-amber-300 bg-amber-100 text-amber-800",
  rose: "border-rose-300 bg-rose-100 text-rose-800",
  emerald: "border-emerald-300 bg-emerald-100 text-emerald-800",
  violet: "border-violet-300 bg-violet-100 text-violet-800",
  teal: "border-teal-300 bg-teal-100 text-teal-800",
  orange: "border-orange-300 bg-orange-100 text-orange-800",
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
