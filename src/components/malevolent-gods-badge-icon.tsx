import { MalevolentGodLogo } from "@/components/malevolent-god-logo";

/**
 * Full, uncropped Malevolent Gods mark for use as a small badge — unlike
 * ChemistryLogo's use of this same artwork (clipped inside a flask outline),
 * a badge needs the whole head visible. Reuses the same thick-stroke-over-fill
 * treatment (stroke width scaled up from the flask version's 18/48 units to
 * 24/40 here) that makes the fine linework read clearly at a small size.
 */
export function MalevolentGodsBadgeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} fill="none" aria-hidden="true">
      <g stroke="currentColor" strokeWidth="24" strokeLinejoin="round">
        <MalevolentGodLogo showFlourish={false} x={2} y={2} width={36} height={36} preserveAspectRatio="xMidYMid meet" />
      </g>
    </svg>
  );
}
