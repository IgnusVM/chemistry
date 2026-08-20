import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/dal";
import { getRandomQuote } from "@/lib/quotes";
import { ChemistryLogo } from "./chemistry-logo";
import { NewWorkOrderButton } from "./new-work-order-button";
import { WORK_ORDER_STATUS_STYLES as STATUS_STYLES } from "@/lib/status-styles";

export default async function DashboardPage() {
  const user = await requireCurrentUser();

  const myWorkOrders = await prisma.workOrder.findMany({
    where: { assignedToUserId: user.id, status: { notIn: ["CLOSED", "CANCELLED"] } },
    orderBy: [{ priority: "desc" }, { reportedAt: "desc" }],
    take: 20,
  });

  const quote = getRandomQuote();

  return (
    <div className="space-y-8">
      <ChemistryLogo />

      <blockquote className="border-l-2 border-neutral-200 pl-4">
        <p className="text-sm italic text-neutral-600">&ldquo;{quote.text}&rdquo;</p>
        <footer className="mt-1 text-xs text-neutral-400">— {quote.author}</footer>
      </blockquote>

      <NewWorkOrderButton />

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
