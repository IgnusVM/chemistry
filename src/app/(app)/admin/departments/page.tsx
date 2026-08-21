import { prisma } from "@/lib/prisma";
import { requireOrgAdmin } from "@/lib/dal";
import { DepartmentForm } from "./department-form";
import { DepartmentRow } from "./department-row";

export default async function DepartmentsAdminPage() {
  await requireOrgAdmin();
  const [departments, divisions] = await Promise.all([
    prisma.department.findMany({
      orderBy: { name: "asc" },
      include: { division: true, _count: { select: { assets: true, memberships: true } } },
    }),
    prisma.division.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-neutral-900">Departments</h1>
        <p className="text-sm text-neutral-500">Owning organizations within Alchemy.</p>
      </div>

      <DepartmentForm divisions={divisions} />

      <table className="w-full overflow-hidden rounded-md border border-neutral-200 bg-white text-sm">
        <thead className="bg-neutral-100 text-left text-xs uppercase text-neutral-500">
          <tr>
            <th className="px-4 py-2">Name</th>
            <th className="px-4 py-2">Division</th>
            <th className="px-4 py-2">Slug</th>
            <th className="px-4 py-2">Assets</th>
            <th className="px-4 py-2">Members</th>
            <th className="px-4 py-2">Status</th>
            <th className="px-4 py-2" />
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200">
          {departments.map((dept) => (
            <DepartmentRow
              key={dept.id}
              department={{
                id: dept.id,
                name: dept.name,
                slug: dept.slug,
                description: dept.description,
                divisionId: dept.divisionId,
                divisionName: dept.division?.name ?? null,
                active: dept.active,
                assetCount: dept._count.assets,
                memberCount: dept._count.memberships,
              }}
              divisions={divisions}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
