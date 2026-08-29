import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireOrgAdmin } from "@/lib/dal";

export default async function AdminPage() {
  await requireOrgAdmin();

  const [divisionCount, departmentCount, userCount, assetTypeCount, resolutionCodeCount, locationCount, tagCount, boardCount] =
    await Promise.all([
      prisma.division.count(),
      prisma.department.count(),
      prisma.user.count(),
      prisma.assetType.count(),
      prisma.resolutionCode.count(),
      prisma.location.count(),
      prisma.tag.count(),
      prisma.board.count(),
    ]);

  const sections = [
    { href: "/admin/divisions", label: "Divisions", description: "Groupings above departments.", count: divisionCount },
    { href: "/admin/departments", label: "Departments", description: "Owning organizations within Alchemy.", count: departmentCount },
    { href: "/admin/users", label: "Users", description: "Accounts and department roles.", count: userCount },
    { href: "/admin/asset-types", label: "Asset Types", description: "Templates and their custom fields.", count: assetTypeCount },
    { href: "/admin/resolution-codes", label: "Resolution Codes", description: "CMMS-style outcome codes for work orders.", count: resolutionCodeCount },
    { href: "/admin/tags", label: "Tags", description: "Labels for board cards, usually a team.", count: tagCount },
    { href: "/admin/board-columns", label: "Board Columns", description: "Column names, colours, and work order status mapping.", count: boardCount },
    { href: "/locations", label: "Locations", description: "Storage facilities, camps, and placements.", count: locationCount },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-neutral-900">Admin</h1>
        <p className="text-sm text-neutral-500">Reference data and org setup — edited rarely, not day-to-day.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="rounded-md border border-neutral-200 bg-white p-4 hover:border-neutral-300 hover:bg-neutral-50"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-neutral-900">{s.label}</span>
              <span className="text-sm text-neutral-400">{s.count}</span>
            </div>
            <p className="mt-1 text-xs text-neutral-500">{s.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
