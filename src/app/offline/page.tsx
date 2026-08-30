import { WifiOff } from "lucide-react";

export const metadata = { title: "Offline · Chemistry" };

export default function OfflinePage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-3 px-6 text-center">
      <WifiOff className="h-10 w-10 text-neutral-300" />
      <h1 className="text-lg font-semibold text-neutral-900">No signal</h1>
      <p className="text-sm text-neutral-500">
        Chemistry needs a connection to load asset and work order data. This page will work again as
        soon as you&rsquo;re back on a network.
      </p>
      <p className="text-xs text-neutral-400">Anything you already had open stays on screen.</p>
    </div>
  );
}
