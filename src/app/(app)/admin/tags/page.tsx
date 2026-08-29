import { requireOrgAdmin } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { TagManager } from "./tag-manager";

export default async function TagsAdminPage() {
  await requireOrgAdmin();
  const tags = await prisma.tag.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, color: true, _count: { select: { cards: true } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-neutral-900">Tags</h1>
        <p className="text-sm text-neutral-500">
          Labels for board cards — usually a team. Shared across every board, so a tag means the
          same thing everywhere. Deleting one leaves its cards alone.
        </p>
      </div>
      <TagManager tags={tags} />
    </div>
  );
}
