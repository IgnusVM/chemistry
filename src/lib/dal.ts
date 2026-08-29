import "server-only";
import { cache } from "react";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { decryptSession, getSessionCookie } from "@/lib/session";

export const verifySession = cache(async () => {
  const cookie = await getSessionCookie();
  const payload = await decryptSession(cookie);
  if (!payload?.userId) return null;
  return { userId: payload.userId };
});

export const requireSession = cache(async () => {
  const session = await verifySession();
  if (!session) redirect("/login");
  return session;
});

export const getCurrentUser = cache(async () => {
  const session = await verifySession();
  if (!session) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { memberships: { include: { department: true } } },
  });
  return user;
});

export const requireCurrentUser = cache(async () => {
  const session = await verifySession();
  if (!session) redirect("/login");
  const user = await getCurrentUser();
  if (!user) redirect("/auth/clear");
  return user;
});

export type DepartmentAccessLevel = "VIEWER" | "MEMBER" | "LEAD";

const ROLE_RANK: Record<DepartmentAccessLevel, number> = {
  VIEWER: 0,
  MEMBER: 1,
  LEAD: 2,
};

export async function hasDepartmentAccess(
  departmentId: string,
  minRole: DepartmentAccessLevel,
) {
  const user = await getCurrentUser();
  if (!user) return false;
  if (user.isOrgAdmin) return true;
  const membership = user.memberships.find((m) => m.departmentId === departmentId);
  if (!membership) return false;
  return ROLE_RANK[membership.role] >= ROLE_RANK[minRole];
}

export async function requireDepartmentAccess(
  departmentId: string,
  minRole: DepartmentAccessLevel,
) {
  const allowed = await hasDepartmentAccess(departmentId, minRole);
  if (!allowed) throw new Error("Not authorized for this department");
}

/**
 * For SERVER ACTIONS. Throws, which the action machinery surfaces as a failed
 * action rather than a rendered page.
 */
export async function requireOrgAdmin() {
  const user = await requireCurrentUser();
  if (!user.isOrgAdmin) throw new Error("Org admin required");
  return user;
}

/**
 * For PAGE components. Renders the normal not-found page instead of a 500.
 *
 * Two reasons this is not the same function as `requireOrgAdmin`:
 *
 *   - A thrown Error in a page renders as a server error, so a non-admin who
 *     types an admin URL is told something went wrong rather than that the
 *     page is not theirs. Worse, it fills production logs with 500s that are
 *     not failures, which is how real failures get missed.
 *   - `notFound()` works by throwing a framework control-flow signal. In a
 *     server action that is the wrong shape entirely, so actions keep the
 *     throwing variant above.
 *
 * 404 rather than 403 is deliberate and matches the division-board precedent:
 * a refusal confirms the page exists, which is itself information. The admin
 * nav is hidden from non-admins anyway, so anyone reaching here typed the URL.
 */
export async function requireOrgAdminPage() {
  const user = await requireCurrentUser();
  if (!user.isOrgAdmin) notFound();
  return user;
}

export async function getAccessibleDepartmentIds(minRole: DepartmentAccessLevel = "VIEWER") {
  const user = await getCurrentUser();
  if (!user) return [];
  if (user.isOrgAdmin) {
    const all = await prisma.department.findMany({ select: { id: true } });
    return all.map((d) => d.id);
  }
  return user.memberships
    .filter((m) => ROLE_RANK[m.role] >= ROLE_RANK[minRole])
    .map((m) => m.departmentId);
}
