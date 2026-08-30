"use client";

import { useActionState, useState, useTransition } from "react";
import { Trash2, MessageSquare, ExternalLink } from "lucide-react";
import { addReply, deleteReply, deletePost, type FeedActionState } from "./feed-actions";
import { DeferredImage } from "./deferred-image";
import { LoadImageMark } from "@/components/load-image-mark";
import type { FeedPost } from "@/lib/feed";

function when(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (mins < 60 * 24) return `${Math.round(mins / 60)}h ago`;
  return new Date(iso).toLocaleDateString();
}

/** A link preview. Its image is deferred too — it is someone else's server. */
function LinkPreview({ link }: { link: FeedPost["links"][number] }) {
  const [showImage, setShowImage] = useState(false);
  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block overflow-hidden rounded-lg border border-neutral-200 transition-colors hover:border-neutral-300 hover:bg-neutral-50"
    >
      {link.imageUrl ? (
        showImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={link.imageUrl} alt="" className="max-h-64 w-full object-cover" />
        ) : (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => { e.preventDefault(); setShowImage(true); }}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setShowImage(true); } }}
            className="flex cursor-pointer flex-col items-center gap-1.5 border-b border-neutral-200 bg-neutral-50 py-6 hover:bg-neutral-100"
          >
            <LoadImageMark className="h-10 w-10" />
            <span className="text-xs font-medium text-neutral-700">Load preview image</span>
          </span>
        )
      ) : null}
      <span className="block p-3">
        <span className="flex items-center gap-1 text-[11px] text-neutral-500 uppercase">
          {link.siteName}
          <ExternalLink className="h-3 w-3" aria-hidden />
        </span>
        {link.title ? (
          <span className="mt-0.5 block text-sm font-medium text-neutral-900">{link.title}</span>
        ) : null}
        {link.description ? (
          <span className="mt-0.5 block line-clamp-2 text-xs text-neutral-600">{link.description}</span>
        ) : null}
      </span>
    </a>
  );
}

export function PostCard({
  post,
  isOrgAdmin,
  currentUserId,
}: {
  post: FeedPost;
  isOrgAdmin: boolean;
  currentUserId: string;
}) {
  const [state, action, pending] = useActionState<FeedActionState, FormData>(addReply, undefined);
  const [busy, start] = useTransition();
  const [showAll, setShowAll] = useState(false);

  const replies = showAll ? post.replies : post.replies.slice(-3);
  const hidden = post.replies.length - replies.length;

  return (
    <article className="rounded-xl border border-neutral-200 bg-white p-4">
      <header className="flex items-baseline gap-2">
        <span className="text-sm font-semibold text-neutral-900">{post.authorName}</span>
        <span className="text-xs text-neutral-500">{when(post.createdAt)}</span>
        {isOrgAdmin ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => start(() => void deletePost(post.id))}
            aria-label="Delete post"
            className="-my-3 ml-auto inline-flex h-11 w-11 items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-100 hover:text-red-600 disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
          </button>
        ) : null}
      </header>

      {/* Rendered as text, never as markup: this is the one place in the app
          where content is written for everyone to read, and escaping it is
          what keeps a post from being a script. */}
      <p className="mt-2 text-sm whitespace-pre-wrap text-neutral-800">{post.body}</p>

      {post.images.length > 0 ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {post.images.map((img) => (
            <DeferredImage key={img.id} image={img} />
          ))}
        </div>
      ) : null}

      {post.links.length > 0 ? (
        <div className="mt-3 space-y-2">
          {post.links.map((l) => (
            <LinkPreview key={l.id} link={l} />
          ))}
        </div>
      ) : null}

      <section className="mt-3 border-t border-neutral-100 pt-3">
        <h3 className="flex items-center gap-1.5 text-xs font-medium text-neutral-500">
          <MessageSquare className="h-3.5 w-3.5" aria-hidden />
          {post.replyCount === 0 ? "No replies yet" : `${post.replyCount} ${post.replyCount === 1 ? "reply" : "replies"}`}
        </h3>

        {hidden > 0 ? (
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="mt-1 text-xs text-neutral-600 underline-offset-2 hover:underline"
          >
            Show {hidden} earlier {hidden === 1 ? "reply" : "replies"}
          </button>
        ) : null}

        <ul className="mt-2 space-y-2">
          {replies.map((r) => (
            <li key={r.id} className="flex items-start gap-2 text-sm">
              <span className="min-w-0 flex-1">
                <span className="font-medium text-neutral-900">{r.authorName}</span>{" "}
                <span className="whitespace-pre-wrap text-neutral-700">{r.body}</span>
                <span className="mt-0.5 block text-[11px] text-neutral-500">{when(r.createdAt)}</span>
              </span>
              {r.authorId === currentUserId || isOrgAdmin ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => start(() => void deleteReply(r.id))}
                  aria-label="Delete reply"
                  className="-my-3 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-100 hover:text-red-600 disabled:opacity-50"
                >
                  <Trash2 className="h-3 w-3" aria-hidden />
                </button>
              ) : null}
            </li>
          ))}
        </ul>

        {/* Replies are open to everyone and are text only — deliberately. */}
        <form action={action} className="mt-2 flex items-center gap-2">
          <input type="hidden" name="postId" value={post.id} />
          <input
            name="body"
            required
            maxLength={1000}
            placeholder="Write a reply…"
            aria-label="Write a reply"
            className="min-w-0 flex-1 rounded-md border border-neutral-200 bg-white px-2 py-1.5 text-sm placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none"
          />
          <button
            type="submit"
            disabled={pending}
            className="inline-flex h-9 shrink-0 items-center rounded-md border border-neutral-200 px-3 text-xs font-medium text-neutral-700 hover:bg-neutral-100 disabled:opacity-50"
          >
            {pending ? "Posting…" : "Reply"}
          </button>
        </form>
        {state?.error ? <p className="mt-1 text-xs text-red-600">{state.error}</p> : null}
      </section>
    </article>
  );
}
