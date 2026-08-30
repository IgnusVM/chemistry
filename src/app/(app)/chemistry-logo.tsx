/**
 * The dashboard logo.
 *
 * The mark is painted artwork (VanMule, `chemistry3.png`) rather than the
 * hand-built SVG flask that used to live here, so it is a raster asset served
 * from `public/`. It is cropped to its own content and padded back to a square,
 * which is what lets it drop into the identical box the SVG occupied without
 * moving the wordmark beside it.
 *
 * It carries its own colour instead of inheriting `currentColor`, so unlike the
 * old mark it does not restyle for dark mode. It does not need to: the glass is
 * translucent, so on a dark ground it composites darker and the linework inside
 * stays legible. Checked on both grounds rather than assumed.
 */
export function ChemistryLogo() {
  return (
    // The mark carries ~3% transparent padding of its own, so the optical gap
    // runs a little wider than the gap utility alone suggests.
    <div className="flex items-center gap-2 sm:gap-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/chemistry-logo.webp"
        alt=""
        width={640}
        height={640}
        // Decorative: the wordmark beside it already names the product, so a
        // screen reader announcing it again would only add noise.
        aria-hidden="true"
        className="h-24 w-24 shrink-0 drop-shadow-sm sm:h-52 sm:w-52 lg:h-56 lg:w-56"
      />
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
