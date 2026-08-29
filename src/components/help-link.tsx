import Link from "next/link";
import { CircleHelp } from "lucide-react";
import { existingHelpArticles } from "@/lib/help-articles";

/**
 * A small control that opens the help article for whatever it sits beside.
 *
 * It replaces the explanatory subtitles that used to sit under page titles. Those
 * were read by everyone whether they needed them or not, had to stay short enough
 * not to dominate the header, and drifted out of date where nobody maintained
 * them. An article can be as long as the subject deserves and lives in one place.
 *
 * Deliberately NOT a tooltip or a popover. Hover doesn't exist on the primary
 * platform, which is a phone, and reproducing article text in an overlay would
 * fork content that is already long, linked, and searchable.
 *
 * It renders **nothing** when its article is missing, rather than a dead link —
 * a control that spends the user's trust and then 404s is worse than no control.
 * Articles are admin-editable, so this is a real case, not a theoretical one.
 */
export async function HelpLink({
  topic,
  article,
  className = "",
}: {
  /** What this explains, in the user's words — becomes the accessible name. */
  topic: string;
  /** `category/slug`, e.g. `assets/asset-groups`. */
  article: string;
  /** Placement only. Not for restyling: it must read as the same affordance everywhere. */
  className?: string;
}) {
  const existing = await existingHelpArticles();
  if (!existing.has(article)) return null;

  return (
    <Link
      href={`/help/${article}`}
      aria-label={`Help: ${topic}`}
      // The negative margin keeps the 44px activation region from growing the
      // header row it sits in — the hit box gets bigger, the layout does not move.
      className={`-my-3 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 print:hidden ${className}`}
    >
      <CircleHelp className="h-4 w-4" aria-hidden />
    </Link>
  );
}
