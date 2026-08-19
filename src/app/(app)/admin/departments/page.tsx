import { prisma } from "@/lib/prisma";
import { requireOrgAdmin } from "@/lib/dal";
import { DepartmentForm } from "./department-form";
import { ToggleActiveButton } from "./toggle-active-button";

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
            <tr key={dept.id}>
              <td className="px-4 py-2 font-medium text-neutral-900">{dept.name}</td>
              <td className="px-4 py-2 text-neutral-500">{dept.division?.name ?? "—"}</td>
              <td className="px-4 py-2 text-neutral-500">{dept.slug}</td>
              <td className="px-4 py-2">{dept._count.assets}</td>
              <td className="px-4 py-2">{dept._count.memberships}</td>
              <td className="px-4 py-2">
                {dept.active ? (
                  <span className="text-green-700">Active</span>
                ) : (
                  <span className="text-neutral-400">Inactive</span>
                )}
              </td>
              <td className="px-4 py-2 text-right">
                <ToggleActiveButton departmentId={dept.id} active={dept.active} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
