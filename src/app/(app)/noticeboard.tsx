"use client";

import { useActionState, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ImagePlus, Megaphone } from "lucide-react";
import { createPost, loadMorePosts, type FeedActionState } from "./feed-actions";
import { PostCard } from "./post-card";
import type { FeedPost } from "@/lib/feed";

/**
 * The noticeboard.
 *
 * Org admins post; anyone signed in replies, with text. The first page is
 * rendered on the server so there is something to read immediately, and further
 * pages are fetched as the reader reaches the end.
 *
 * Paging is by cursor, not offset: the feed grows at the end people are reading
 * from, so an offset would start repeating or skipping posts the moment a new
 * one landed mid-scroll.
 */
export function Noticeboard({
  initialPosts,
  initialCursor,
  isOrgAdmin,
  currentUserId,
}: {
  initialPosts: FeedPost[];
  initialCursor: string | null;
  isOrgAdmin: boolean;
  currentUserId: string;
}) {
  // Only the pages fetched by scrolling live in state. The first page stays a
  // prop, so when a server action revalidates "/" after a post or a reply, the
  // fresh copy is simply rendered -- no effect syncing props into state, which
  // is both an extra render and a chance to show a stale board.
  const [extraPages, setExtraPages] = useState<FeedPost[]>([]);
  const [cursor, setCursor] = useState(initialCursor);
  const [loading, setLoading] = useState(false);
  const sentinel = useRef<HTMLDivElement | null>(null);

  // Adjusting state when a prop changes, during render rather than in an
  // effect (the documented pattern). A new first page means the window moved,
  // so anything paged in behind it is no longer contiguous with it.
  const [seenCursor, setSeenCursor] = useState(initialCursor);
  if (seenCursor !== initialCursor) {
    setSeenCursor(initialCursor);
    setExtraPages([]);
    setCursor(initialCursor);
  }

  const posts = useMemo(() => {
    const seen = new Set<string>();
    const out: FeedPost[] = [];
    for (const p of [...initialPosts, ...extraPages]) {
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      out.push(p);
    }
    return out;
  }, [initialPosts, extraPages]);

  const loadMore = useCallback(async () => {
    if (!cursor || loading) return;
    setLoading(true);
    try {
      const next = await loadMorePosts(cursor);
      // Duplicates are filtered when the list is derived: a post deleted
      // between pages shifts the window and can hand back one already shown.
      setExtraPages((prev) => [...prev, ...next.posts]);
      setCursor(next.nextCursor);
    } finally {
      setLoading(false);
    }
  }, [cursor, loading]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !cursor) return;
    // rootMargin so the next page starts arriving before the reader hits the
    // bottom, rather than after they have already run out of feed.
    const io = new IntersectionObserver(
      (entries) => { if (entries[0]?.isIntersecting) void loadMore(); },
      { rootMargin: "600px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [cursor, loadMore]);

  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-1.5 text-sm font-semibold text-neutral-900">
        <Megaphone className="h-4 w-4 text-fuchsia-600" aria-hidden />
        Noticeboard
      </h2>

      {isOrgAdmin ? <Composer /> : null}

      {posts.length === 0 ? (
        <p className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 px-4 py-8 text-center text-sm text-neutral-500">
          Nothing posted yet.
          {isOrgAdmin ? " Write the first one above." : " Org admins post here."}
        </p>
      ) : (
        <div className="space-y-3">
          {posts.map((p) => (
            <PostCard key={p.id} post={p} isOrgAdmin={isOrgAdmin} currentUserId={currentUserId} />
          ))}
        </div>
      )}

      <div ref={sentinel} aria-hidden className="h-px" />
      {loading ? <p className="py-3 text-center text-xs text-neutral-500">Loading more…</p> : null}
      {!cursor && posts.length > 0 ? (
        <p className="py-3 text-center text-xs text-neutral-400">That&rsquo;s the whole board.</p>
      ) : null}
    </section>
  );
}

function Composer() {
  const formRef = useRef<HTMLFormElement | null>(null);
  const [names, setNames] = useState<string[]>([]);
  // Clearing the form belongs to the submit, not to an effect watching for the
  // submit to have happened.
  const [state, action, pending] = useActionState<FeedActionState, FormData>(
    async (prev, fd) => {
      const res = await createPost(prev, fd);
      if (!res?.error) { formRef.current?.reset(); setNames([]); }
      return res;
    },
    undefined,
  );

  return (
    <form
      ref={formRef}
      action={action}
      className="space-y-2 rounded-xl border border-neutral-200 bg-white p-4"
    >
      <textarea
        name="body"
        required
        rows={3}
        maxLength={5000}
        placeholder="Post something to the whole org…"
        aria-label="Post body"
        className="w-full resize-y rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none"
      />
      <p className="text-xs text-neutral-500">
        Paste a link and its preview is captured when you post.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-md border border-neutral-200 px-3 text-xs font-medium text-neutral-700 hover:bg-neutral-100">
          <ImagePlus className="h-3.5 w-3.5" aria-hidden />
          Add images
          <input
            type="file"
            name="images"
            multiple
            accept="image/*"
            className="sr-only"
            onChange={(e) => setNames([...(e.target.files ?? [])].map((f) => f.name))}
          />
        </label>
        {names.length > 0 ? (
          <span className="min-w-0 truncate text-xs text-neutral-500">{names.join(", ")}</span>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="ml-auto inline-flex h-9 items-center rounded-md bg-fuchsia-600 px-4 text-xs font-medium text-onaccent hover:bg-fuchsia-700 disabled:opacity-50"
        >
          {pending ? "Posting…" : "Post"}
        </button>
      </div>
      {state?.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
    </form>
  );
}
