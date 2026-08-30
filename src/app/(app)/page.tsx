import Link from "next/link";
import { ScanLine, Boxes } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/dal";
import { getRandomQuote } from "@/lib/quotes";
import { ChemistryLogo } from "./chemistry-logo";
import { DashboardQuote } from "./dashboard-quote";
import { Noticeboard } from "./noticeboard";
import { AssignedTiles } from "./assigned-tiles";
import { getFeedPage } from "@/lib/feed";
import { NewWorkOrderButton } from "./new-work-order-button";
import { TERMINAL_WO_STATUSES } from "@/lib/constants";

export default async function DashboardPage() {
  const user = await requireCurrentUser();

  const myWorkOrders = await prisma.workOrder.findMany({
    where: { assignedToUserId: user.id, status: { notIn: [...TERMINAL_WO_STATUSES] } },
    orderBy: [{ priority: "desc" }, { reportedAt: "desc" }],
    take: 20,
  });

  const feed = await getFeedPage();

  const quote = getRandomQuote();

  // The dashboard is a sparse landing page, so it keeps a cap while list and
  // board pages use the full width. Stretched to 1920 the hero banner becomes
  // a huge empty gradient and the assigned-work rows fling their status badge
  // to the far edge, which reads as broken rather than spacious.
  return (
    <div className="space-y-8">
      <ChemistryLogo />

      <DashboardQuote quote={quote} />

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

      {/* Two columns from lg up: the board reads down the left, assigned work
          sits to the right in space that used to be empty. minmax(0,1fr) so a
          long post cannot push the column wider than its share. */}
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-6">
          <Noticeboard
            initialPosts={feed.posts}
            initialCursor={feed.nextCursor}
            isOrgAdmin={user.isOrgAdmin}
            currentUserId={user.id}
          />

        </div>

        {/* Assigned work moves to the right, where the dashboard had nothing but
            empty gradient on a wide screen. Below lg it drops back under the
            feed, because on a phone there is only one column anyway. */}
        <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
          <AssignedTiles workOrders={myWorkOrders} />
        </aside>
      </div>
    </div>
  );
}
