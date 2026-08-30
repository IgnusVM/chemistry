import { requireOrgAdminPage } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { TagManager } from "./tag-manager";
import { HelpLink } from "@/components/help-link";

export default async function TagsAdminPage() {
  await requireOrgAdminPage();
  const tags = await prisma.tag.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, color: true, _count: { select: { cards: true } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-1">
          <h1 className="text-lg font-semibold text-neutral-900">Tags</h1>
          <HelpLink topic="Tags" article="board/board-tags" />
        </div>
      </div>
      <TagManager tags={tags} />
    </div>
  );
}
