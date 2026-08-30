import Link from "next/link";
import { WandSparkles, Sparkle } from "lucide-react";

const SPARKLES = [
  { top: "12%", left: "18%", size: 14, delay: "0ms" },
  { top: "68%", left: "12%", size: 10, delay: "180ms" },
  { top: "22%", left: "82%", size: 12, delay: "340ms" },
  { top: "72%", left: "78%", size: 16, delay: "90ms" },
  { top: "45%", left: "92%", size: 9, delay: "260ms" },
  { top: "85%", left: "45%", size: 11, delay: "420ms" },
];

export function NewWorkOrderButton() {
  return (
    <Link
      href="/work-orders/new"
      className="group relative isolate flex w-full items-center gap-4 overflow-hidden rounded-2xl sm:w-1/2 sm:min-w-[22rem] bg-[length:250%_250%] bg-[0%_50%] px-6 py-5 text-onaccent shadow-lg shadow-fuchsia-500/20 hover:scale-[1.02] hover:bg-[25%_50%] hover:shadow-2xl hover:shadow-fuchsia-500/40 active:scale-[0.98]"
      style={{
        backgroundImage:
          "linear-gradient(115deg, #f59e0b, #db2777, #9333ea, #db2777, #f59e0b)",
        transition:
          "transform 300ms ease, box-shadow 300ms ease, background-position 200ms ease-in-out",
      }}
    >
      {SPARKLES.map((s, i) => (
        <Sparkle
          key={i}
          className="pointer-events-none absolute text-onaccent opacity-0 group-hover:opacity-90"
          style={{
            top: s.top,
            left: s.left,
            width: s.size,
            height: s.size,
            animation: `sparkle-pop 1.3s ease-in-out infinite`,
            animationDelay: s.delay,
          }}
          fill="currentColor"
        />
      ))}
      <span className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6">
        <WandSparkles className="h-6 w-6" />
      </span>
      <span className="relative z-10 text-left">
        <span className="block text-base font-semibold">New Work Order</span>
        <span className="block text-xs text-onaccent/80">Report a problem or request work</span>
      </span>
    </Link>
  );
}
