"use client";

import { useState } from "react";
import { addMembership } from "./actions";
import { MembershipRow } from "./membership-row";
import { OrgAdminToggle } from "./org-admin-toggle";
import { DirectorBadge, DirectorToggle } from "./director-controls";
import { EditUserProfileForm } from "./edit-user-profile-form";
import { DeleteUserButton } from "./delete-user-button";
import { UserBadge } from "@/components/user-badge";
import type { ResolvedBadge } from "@/lib/user-badge-data";

export function UserCard({
  user,
  viewerIsRoot,
  targetIsRoot,
  departments,
  badge,
}: {
  viewerIsRoot: boolean;
  targetIsRoot: boolean;
  user: {
    id: string;
    displayName: string;
    name: string | null;
    email: string;
    isOrgAdmin: boolean;
    isDirector: boolean;
    memberships: { departmentId: string; department: { name: string }; role: "VIEWER" | "MEMBER" | "LEAD" }[];
  };
  departments: { id: string; name: string }[];
  badge: ResolvedBadge | null;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <div className="rounded-md border border-neutral-200 bg-white p-4">
      {/* Actions sit beside the identity on desktop but drop to their own row on
          phones — crammed onto one line they overflow the card and clip. */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 font-medium text-neutral-900">
            <UserBadge badge={badge} size="md" />
            <span>{user.displayName}</span>
            {user.isDirector && !targetIsRoot ? <DirectorBadge /> : null}
            {user.name && <span className="font-normal text-neutral-500">({user.name})</span>}
          </div>
          <div className="truncate text-sm text-neutral-500">{user.email}</div>
          {/* cuids don't contain break opportunities, so they need break-all. */}
          <div className="break-all font-mono text-xs text-neutral-400">{user.id}</div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2">
          {!editing && (
            <button type="button" onClick={() => setEditing(true)} className="text-xs text-neutral-400 hover:text-neutral-700">
              Edit
            </button>
          )}
          {viewerIsRoot ? (
            <DirectorToggle userId={user.id} isDirector={user.isDirector} isRoot={targetIsRoot} />
          ) : null}
          <OrgAdminToggle userId={user.id} isOrgAdmin={user.isOrgAdmin} />
          <DeleteUserButton userId={user.id} displayName={user.displayName} />
        </div>
      </div>

      {editing && <EditUserProfileForm user={user} onDone={() => setEditing(false)} />}

      <div className="mt-3 flex flex-wrap gap-2">
        {user.memberships.map((m) => (
          <MembershipRow
            key={m.departmentId}
            userId={user.id}
            departmentId={m.departmentId}
            departmentName={m.department.name}
            role={m.role}
          />
        ))}
      </div>

      <form action={addMembership} className="mt-3 flex items-center gap-2">
        <input type="hidden" name="userId" value={user.id} />
        <select name="departmentId" required className="rounded-md border border-neutral-300 px-2 py-1 text-xs">
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
  );
}
