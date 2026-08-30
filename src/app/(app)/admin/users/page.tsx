import { prisma } from "@/lib/prisma";
import { requireOrgAdminPage, isRootDirector } from "@/lib/dal";
import { UserForm } from "./user-form";
import { UserCard } from "./user-card";
import { InviteGenerator } from "./invite-generator";
import { RevokeInviteButton } from "./revoke-invite-button";
import { resolveBadges } from "@/lib/user-badge-data";
import { HelpLink } from "@/components/help-link";

export default async function UsersAdminPage() {
  const viewer = await requireOrgAdminPage();
  const [users, departments, invites] = await Promise.all([
    prisma.user.findMany({
      orderBy: { displayName: "asc" },
      include: { memberships: { include: { department: true } } },
    }),
    prisma.department.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.inviteCode.findMany({
      where: { usedAt: null },
      orderBy: { createdAt: "desc" },
      include: { createdBy: true },
    }),
  ]);
  const badges = await resolveBadges(users);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-1">
          <h1 className="text-lg font-semibold text-neutral-900">Users</h1>
          <HelpLink topic="Users" article="admin-setup/departments-and-roles" />
        </div>
      </div>

      <div className="rounded-md border border-neutral-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <h2 className="text-sm font-semibold text-neutral-900">Invite links</h2>
            <HelpLink topic="Invites, departments and roles" article="admin-setup/departments-and-roles" />
          </div>
          <InviteGenerator />
        </div>
        {invites.length > 0 ? (
          <ul className="mt-3 divide-y divide-neutral-200">
            {invites.map((invite) => (
              <li key={invite.id} className="flex items-center justify-between py-2 text-sm">
                <span className="text-neutral-600">
                  Created by {invite.createdBy?.displayName ?? "Unknown"} · expires {invite.expiresAt.toLocaleDateString()}
                </span>
                <RevokeInviteButton inviteId={invite.id} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-neutral-500">No pending invite links.</p>
        )}
      </div>

      <UserForm />

      <div className="space-y-3">
        {users.map((user, i) => (
          <UserCard
            key={user.id}
            user={user}
            departments={departments}
            badge={badges[i]}
            viewerIsRoot={isRootDirector(viewer)}
            targetIsRoot={isRootDirector(user)}
          />
        ))}
      </div>
    </div>
  );
}
