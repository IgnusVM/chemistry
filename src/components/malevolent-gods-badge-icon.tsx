import { MalevolentGodLogo } from "@/components/malevolent-god-logo";

/**
 * Full, uncropped Malevolent Gods mark for use as a small badge — unlike
 * ChemistryLogo's use of this same artwork (clipped inside a flask outline),
 * a badge needs the whole head visible, tentacle flourish included (the
 * canonical version, as always rendered in DAN's game). Reuses the same
 * thick-stroke-over-fill treatment (stroke width scaled up from the flask
 * version's 18/48 units to 24/40 here) that makes the fine linework read
 * clearly at a small size. The flourish paths carry their own thin
 * strokeWidth (5/11/4) baked into the source SVG, which normally wins over
 * an ancestor's inherited value — the scoped <style> below forces them to
 * match the body's thick stroke instead, via a real CSS rule (which always
 * beats a presentation attribute, unlike plain inheritance).
 */
export function MalevolentGodsBadgeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} fill="none" aria-hidden="true">
      <style>{".mg-badge-icon path[stroke] { stroke-width: 24; }"}</style>
      <g className="mg-badge-icon" stroke="currentColor" strokeWidth="24" strokeLinejoin="round">
        <MalevolentGodLogo x={2} y={2} width={36} height={36} preserveAspectRatio="xMidYMid meet" />
      </g>
    </svg>
  );
}
