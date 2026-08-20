export function ChemistryLogo() {
  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 48 48" className="h-12 w-12 shrink-0 drop-shadow-sm" fill="none">
        <defs>
          <linearGradient id="chem-mark" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="50%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#0d9488" />
          </linearGradient>
        </defs>
        <path
          d="M20 5h8v10.5l8.4 17.6A4.2 4.2 0 0 1 32.6 39H15.4a4.2 4.2 0 0 1-3.8-5.9L20 15.5V5z"
          stroke="url(#chem-mark)"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <path d="M17 7.5h14" stroke="url(#chem-mark)" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M14.5 29.5h19" stroke="url(#chem-mark)" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
        <circle cx="22" cy="34" r="1.6" fill="url(#chem-mark)" />
        <circle cx="27.5" cy="33" r="1.1" fill="url(#chem-mark)" />
        <circle cx="24.5" cy="24" r="1.3" fill="url(#chem-mark)" />
        <path
          d="M39 4.5l1.1 2.9 2.9 1.1-2.9 1.1L39 12.5l-1.1-2.9-2.9-1.1 2.9-1.1L39 4.5z"
          fill="url(#chem-mark)"
        />
      </svg>
      <div>
        <div className="bg-gradient-to-r from-amber-500 via-fuchsia-600 to-teal-600 bg-clip-text text-3xl font-bold leading-tight tracking-tight text-transparent sm:text-4xl">
          Chemistry
        </div>
        <div className="text-xs font-medium uppercase tracking-widest text-neutral-400">
          Alchemy Asset Management System
        </div>
      </div>
    </div>
  );
}
