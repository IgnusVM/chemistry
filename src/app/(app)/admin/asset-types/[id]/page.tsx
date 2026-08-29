import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireOrgAdminPage } from "@/lib/dal";
import { getAttachmentUrl } from "@/lib/s3";
import type { CustomFieldDef } from "@/lib/custom-fields";
import { EditAssetTypeForm } from "./edit-asset-type-form";
import { DocumentUploadForm } from "./document-upload-form";
import { DeleteDocumentButton } from "./delete-document-button";
import { DeleteAssetTypeButton } from "./delete-asset-type-button";
import { AddPartForm } from "./add-part-form";
import { DeletePartButton } from "./delete-part-button";
import { CreateCodeFileForm } from "@/components/code/create-code-file-form";
import { CodeFileEditorForm } from "@/components/code/code-file-editor-form";
import { CodeFileVersionHistory } from "@/components/code/code-file-version-history";
import { DeleteCodeFileButton } from "@/components/code/delete-code-file-button";

export default async function AssetTypeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireOrgAdminPage();
  const { id } = await params;

  const assetType = await prisma.assetType.findUnique({
    where: { id },
    include: {
      _count: { select: { assets: true } },
      documents: { orderBy: { createdAt: "desc" }, include: { uploadedBy: true } },
      parts: {
        orderBy: { partNumber: "asc" },
        include: {
          orders: { orderBy: { orderedAt: "desc" } },
          _count: { select: { workOrderUses: true } },
        },
      },
      codeFiles: {
        orderBy: { filename: "asc" },
        include: {
          versions: { orderBy: { createdAt: "desc" }, include: { createdBy: true, workOrder: true } },
        },
      },
    },
  });
  if (!assetType) notFound();

  const [departments, documentUrls] = await Promise.all([
    prisma.department.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    Promise.all(assetType.documents.map((d) => getAttachmentUrl(d.s3Key))),
  ]);

  const fieldDefs = (assetType.customFieldSchema as unknown as CustomFieldDef[]) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin/asset-types" className="text-xs text-neutral-500 hover:underline">
            ← Asset Types
          </Link>
          <h1 className="text-lg font-semibold text-neutral-900">{assetType.name}</h1>
          <p className="text-sm text-neutral-500">{assetType._count.assets} assets use this type</p>
        </div>
        <DeleteAssetTypeButton assetTypeId={assetType.id} assetCount={assetType._count.assets} />
      </div>

      <EditAssetTypeForm
        key={assetType.updatedAt.toISOString()}
        assetType={{
          ...assetType,
          defaultAcquisitionCost: assetType.defaultAcquisitionCost?.toString() ?? null,
          customFieldSchema: fieldDefs,
        }}
        departments={departments}
      />

      <div className="rounded-md border border-neutral-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-neutral-900">Documents</h2>
        <p className="text-sm text-neutral-500">Service manuals, schematics, spec sheets — anything worth keeping with this asset type.</p>
        {assetType.documents.length > 0 && (
          <ul className="mt-3 divide-y divide-neutral-200">
            {assetType.documents.map((doc, i) => (
              <li key={doc.id} className="flex items-center justify-between py-2 text-sm">
                <a
                  href={documentUrls[i]}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-neutral-900 hover:underline"
                >
                  {doc.filename}
                </a>
                <div className="flex items-center gap-3 text-xs text-neutral-500">
                  <span>{doc.uploadedBy?.displayName ?? "Unknown"}</span>
                  <span>{doc.createdAt.toLocaleDateString()}</span>
                  <DeleteDocumentButton documentId={doc.id} />
                </div>
              </li>
            ))}
          </ul>
        )}
        <DocumentUploadForm assetTypeId={assetType.id} />
      </div>

      <div className="rounded-md border border-neutral-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-neutral-900">Parts</h2>
        <p className="text-sm text-neutral-500">
          Parts known for this asset type — new ones are added automatically the first time they&rsquo;re
          logged as used on a work order, or add one directly below.
        </p>
        {assetType.parts.length > 0 && (
          <table className="mt-3 w-full text-sm">
            <thead className="text-left text-xs uppercase text-neutral-500">
              <tr>
                <th className="py-1 pr-2">Part #</th>
                <th className="py-1 pr-2">Description</th>
                <th className="py-1 pr-2">Times ordered</th>
                <th className="py-1 pr-2">Last price</th>
                <th className="py-1" />
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {assetType.parts.map((part) => (
                <tr key={part.id}>
                  <td className="py-2 pr-2">
                    <Link
                      href={`/admin/asset-types/${assetType.id}/parts/${part.id}`}
                      className="font-medium text-neutral-900 hover:underline"
                    >
                      {part.partNumber}
                    </Link>
                  </td>
                  <td className="py-2 pr-2 text-neutral-600">{part.description}</td>
                  <td className="py-2 pr-2 text-neutral-500">{part.orders.length}</td>
                  <td className="py-2 pr-2 text-neutral-500">
                    {part.orders[0]?.price ? `$${part.orders[0].price.toString()}` : "—"}
                  </td>
                  <td className="py-2 text-right">
                    <DeletePartButton partId={part.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <AddPartForm assetTypeId={assetType.id} />
      </div>

      <div className="space-y-4 rounded-md border border-neutral-200 bg-white p-4">
        <div>
          <h2 className="text-sm font-semibold text-neutral-900">Code</h2>
          <p className="text-xs text-neutral-500">
            Source that runs on every {assetType.name}. A change here applies to the whole class, not
            to one unit &mdash; which firmware a specific unit is actually flashed with is tracked as
            a custom field on that asset.
          </p>
        </div>

        {assetType.codeFiles.map((file) => (
          <div key={file.id} className="space-y-3 border-t border-neutral-100 pt-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-mono text-sm font-medium text-neutral-900">{file.filename}</h3>
                {file.description && <p className="text-xs text-neutral-500">{file.description}</p>}
              </div>
              <DeleteCodeFileButton codeFileId={file.id} />
            </div>
            <CodeFileEditorForm
              codeFileId={file.id}
              filename={file.filename}
              currentContent={file.versions[0]?.content ?? ""}
            />
            <details>
              <summary className="cursor-pointer text-xs font-medium tracking-wide text-neutral-400 uppercase">
                Version history ({file.versions.length})
              </summary>
              <div className="mt-2">
                <CodeFileVersionHistory
                  codeFileId={file.id}
                  filename={file.filename}
                  versions={file.versions}
                />
              </div>
            </details>
          </div>
        ))}

        <div className="border-t border-neutral-100 pt-4">
          <CreateCodeFileForm assetTypeId={assetType.id} />
        </div>
      </div>
    </div>
  );
}
