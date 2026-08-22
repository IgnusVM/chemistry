import { MalevolentGodLogo } from "@/components/malevolent-god-logo";

const FLASK_PATH = "M20 5h8v10.5l8.4 17.6A4.2 4.2 0 0 1 32.6 39H15.4a4.2 4.2 0 0 1-3.8-5.9L20 15.5V5z";

// Scattered along the belly's inner edges (kept ~2 units inside the glass outline at
// each height — the belly tapers from ~19-29 wide near the neck to ~15-33 at the
// bottom, so a fixed x/y grid clips outside the glass unless computed per-row) and
// away from the elephant emblem's bounding box (x 15-33, y 21-38).
const BUBBLES = [
  { x: 16, y: 35.5, r: 0.55 },
  { x: 32.3, y: 34.5, r: 0.45 },
  { x: 18.8, y: 23.5, r: 0.4 },
  { x: 30.3, y: 25.5, r: 0.5 },
  { x: 21.8, y: 19, r: 0.35 },
  { x: 26.3, y: 18.5, r: 0.4 },
  { x: 15.3, y: 30.5, r: 0.35 },
  { x: 32.5, y: 31, r: 0.4 },
  { x: 24, y: 36.8, r: 0.45 },
];

export function ChemistryLogo() {
  return (
    <div className="flex items-center gap-3 sm:gap-6">
      <svg
        viewBox="0 0 48 48"
        className="h-24 w-24 shrink-0 drop-shadow-sm sm:h-52 sm:w-52 lg:h-56 lg:w-56"
        fill="none"
      >
        <defs>
          <linearGradient id="chem-mark" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="50%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#0d9488" />
          </linearGradient>
          <linearGradient id="chem-bubble-rainbow" x1="12" y1="16" x2="36" y2="39" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="20%" stopColor="#f97316" />
            <stop offset="40%" stopColor="#eab308" />
            <stop offset="60%" stopColor="#22c55e" />
            <stop offset="80%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
          <clipPath id="chem-flask-clip">
            <path d={FLASK_PATH} />
          </clipPath>
        </defs>

        <g
          clipPath="url(#chem-flask-clip)"
          // Via a CSS variable rather than a literal: the emblem is stroked
          // near-black, which disappears against a dark page.
          style={{ color: "var(--chem-emblem)" }}
          stroke="currentColor"
          strokeWidth="18"
          strokeLinejoin="round"
        >
          <MalevolentGodLogo
            showFlourish={false}
            x={15}
            y={21}
            width={18}
            height={17}
            preserveAspectRatio="xMidYMid meet"
          />
        </g>

        <path
          d={FLASK_PATH}
          stroke="url(#chem-mark)"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <path d="M17 7.5h14" stroke="url(#chem-mark)" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M14.5 29.5h19" stroke="url(#chem-mark)" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
        <g clipPath="url(#chem-flask-clip)">
          {BUBBLES.map((b, i) => (
            <circle key={i} cx={b.x} cy={b.y} r={b.r} fill="url(#chem-bubble-rainbow)" opacity="0.55" />
          ))}
        </g>
        <path
          d="M39 4.5l1.1 2.9 2.9 1.1-2.9 1.1L39 12.5l-1.1-2.9-2.9-1.1 2.9-1.1L39 4.5z"
          fill="url(#chem-mark)"
        />
      </svg>
      <div className="min-w-0">
        <div className="bg-gradient-to-r from-amber-500 via-fuchsia-600 to-teal-600 bg-clip-text text-3xl font-bold leading-tight tracking-tight text-transparent sm:text-4xl lg:text-5xl">
          Chemistry
        </div>
        <div className="text-[10px] font-medium uppercase tracking-widest text-neutral-400 sm:text-xs lg:text-sm">
          Alchemy Asset Management System
        </div>
      </div>
    </div>
  );
}
