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
 * bytes behind it.
 *
 * It is also the honest thing on a phone at the event: a volunteer on a weak
 * connection decides what their signal gets spent on.
 */
export function DeferredImage({ image }: { image: FeedImage }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function load() {
    setError(null);
    start(async () => {
      const res = await getPostImageUrl(image.id);
      if (res.error) setError(res.error);
      else if (res.url) setUrl(res.url);
    });
  }

  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={image.filename}
        className="max-h-[32rem] w-full rounded-lg border border-neutral-200 object-contain"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={load}
      disabled={pending}
      aria-label={`Load image: ${image.filename}`}
      className="group flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-neutral-300 bg-neutral-50 px-4 py-8 transition-colors hover:border-fuchsia-400 hover:bg-neutral-100 disabled:opacity-60"
    >
      <LoadImageMark className="h-16 w-16 transition-transform group-hover:scale-105" />
      <span className="text-sm font-medium text-neutral-800">
        {pending ? "Loading…" : "Load image"}
      </span>
      <span className="max-w-full truncate text-xs text-neutral-500">{image.filename}</span>
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </button>
  );
}
