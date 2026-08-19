import { prisma } from "@/lib/prisma";
import { requireOrgAdmin } from "@/lib/dal";
import { FailureCodeForm } from "./failure-code-form";

export default async function FailureCodesAdminPage() {
  await requireOrgAdmin();
  const [failureCodes, assetTypes] = await Promise.all([
    prisma.failureCode.findMany({ orderBy: { code: "asc" }, include: { assetType: true } }),
    prisma.assetType.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-neutral-900">Failure Codes</h1>
        <p className="text-sm text-neutral-500">
          A short controlled vocabulary so failures are queryable, not just free text. Keep the list short.
        </p>
      </div>

      <FailureCodeForm assetTypes={assetTypes} />

      <table className="w-full overflow-hidden rounded-md border border-neutral-200 bg-white text-sm">
        <thead className="bg-neutral-100 text-left text-xs uppercase text-neutral-500">
          <tr>
            <th className="px-4 py-2">Code</th>
            <th className="px-4 py-2">Label</th>
            <th className="px-4 py-2">Asset type</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200">
          {failureCodes.map((fc) => (
            <tr key={fc.id}>
              <td className="px-4 py-2 font-mono text-xs text-neutral-900">{fc.code}</td>
              <td className="px-4 py-2">{fc.label}</td>
              <td className="px-4 py-2 text-neutral-500">{fc.assetType?.name ?? "Generic"}</td>
            </tr>
          ))}
          {failureCodes.length === 0 && (
            <tr>
              <td colSpan={3} className="px-4 py-6 text-center text-neutral-500">
                No failure codes yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
