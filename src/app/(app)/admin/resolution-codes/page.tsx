import { prisma } from "@/lib/prisma";
import { requireOrgAdmin } from "@/lib/dal";
import { ResolutionCodeForm } from "./resolution-code-form";

export default async function ResolutionCodesAdminPage() {
  await requireOrgAdmin();
  const resolutionCodes = await prisma.resolutionCode.findMany({ orderBy: { code: "asc" } });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-neutral-900">Resolution Codes</h1>
        <p className="text-sm text-neutral-500">
          CMMS-style outcome codes — what happened, not what was wrong. Keep the list short.
        </p>
      </div>

      <ResolutionCodeForm />

      <table className="w-full overflow-hidden rounded-md border border-neutral-200 bg-white text-sm">
        <thead className="bg-neutral-100 text-left text-xs uppercase text-neutral-500">
          <tr>
            <th className="px-4 py-2">Code</th>
            <th className="px-4 py-2">Label</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200">
          {resolutionCodes.map((rc) => (
            <tr key={rc.id}>
              <td className="px-4 py-2 font-mono text-xs text-neutral-900">{rc.code}</td>
              <td className="px-4 py-2">{rc.label}</td>
            </tr>
          ))}
          {resolutionCodes.length === 0 && (
            <tr>
              <td colSpan={2} className="px-4 py-6 text-center text-neutral-500">
                No resolution codes yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
