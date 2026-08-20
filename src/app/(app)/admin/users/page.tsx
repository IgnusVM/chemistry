import { prisma } from "@/lib/prisma";
import { requireOrgAdmin } from "@/lib/dal";
import { UserForm } from "./user-form";
import { MembershipRow } from "./membership-row";
import { OrgAdminToggle } from "./org-admin-toggle";
import { InviteGenerator } from "./invite-generator";
import { RevokeInviteButton } from "./revoke-invite-button";

export default async function UsersAdminPage() {
  await requireOrgAdmin();
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-neutral-900">Users</h1>
        <p className="text-sm text-neutral-500">
          New accounts can only be created with an invite link. Generate one below, or add someone
          directly. Sign-in is by magic link — no passwords.
        </p>
      </div>

      <div className="rounded-md border border-neutral-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-900">Invite links</h2>
          <InviteGenerator />
        </div>
        {invites.length > 0 ? (
          <ul className="mt-3 divide-y divide-neutral-200">
            {invites.map((invite) => (
              <li key={invite.id} className="flex items-center justify-between py-2 text-sm">
                <span className="text-neutral-600">
                  Created by {invite.createdBy.displayName} · expires {invite.expiresAt.toLocaleDateString()}
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
        {users.map((user) => (
          <div key={user.id} className="rounded-md border border-neutral-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-neutral-900">
                  {user.displayName}
                  {user.playaName && (
                    <span className="ml-1 text-neutral-500">&ldquo;{user.playaName}&rdquo;</span>
                  )}
                </div>
                <div className="text-sm text-neutral-500">{user.email}</div>
              </div>
              <OrgAdminToggle userId={user.id} isOrgAdmin={user.isOrgAdmin} />
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {user.memberships.map((m) => (
                <MembershipRow
                  key={m.id}
                  userId={user.id}
                  departmentId={m.departmentId}
                  departmentName={m.department.name}
                  role={m.role}
                />
              ))}
            </div>

            <form
              action={async (formData: FormData) => {
                "use server";
                const { addMembership } = await import("./actions");
                formData.set("userId", user.id);
                await addMembership(formData);
              }}
              className="mt-3 flex items-center gap-2"
            >
              <select
                name="departmentId"
                required
                className="rounded-md border border-neutral-300 px-2 py-1 text-xs"
              >
                <option value="">Add to department…</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
              <select name="role" defaultValue="MEMBER" className="rounded-md border border-neutral-300 px-2 py-1 text-xs">
                <option value="VIEWER">Viewer</option>
                <option value="MEMBER">Member</option>
                <option value="LEAD">Lead</option>
              </select>
              <button type="submit" className="text-xs font-medium text-neutral-700 hover:text-neutral-900">
                Add
              </button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
