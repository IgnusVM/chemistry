import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
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

export async function requireOrgAdmin() {
  const user = await requireCurrentUser();
  if (!user.isOrgAdmin) throw new Error("Org admin required");
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
