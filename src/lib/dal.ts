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
  if (!user) return null;

  // A Director has every permission an org admin has. Rather than teach ~200
  // call sites about a second flag -- and get one of them wrong -- the
  // EFFECTIVE value is computed once, here, at the only door everything enters
  // through. `isDirector` remains the stored truth and is what the admin
  // screens read when they show and change roles.
  return { ...user, isOrgAdmin: user.isOrgAdmin || user.isDirector };
});

/**
 * The root Director, identified by configuration rather than by a row.
 *
 * Only this person may grant or revoke Director, and nobody -- including
 * another Director -- can remove them. Keeping the identity in the environment
 * rather than the database means it survives a restore onto a fresh instance,
 * and that handing the application to someone else later is a config change
 * rather than a data edit. Same reasoning as BOOTSTRAP_ADMIN_EMAIL.
 */
export function isRootDirector(user: { email: string } | null | undefined): boolean {
  const root = process.env.ROOT_DIRECTOR_EMAIL?.trim().toLowerCase();
  if (!root || !user) return false;
  return user.email.trim().toLowerCase() === root;
}

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

/**
 * For SERVER ACTIONS that only the root Director may perform -- granting and
 * revoking Director itself. Deliberately not satisfied by being a Director:
 * that would be an escalation path where anyone promoted could promote others,
 * and the set could grow without the person who started it.
 */
export async function requireRootDirector() {
  const user = await requireCurrentUser();
  if (!isRootDirector(user)) throw new Error("Only the root Director can do that");
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
