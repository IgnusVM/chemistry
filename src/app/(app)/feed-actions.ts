"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser, requireOrgAdmin } from "@/lib/dal";
import { recordAudit } from "@/lib/audit";
import { buildPostImageKey, uploadAttachment, deleteAttachmentObject, getAttachmentUrl } from "@/lib/s3";
import { fetchLinkPreview, extractUrls } from "@/lib/link-preview";
import { getFeedPage, type FeedPost } from "@/lib/feed";

/**
 * The noticeboard's writes.
 *
 * Posting is org-admin only. Replying is open to any signed-in member and is
 * text only — no images, no link expansion — which keeps both the moderation
 * surface and the storage bill to what a sentence can carry.
 *
 * Every export here is a callable endpoint, so each one establishes the caller
 * and checks them itself rather than trusting the interface that rendered it.
 */

export type FeedActionState = { error?: string } | undefined;

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_IMAGES = 4;
const ALLOWED_IMAGE = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];

const postSchema = z.object({
  body: z.string().trim().min(1, "Write something first.").max(5000, "That's too long for a post."),
});

const replySchema = z.object({
  postId: z.string().min(1),
  body: z.string().trim().min(1, "Write something first.").max(1000, "Keep replies short."),
});

export async function createPost(_prev: FeedActionState, formData: FormData): Promise<FeedActionState> {
  const admin = await requireOrgAdmin();

  const parsed = postSchema.safeParse({ body: formData.get("body") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const files = formData.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length > MAX_IMAGES) return { error: `Up to ${MAX_IMAGES} images per post.` };
  for (const f of files) {
    if (!ALLOWED_IMAGE.includes(f.type)) return { error: `${f.name} isn't an image type we can show.` };
    if (f.size > MAX_IMAGE_BYTES) return { error: `${f.name} is larger than 8MB.` };
  }

  // Previews are fetched once, here, and stored. The feed never makes an
  // outbound request while someone scrolls, and a preview cannot change under
  // a reader afterwards.
  const urls = extractUrls(parsed.data.body);
  const previews = await Promise.all(urls.map((u) => fetchLinkPreview(u).catch(() => null)));

  const post = await prisma.post.create({
    data: {
      authorUserId: admin.id,
      body: parsed.data.body,
      links: {
        create: previews.filter((p) => p !== null).map((p, i) => ({
          url: p.url, title: p.title, description: p.description,
          imageUrl: p.imageUrl, siteName: p.siteName, position: i,
        })),
      },
    },
  });

  // Uploads happen after the row exists so the key can be namespaced by post.
  for (const [i, file] of files.entries()) {
    const key = buildPostImageKey(post.id, file.name);
    await uploadAttachment(key, Buffer.from(await file.arrayBuffer()), file.type);
    await prisma.postImage.create({
      data: { postId: post.id, s3Key: key, filename: file.name, mimeType: file.type, position: i },
    });
  }

  await recordAudit({ entityType: "Post", entityId: post.id, action: "created", userId: admin.id });
  revalidatePath("/");
}

export async function deletePost(postId: string): Promise<FeedActionState> {
  const admin = await requireOrgAdmin();
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: { images: { select: { s3Key: true } } },
  });
  if (!post) return { error: "That post is already gone." };

  // Rows cascade; the objects behind them do not, so they are removed by hand
  // or the bucket accumulates images nothing references.
  for (const img of post.images) {
    await deleteAttachmentObject(img.s3Key).catch(() => {});
  }
  await prisma.post.delete({ where: { id: postId } });
  await recordAudit({ entityType: "Post", entityId: postId, action: "deleted", userId: admin.id });
  revalidatePath("/");
}

export async function addReply(_prev: FeedActionState, formData: FormData): Promise<FeedActionState> {
  const user = await requireCurrentUser();
  const parsed = replySchema.safeParse({
    postId: formData.get("postId"),
    body: formData.get("body"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const post = await prisma.post.findUnique({ where: { id: parsed.data.postId }, select: { id: true } });
  if (!post) return { error: "That post is gone." };

  await prisma.postReply.create({
    data: { postId: post.id, authorUserId: user.id, body: parsed.data.body },
  });
  revalidatePath("/");
}

export async function deleteReply(replyId: string): Promise<FeedActionState> {
  const user = await requireCurrentUser();
  const reply = await prisma.postReply.findUnique({
    where: { id: replyId },
    select: { id: true, authorUserId: true },
  });
  if (!reply) return { error: "That reply is already gone." };
  // Your own words, or an org admin tidying up.
  if (reply.authorUserId !== user.id && !user.isOrgAdmin) {
    return { error: "You can only delete your own replies." };
  }
  await prisma.postReply.delete({ where: { id: replyId } });
  revalidatePath("/");
}

/**
 * A viewing URL for one image, issued only when someone asks.
 *
 * This is the whole point of the deferred-image design: scrolling past a
 * hundred posts fetches nothing from object storage. A presigned URL is minted
 * per request and expires, so it cannot be pasted around indefinitely.
 */
export async function getPostImageUrl(imageId: string): Promise<{ url?: string; error?: string }> {
  await requireCurrentUser();
  const image = await prisma.postImage.findUnique({ where: { id: imageId }, select: { s3Key: true } });
  if (!image) return { error: "That image is gone." };
  return { url: await getAttachmentUrl(image.s3Key) };
}

/** Next page of the feed, for the infinite scroller. */
export async function loadMorePosts(cursor: string): Promise<{ posts: FeedPost[]; nextCursor: string | null }> {
  await requireCurrentUser();
  return getFeedPage(cursor);
}
