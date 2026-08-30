import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Reading the noticeboard.
 *
 * Reads are org-wide, like every other read in this app: anyone signed in sees
 * the board. Writing a post is org-admin only; replying is open to any member.
 */

export const FEED_PAGE_SIZE = 10;

export type FeedImage = { id: string; filename: string; mimeType: string };

export type FeedLink = {
  id: string;
  url: string;
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  siteName: string | null;
};

export type FeedReply = {
  id: string;
  body: string;
  createdAt: string;
  authorId: string | null;
  authorName: string;
};

export type FeedPost = {
  id: string;
  body: string;
  createdAt: string;
  authorId: string | null;
  authorName: string;
  images: FeedImage[];
  links: FeedLink[];
  replies: FeedReply[];
  replyCount: number;
};

/**
 * One page of posts, newest first.
 *
 * Cursor-based rather than offset: the feed grows at the end people are reading
 * from, and an offset would start repeating or skipping posts as soon as a new
 * one landed mid-scroll.
 *
 * Note what is NOT selected: an image's `s3Key` never leaves the server. The
 * client gets an id and asks for a URL when — and only when — someone presses
 * the button.
 */
export async function getFeedPage(cursor?: string | null): Promise<{
  posts: FeedPost[];
  nextCursor: string | null;
}> {
  const rows = await prisma.post.findMany({
    take: FEED_PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    orderBy: { createdAt: "desc" },
    include: {
      author: { select: { id: true, displayName: true } },
      images: { orderBy: { position: "asc" }, select: { id: true, filename: true, mimeType: true } },
      links: { orderBy: { position: "asc" } },
      replies: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { id: true, displayName: true } } },
      },
      _count: { select: { replies: true } },
    },
  });

  const hasMore = rows.length > FEED_PAGE_SIZE;
  const page = hasMore ? rows.slice(0, FEED_PAGE_SIZE) : rows;

  return {
    posts: page.map((p) => ({
      id: p.id,
      body: p.body,
      createdAt: p.createdAt.toISOString(),
      authorId: p.author?.id ?? null,
      // A deleted account leaves its posts standing; the board would otherwise
      // develop holes in its history.
      authorName: p.author?.displayName ?? "Someone who has left",
      images: p.images,
      links: p.links.map((l) => ({
        id: l.id,
        url: l.url,
        title: l.title,
        description: l.description,
        imageUrl: l.imageUrl,
        siteName: l.siteName,
      })),
      replies: p.replies.map((r) => ({
        id: r.id,
        body: r.body,
        createdAt: r.createdAt.toISOString(),
        authorId: r.author?.id ?? null,
        authorName: r.author?.displayName ?? "Someone who has left",
      })),
      replyCount: p._count.replies,
    })),
    nextCursor: hasMore ? page[page.length - 1].id : null,
  };
}
