"use client";

import { useState, useTransition } from "react";
import { getPostImageUrl } from "./feed-actions";
import { LoadImageMark } from "@/components/load-image-mark";
import type { FeedImage } from "@/lib/feed";

/**
 * An image that is not fetched until someone asks for it.
 *
 * Every image on this board costs a GET against object storage, and a feed is
 * the one screen people scroll past without reading. Auto-loading would bill
 * the organisation for every image nobody looked at. So the post shows this
 * placeholder, and only a deliberate press fetches a presigned URL and the
 * bytes behind it. (Link preview images are different and load normally — those
 * come from the linked site, not from us.)
 *
 * Sizing differs by count, on purpose:
 *
 * Several images share a fixed 4:3 frame so the grid stays a grid whatever
 * shape they arrived in — a portrait beside a panorama would otherwise make two
 * ragged rows.
 *
 * A single image is sized by its own proportions, capped in height. A fixed
 * frame here was worse: a phone-camera portrait letterboxed into a wide box is
 * mostly empty space, and a post's photo is usually evidence of something. The
 * layout does shift when it loads, which is fine — the reader pressed a button
 * and expects something to appear. What must never shift is content arriving
 * unasked.
 */
export function DeferredImage({ image, lone = false }: { image: FeedImage; lone?: boolean }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const placeholderFrame = lone ? "h-72" : "aspect-[4/3]";

  function load() {
    setError(null);
    start(async () => {
      const res = await getPostImageUrl(image.id);
      if (res.error) setError(res.error);
      else if (res.url) setUrl(res.url);
    });
  }

  if (url) {
    // Lone: let the image keep its own proportions, capped so a tall one cannot
    // push the rest of the feed off the screen. In a grid: fill the shared frame.
    return lone ? (
      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={image.filename}
          className="mx-auto max-h-[30rem] w-auto max-w-full object-contain"
        />
      </div>
    ) : (
      <div className="aspect-[4/3] w-full overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={image.filename} className="h-full w-full object-contain" />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={load}
      disabled={pending}
      aria-label={`Load image: ${image.filename}`}
      className={`${placeholderFrame} group flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-neutral-300 bg-neutral-50 px-4 transition-colors hover:border-fuchsia-400 hover:bg-neutral-100 disabled:opacity-60`}
    >
      <LoadImageMark className={`${lone ? "h-20 w-20" : "h-14 w-14"} transition-transform group-hover:scale-105`} />
      <span className="text-sm font-medium text-neutral-800">
        {pending ? "Loading…" : "Load image"}
      </span>
      <span className="max-w-full truncate px-2 text-xs text-neutral-500">{image.filename}</span>
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </button>
  );
}
