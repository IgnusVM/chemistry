import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireOrgAdmin } from "@/lib/dal";
import { getAttachmentUrl } from "@/lib/s3";
import type { CustomFieldDef } from "@/lib/custom-fields";
import { EditAssetTypeForm } from "./edit-asset-type-form";
import { DocumentUploadForm } from "./document-upload-form";
import { DeleteDocumentButton } from "./delete-document-button";
import { DeleteAssetTypeButton } from "./delete-asset-type-button";

export default async function AssetTypeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireOrgAdmin();
  const { id } = await params;

  const assetType = await prisma.assetType.findUnique({
    where: { id },
    include: {
      _count: { select: { assets: true } },
      documents: { orderBy: { createdAt: "desc" }, include: { uploadedBy: true } },
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
        assetType={{ ...assetType, customFieldSchema: fieldDefs }}
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
    </div>
  );
}
