import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/dal";
import { assetQrDataUrl } from "@/lib/qr";
import { readBulkSelection } from "@/lib/bulk-selection";
import { PrintButton } from "./print-button";
import { HelpLink } from "@/components/help-link";

export default async function QrSheetPage({
  searchParams,
}: {
  searchParams: Promise<{ tags?: string | string[]; group?: string; selection?: string }>;
}) {
  const user = await requireCurrentUser();
  const { tags, group: groupId, selection } = await searchParams;

  let assets;
  if (selection) {
    const assetIds = await readBulkSelection("Asset", selection, user.id);
    assets = await prisma.asset.findMany({ where: { id: { in: assetIds } }, orderBy: { assetTag: "asc" } });
  } else {
    let assetTags: string[] = [];
    if (groupId) {
      const members = await prisma.assetGroupMember.findMany({
        where: { assetGroupId: groupId },
        include: { asset: { select: { assetTag: true } } },
        orderBy: { asset: { assetTag: "asc" } },
      });
      assetTags = members.map((m) => m.asset.assetTag);
    } else if (tags) {
      assetTags = Array.isArray(tags) ? tags : tags.split(",");
    }
    assetTags = [...new Set(assetTags.map((t) => t.trim()).filter(Boolean))];

    assets = await prisma.asset.findMany({
      where: { assetTag: { in: assetTags } },
      orderBy: { assetTag: "asc" },
    });
  }

  const cards = await Promise.all(
    assets.map(async (asset) => ({
      assetTag: asset.assetTag,
      name: asset.name,
      qr: await assetQrDataUrl(asset.assetTag),
    })),
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <div>
          <div className="flex items-center gap-1">
            <h1 className="text-lg font-semibold text-neutral-900">QR sheet</h1>
            <HelpLink topic="QR codes and printing labels" article="qr-codes/qr-codes-and-scanning" />
          </div>
          <p className="text-sm text-neutral-500">{cards.length} labels</p>
        </div>
        <PrintButton />
      </div>

      {cards.length === 0 ? (
        <p className="text-sm text-neutral-500 print:hidden">No assets selected.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 print:grid-cols-3 print:gap-2">
          {cards.map((card) => (
            <div
              key={card.assetTag}
              className="flex flex-col items-center rounded-md border border-neutral-200 p-3 text-center break-inside-avoid print:border-black"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={card.qr} alt={`QR code for ${card.assetTag}`} width={140} height={140} />
              <div className="mt-1 text-sm font-semibold text-neutral-900">{card.assetTag}</div>
              <div className="text-xs text-neutral-500">{card.name}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
