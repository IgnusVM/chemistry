import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/dal";

/**
 * Loan permissions, kept in one place because the rules are easy to get subtly
 * wrong at a call site:
 *
 *  - Checking assets in/out for a department needs an explicit
 *    AssetLoanPrivilege for that department — OR being its LEAD, OR org admin.
 *    Leads get it implicitly: it would be strange to be able to grant a right
 *    you don't hold.
 *  - Granting that privilege is narrower: LEAD of that specific department, or
 *    org admin. A LEAD of APW cannot grant access to Lamplighter tools.
 *  - Checking out *on behalf of someone else* is narrower still: LEAD or org
 *    admin. Plain privilege holders can only check out to themselves.
 */

const loanPrivilegeDeptIds = cache(async (userId: string) => {
  const rows = await prisma.assetLoanPrivilege.findMany({
    where: { userId },
    select: { departmentId: true },
  });
  return new Set(rows.map((r) => r.departmentId));
});

function isLeadOf(
  user: { isOrgAdmin: boolean; memberships: { departmentId: string; role: string }[] },
  departmentId: string,
) {
  return user.memberships.some((m) => m.departmentId === departmentId && m.role === "LEAD");
}

/** Can this user check assets in and out for the given department? */
export async function canManageLoans(departmentId: string) {
  const user = await getCurrentUser();
  if (!user) return false;
  if (user.isOrgAdmin) return true;
  if (isLeadOf(user, departmentId)) return true;
  return (await loanPrivilegeDeptIds(user.id)).has(departmentId);
}

/** Can this user grant/revoke the loan privilege for the given department? */
export async function canGrantLoanPrivilege(departmentId: string) {
  const user = await getCurrentUser();
  if (!user) return false;
  return user.isOrgAdmin || isLeadOf(user, departmentId);
}

/** Can this user record a loan with someone else as the borrower? */
export async function canLendOnBehalfOfOthers(departmentId: string) {
  const user = await getCurrentUser();
  if (!user) return false;
  return user.isOrgAdmin || isLeadOf(user, departmentId);
}

/** Departments whose loan access this user is allowed to administer. */
export async function grantableDepartments() {
  const user = await getCurrentUser();
  if (!user) return [];
  if (user.isOrgAdmin) {
    return prisma.department.findMany({ where: { active: true }, orderBy: { name: "asc" } });
  }
  const ledIds = user.memberships.filter((m) => m.role === "LEAD").map((m) => m.departmentId);
  if (ledIds.length === 0) return [];
  return prisma.department.findMany({ where: { id: { in: ledIds } }, orderBy: { name: "asc" } });
}

export async function requireLoanManager(departmentId: string) {
  if (!(await canManageLoans(departmentId))) {
    throw new Error("You don't have check-out access for this department.");
  }
}
