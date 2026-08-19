import { prisma } from "@/lib/prisma";
import { requireOrgAdmin } from "@/lib/dal";
import { DivisionForm } from "./division-form";

export default async function DivisionsAdminPage() {
  await requireOrgAdmin();
  const divisions = await prisma.division.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { departments: true } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-neutral-900">Divisions</h1>
        <p className="text-sm text-neutral-500">
          Groupings above departments, e.g. Ops. Most orgs will only need a handful.
        </p>
      </div>

      <DivisionForm />

      <table className="w-full overflow-hidden rounded-md border border-neutral-200 bg-white text-sm">
        <thead className="bg-neutral-100 text-left text-xs uppercase text-neutral-500">
          <tr>
            <th className="px-4 py-2">Name</th>
            <th className="px-4 py-2">Slug</th>
            <th className="px-4 py-2">Departments</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200">
          {divisions.map((div) => (
            <tr key={div.id}>
              <td className="px-4 py-2 font-medium text-neutral-900">{div.name}</td>
              <td className="px-4 py-2 text-neutral-500">{div.slug}</td>
              <td className="px-4 py-2">{div._count.departments}</td>
            </tr>
          ))}
          {divisions.length === 0 && (
            <tr>
              <td colSpan={3} className="px-4 py-6 text-center text-neutral-500">
                No divisions yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
