import Link from "next/link";
import { ScanLine, Boxes } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/dal";
import { getRandomQuote } from "@/lib/quotes";
import { ChemistryLogo } from "./chemistry-logo";
import { NewWorkOrderButton } from "./new-work-order-button";
import { WORK_ORDER_STATUS_STYLES as STATUS_STYLES } from "@/lib/status-styles";
import { TERMINAL_WO_STATUSES } from "@/lib/constants";

export default async function DashboardPage() {
  const user = await requireCurrentUser();

  const myWorkOrders = await prisma.workOrder.findMany({
    where: { assignedToUserId: user.id, status: { notIn: [...TERMINAL_WO_STATUSES] } },
    orderBy: [{ priority: "desc" }, { reportedAt: "desc" }],
    take: 20,
  });

  const quote = getRandomQuote();

  // The dashboard is a sparse landing page, so it keeps a cap while list and
  // board pages use the full width. Stretched to 1920 the hero banner becomes
  // a huge empty gradient and the assigned-work rows fling their status badge
  // to the far edge, which reads as broken rather than spacious.
  return (
    <div className="max-w-5xl space-y-8">
      <ChemistryLogo />

      <blockquote className="border-l-2 border-neutral-200 pl-4">
        <p className="text-sm italic text-neutral-600">&ldquo;{quote.text}&rdquo;</p>
        <footer className="mt-1 text-xs text-neutral-400">— {quote.author}</footer>
      </blockquote>

      <NewWorkOrderButton />

      {/* Phone-first quick actions — the two things you do standing in front of
          hardware. Redundant with the bottom tab bar on purpose: this is the
          large, unambiguous target when you've just opened the app. */}
      <div className="grid grid-cols-2 gap-3 sm:hidden">
        <Link
          href="/scan"
          className="flex flex-col items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white py-5 active:bg-neutral-50"
        >
          <ScanLine className="h-7 w-7 text-fuchsia-600" />
          <span className="text-sm font-medium text-neutral-800">Scan a tag</span>
        </Link>
        <Link
          href="/assets"
          className="flex flex-col items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white py-5 active:bg-neutral-50"
        >
          <Boxes className="h-7 w-7 text-teal-600" />
          <span className="text-sm font-medium text-neutral-800">Browse assets</span>
        </Link>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-neutral-900">Assigned to you</h2>
        <ul className="mt-3 divide-y divide-neutral-200 rounded-md border border-neutral-200 bg-white">
          {myWorkOrders.length === 0 && (
            <li className="px-4 py-6 text-center text-sm text-neutral-500">
              Nothing assigned to you right now.
            </li>
          )}
          {myWorkOrders.map((wo) => (
            <li key={wo.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <Link href={`/work-orders/${wo.code}`} className="min-w-0 hover:underline">
                <span className="font-medium text-neutral-900">{wo.code}</span>{" "}
                <span className="text-neutral-600">
                  {wo.description.length > 70 ? `${wo.description.slice(0, 70)}…` : wo.description}
                </span>
              </Link>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${STATUS_STYLES[wo.status]}`}
              >
                {wo.status.replace("_", " ")}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
