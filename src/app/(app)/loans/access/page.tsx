import { ShieldCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/dal";
import { grantableDepartments } from "@/lib/loans";
import { GrantForm } from "./grant-form";
import { RevokeButton } from "./revoke-button";

export const metadata = { title: "Check-out access — Chemistry" };

export default async function LoanAccessPage() {
  await requireCurrentUser();

  // Scoped by grantableDepartments: org admins see everything, a lead sees only
  // the departments they lead, and anyone else sees nothing at all.
  const departments = await grantableDepartments();

  const [privileges, users] = await Promise.all([
    prisma.assetLoanPrivilege.findMany({
      where: { departmentId: { in: departments.map((d) => d.id) } },
      include: { user: true, grantedBy: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.user.findMany({ orderBy: { displayName: "asc" }, select: { id: true, displayName: true } }),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-lg font-semibold text-neutral-900">
          <ShieldCheck className="h-5 w-5 text-neutral-400" />
          Check-out access
        </h1>
        <p className="text-sm text-neutral-500">
          Who can check tools in and out for each department. Department leads and org admins always
          have access without being listed here.
        </p>
      </div>

      {departments.length === 0 && (
        <p className="rounded-md border border-neutral-200 bg-white p-4 text-sm text-neutral-500">
          You need to lead a department to manage its check-out access. Ask an org admin.
        </p>
      )}

      {departments.map((dept) => {
        const granted = privileges.filter((p) => p.departmentId === dept.id);
        const alreadyGranted = new Set(granted.map((p) => p.userId));
        return (
          <div key={dept.id} className="rounded-md border border-neutral-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-neutral-900">{dept.name}</h2>
            {granted.length > 0 ? (
              <ul className="mt-2 divide-y divide-neutral-200">
                {granted.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <div className="min-w-0">
                      <div className="truncate text-neutral-900">{p.user.displayName}</div>
                      <div className="text-xs text-neutral-400">
                        Granted by {p.grantedBy?.displayName ?? "Unknown"} ·{" "}
                        {p.createdAt.toLocaleDateString()}
                      </div>
                    </div>
                    <RevokeButton
                      userId={p.userId}
                      departmentId={dept.id}
                      displayName={p.user.displayName}
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-neutral-500">
                Nobody has been granted access yet.
              </p>
            )}
            <GrantForm
              departmentId={dept.id}
              users={users.filter((u) => !alreadyGranted.has(u.id))}
            />
          </div>
        );
      })}
    </div>
  );
}
