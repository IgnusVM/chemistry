import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/dal";
import { resolveBadge } from "@/lib/user-badge-data";
import { UserBadge } from "@/components/user-badge";
import { HelpLink } from "@/components/help-link";

export default async function UserContactPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  await requireCurrentUser();
  const { userId } = await params;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { memberships: { include: { department: true } } },
  });
  if (!user) notFound();
  const badge = await resolveBadge(user);

  const duringBurnMethods = [
    user.contactDuringBurnCell && "Cell",
    user.contactDuringBurnEmail && "Email",
  ].filter(Boolean) as string[];

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-lg font-semibold text-neutral-900">
          <UserBadge badge={badge} size="md" />
          {user.displayName}
          {user.name && ` (${user.name})`}
        </h1>
        <p className="text-sm text-neutral-500">
          {user.memberships.map((m) => m.department.name).join(", ") || "No department memberships"}
        </p>
      </div>

      <div className="rounded-md border border-neutral-200 bg-white p-4 text-sm">
        <h2 className="text-sm font-semibold text-neutral-900">Contact</h2>
        <dl className="mt-2 space-y-2">
          <div>
            <dt className="text-xs text-neutral-500">Email</dt>
            <dd>
              <a href={`mailto:${user.email}`} className="text-neutral-900 hover:underline">
                {user.email}
              </a>
            </dd>
          </div>
          {user.phone && (
            <div>
              <dt className="text-xs text-neutral-500">Phone</dt>
              <dd>
                <a href={`tel:${user.phone}`} className="text-neutral-900 hover:underline">
                  {user.phone}
                </a>
              </dd>
            </div>
          )}
        </dl>
      </div>

      <div className="rounded-md border border-neutral-200 bg-white p-4 text-sm">
        <div className="flex items-center gap-1">
          <h2 className="text-sm font-semibold text-neutral-900">During the burn</h2>
          <HelpLink topic="Contact during the event" article="accounts/your-contact-profile" />
        </div>
        {duringBurnMethods.length > 0 ? (
          <p className="mt-1 text-neutral-700">Reachable by: {duringBurnMethods.join(", ")}</p>
        ) : (
          <p className="mt-1 text-neutral-500">No preferred contact method on file.</p>
        )}
        {user.contactDuringBurnOther && (
          <p className="mt-2 whitespace-pre-wrap text-neutral-700">{user.contactDuringBurnOther}</p>
        )}
      </div>
    </div>
  );
}
