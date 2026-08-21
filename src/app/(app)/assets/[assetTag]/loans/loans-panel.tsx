import Link from "next/link";
import { PackageCheck, PackageOpen, ShieldCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/dal";
import { canManageLoans, canLendOnBehalfOfOthers, canGrantLoanPrivilege } from "@/lib/loans";
import { resolveBadges } from "@/lib/user-badge-data";
import { UserBadgeLabel } from "@/components/user-badge";
import { CheckOutForm } from "./check-out-form";
import { CheckInForm } from "./check-in-form";

export async function LoansPanel({
  assetId,
  departmentId,
}: {
  assetId: string;
  departmentId: string;
}) {
  const user = await requireCurrentUser();

  const [loans, mayManage, mayLendToOthers, mayGrant] = await Promise.all([
    prisma.assetLoan.findMany({
      where: { assetId },
      orderBy: { checkedOutAt: "desc" },
      include: { borrower: true, checkedOutBy: true, checkedInBy: true },
      take: 50,
    }),
    canManageLoans(departmentId),
    canLendOnBehalfOfOthers(departmentId),
    canGrantLoanPrivilege(departmentId),
  ]);

  const open = loans.find((l) => l.checkedInAt === null) ?? null;
  const history = loans.filter((l) => l.checkedInAt !== null);

  const borrowerBadges = await resolveBadges(loans.map((l) => l.borrower));
  const badgeFor = (loanId: string) => borrowerBadges[loans.findIndex((l) => l.id === loanId)];

  // Only offer other borrowers to someone allowed to lend on their behalf.
  const members = mayLendToOthers
    ? (
        await prisma.user.findMany({
          orderBy: { displayName: "asc" },
          select: { id: true, displayName: true },
        })
      )
    : [];

  return (
    <div className="space-y-4">
      <div
        className={`rounded-md border p-4 ${
          open ? "border-amber-200 bg-amber-50" : "border-neutral-200 bg-white"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
              {open ? (
                <PackageOpen className="h-4 w-4 text-amber-600" />
              ) : (
                <PackageCheck className="h-4 w-4 text-emerald-600" />
              )}
              {open ? "Checked out" : "Available"}
            </h2>
            {open ? (
              <p className="mt-1 text-sm text-neutral-700">
                Out to <UserBadgeLabel badge={badgeFor(open.id)} /> since{" "}
                {open.checkedOutAt.toLocaleString()}
              </p>
            ) : (
              <p className="mt-1 text-sm text-neutral-500">This item is in and can be checked out.</p>
            )}
            {open?.checkedOutNotes && (
              <p className="mt-1 text-sm text-neutral-600">&ldquo;{open.checkedOutNotes}&rdquo;</p>
            )}
          </div>
          {mayGrant && (
            <Link
              href="/loans/access"
              className="inline-flex shrink-0 items-center gap-1 text-xs text-neutral-500 hover:text-neutral-800"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              Manage access
            </Link>
          )}
        </div>

        {mayManage ? (
          open ? (
            <CheckInForm loanId={open.id} />
          ) : (
            <CheckOutForm
              assetId={assetId}
              currentUserId={user.id}
              canLendToOthers={mayLendToOthers}
              members={members}
            />
          )
        ) : (
          <p className="mt-3 border-t border-neutral-100 pt-3 text-xs text-neutral-500">
            You don&rsquo;t have check-out access for this department. A department lead can grant it.
          </p>
        )}
      </div>

      <div className="rounded-md border border-neutral-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-neutral-900">Loan history</h2>
        {history.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-500">Nothing has been returned yet.</p>
        ) : (
          <ul className="mt-2 divide-y divide-neutral-200">
            {history.map((loan) => (
              <li key={loan.id} className="py-2 text-sm">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <UserBadgeLabel badge={badgeFor(loan.id)} />
                  <span className="text-neutral-500">
                    {loan.checkedOutAt.toLocaleDateString()} → {loan.checkedInAt!.toLocaleDateString()}
                  </span>
                </div>
                {(loan.checkedOutNotes || loan.checkedInNotes) && (
                  <p className="mt-0.5 text-xs text-neutral-500">
                    {loan.checkedOutNotes && <>Out: {loan.checkedOutNotes}. </>}
                    {loan.checkedInNotes && <>In: {loan.checkedInNotes}</>}
                  </p>
                )}
                <p className="mt-0.5 text-xs text-neutral-400">
                  Checked in by {loan.checkedInBy?.displayName ?? "Unknown"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
