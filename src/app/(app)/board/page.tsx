import Link from "next/link";
import { LayoutGrid } from "lucide-react";
import { requireCurrentUser, getAccessibleDepartmentIds } from "@/lib/dal";
import { listBoardsForUser } from "@/lib/board";

/**
 * Board index.
 *
 * A later story turns this into a real roll-up showing cards across
 * departments. For now it is a way in: the boards you belong to first, the
 * rest reachable, because reads are org-wide.
 */
export default async function BoardIndexPage() {
  await requireCurrentUser();
  const accessible = await getAccessibleDepartmentIds("VIEWER");
  const { mine, others } = await listBoardsForUser(accessible);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-neutral-900">Boards</h1>
        <p className="text-sm text-neutral-500">One per department.</p>
      </div>

      {mine.length === 0 ? (
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
          <p className="text-sm font-medium text-neutral-900">You&rsquo;re not in a department yet.</p>
          <p className="mt-1 text-sm text-neutral-600">
            Boards belong to departments, so there isn&rsquo;t one that&rsquo;s yours. Ask an org admin to add
            you to yours. You can still read any board below.
          </p>
        </div>
      ) : (
        <section className="space-y-2">
          <h2 className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">Yours</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {mine.map((d) => (
              <BoardLink key={d.id} department={d} />
            ))}
          </ul>
        </section>
      )}

      {others.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">
            Everyone else
          </h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {others.map((d) => (
              <BoardLink key={d.id} department={d} />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function BoardLink({
  department,
}: {
  department: { name: string; slug: string; active: boolean; division: { name: string } | null };
}) {
  return (
    <li>
      <Link
        href={`/board/${department.slug}`}
        className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white p-3 hover:border-neutral-300 hover:bg-neutral-50"
      >
        <LayoutGrid className="h-4 w-4 shrink-0 text-neutral-400" aria-hidden />
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-neutral-900">
            {department.name}
            {!department.active ? (
              <span className="ml-1.5 text-xs font-normal text-neutral-400">(inactive)</span>
            ) : null}
          </span>
          {department.division ? (
            <span className="block truncate text-xs text-neutral-500">{department.division.name}</span>
          ) : null}
        </span>
      </Link>
    </li>
  );
}
