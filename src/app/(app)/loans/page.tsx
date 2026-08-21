import Link from "next/link";
import { PackageOpen, ShieldCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser, getAccessibleDepartmentIds } from "@/lib/dal";
import { grantableDepartments } from "@/lib/loans";
import { resolveBadges } from "@/lib/user-badge-data";
import { UserBadgeLabel } from "@/components/user-badge";

export const metadata = { title: "Checked out — Chemistry" };

export default async function LoansPage() {
  const user = await requireCurrentUser();
  const accessibleDeptIds = await getAccessibleDepartmentIds("VIEWER");

  const open = await prisma.assetLoan.findMany({
    where: {
      checkedInAt: null,
      asset: { owningDepartmentId: { in: accessibleDeptIds } },
    },
    orderBy: { checkedOutAt: "asc" },
    include: {
      borrower: true,
      asset: { include: { owningDepartment: true } },
    },
  });

  const badges = await resolveBadges(open.map((l) => l.borrower));
  const mine = open.filter((l) => l.borrowerUserId === user.id);
  const canGrantAnywhere = (await grantableDepartments()).length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-neutral-900">Checked out</h1>
          <p className="text-sm text-neutral-500">
            {open.length === 0
              ? "Nothing is out right now."
              : `${open.length} item${open.length === 1 ? "" : "s"} out${
                  mine.length > 0 ? ` · ${mine.length} yours` : ""
                }`}
          </p>
        </div>
        {canGrantAnywhere && (
          <Link
            href="/loans/access"
            className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-800"
          >
            <ShieldCheck className="h-4 w-4" />
            Check-out access
          </Link>
        )}
      </div>

      {open.length === 0 ? (
        <p className="rounded-md border border-neutral-200 bg-white p-6 text-center text-sm text-neutral-500">
          Everything is accounted for.
        </p>
      ) : (
        <ul className="divide-y divide-neutral-200 rounded-md border border-neutral-200 bg-white">
          {open.map((loan, i) => (
            <li key={loan.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
              <div className="min-w-0">
                <Link
                  href={`/assets/${loan.asset.assetTag}`}
                  className="font-medium text-neutral-900 hover:underline"
                >
                  {loan.asset.assetTag}
                </Link>{" "}
                <span className="text-neutral-600">{loan.asset.name}</span>
                <div className="mt-0.5 text-xs text-neutral-400">
                  {loan.asset.owningDepartment.name} · out since{" "}
                  {loan.checkedOutAt.toLocaleDateString()}
                </div>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-900">
                <PackageOpen className="h-3.5 w-3.5" />
                <UserBadgeLabel badge={badges[i]} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
