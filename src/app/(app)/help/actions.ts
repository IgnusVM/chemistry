"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireOrgAdmin } from "@/lib/dal";
import { recordAudit } from "@/lib/audit";
import { HELP_CATEGORIES } from "@/lib/help";

const CATEGORY_SLUGS = HELP_CATEGORIES.map((c) => c.slug) as [string, ...string[]];

const articleSchema = z.object({
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "use lowercase letters, numbers, and dashes"),
  title: z.string().min(1),
  category: z.enum(CATEGORY_SLUGS),
  summary: z.string().optional(),
  body: z.string().min(1),
  order: z.coerce.number().int().default(0),
});

export type HelpArticleFormState = { error?: string } | undefined;

export async function createHelpArticle(
  _prevState: HelpArticleFormState,
  formData: FormData,
): Promise<HelpArticleFormState> {
  const admin = await requireOrgAdmin();

  const parsed = articleSchema.safeParse({
    slug: formData.get("slug"),
    title: formData.get("title"),
    category: formData.get("category"),
    summary: formData.get("summary") || undefined,
    body: formData.get("body"),
    order: formData.get("order") || 0,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const existing = await prisma.helpArticle.findUnique({ where: { slug: parsed.data.slug } });
  if (existing) return { error: "That slug is already in use." };

  const article = await prisma.helpArticle.create({ data: parsed.data });

  await recordAudit({
    entityType: "HelpArticle",
    entityId: article.id,
    action: "created",
    userId: admin.id,
    changes: { slug: article.slug, title: article.title },
  });

  revalidatePath("/help");
  redirect(`/help/${article.category}/${article.slug}`);
}

export async function updateHelpArticle(
  _prevState: HelpArticleFormState,
  formData: FormData,
): Promise<HelpArticleFormState> {
  const admin = await requireOrgAdmin();
  const id = String(formData.get("id"));

  const parsed = articleSchema.safeParse({
    slug: formData.get("slug"),
    title: formData.get("title"),
    category: formData.get("category"),
    summary: formData.get("summary") || undefined,
    body: formData.get("body"),
    order: formData.get("order") || 0,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const existing = await prisma.helpArticle.findFirst({
    where: { slug: parsed.data.slug, NOT: { id } },
  });
  if (existing) return { error: "That slug is already in use by another article." };

  const article = await prisma.helpArticle.update({ where: { id }, data: parsed.data });

  await recordAudit({
    entityType: "HelpArticle",
    entityId: article.id,
    action: "updated",
    userId: admin.id,
    changes: { slug: article.slug, title: article.title },
  });

  revalidatePath("/help");
  redirect(`/help/${article.category}/${article.slug}`);
}

export async function deleteHelpArticle(id: string) {
  const admin = await requireOrgAdmin();
  const article = await prisma.helpArticle.findUniqueOrThrow({ where: { id } });

  await prisma.helpArticle.delete({ where: { id } });

  await recordAudit({
    entityType: "HelpArticle",
    entityId: id,
    action: "deleted",
    userId: admin.id,
    changes: { slug: article.slug, title: article.title },
  });

  revalidatePath("/help");
  redirect(`/help/${article.category}`);
}
