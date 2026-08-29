import { prisma } from "@/lib/prisma";
import { requireOrgAdminPage } from "@/lib/dal";
import { ResolutionCodeForm } from "./resolution-code-form";
import { ResolutionCodeRow } from "./resolution-code-row";
import { HelpLink } from "@/components/help-link";

export default async function ResolutionCodesAdminPage() {
  await requireOrgAdminPage();
  const resolutionCodes = await prisma.resolutionCode.findMany({ orderBy: { code: "asc" } });

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-1">
          <h1 className="text-lg font-semibold text-neutral-900">Resolution Codes</h1>
          <HelpLink topic="Resolution codes" article="work-orders/resolution-codes-explained" />
        </div>
      </div>

      <ResolutionCodeForm />

      <div className="overflow-x-auto rounded-md border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-neutral-100 text-left text-xs uppercase text-neutral-500">
            <tr>
              <th className="px-4 py-2">Code</th>
              <th className="px-4 py-2">Label</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {resolutionCodes.map((rc) => (
              <ResolutionCodeRow key={rc.id} resolutionCode={rc} />
            ))}
            {resolutionCodes.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-neutral-500">
                  No resolution codes yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
