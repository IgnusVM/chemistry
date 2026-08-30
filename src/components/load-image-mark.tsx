"use client";

import { useId } from "react";

/**
 * The artwork on the "load image" placeholder.
 *
 * Inlined rather than served as a file so it inherits the page's own loading —
 * an <img> here would mean a network request to avoid a network request.
 *
 * Every gradient and filter id is namespaced per instance with useId(). SVG ids
 * are document-global: with a feed of posts there can be a dozen of these on
 * screen at once, and duplicate ids mean every copy after the first paints with
 * whichever definition happened to render first. That failure looks like a
 * rendering glitch and is genuinely unpleasant to track down.
 */
export function LoadImageMark({ className = "" }: { className?: string }) {
  const uid = useId().replace(/:/g, "");
  const flask = `flask-${uid}`;
  const glass = `glass-${uid}`;
  const gold = `gold-${uid}`;
  const glow = `glow-${uid}`;

  return (
    <svg viewBox="0 0 128 128" className={className} role="img" aria-hidden focusable="false">
      <defs>
        <linearGradient id={flask} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#42e8ff" />
          <stop offset=".5" stopColor="#1478e8" />
          <stop offset="1" stopColor="#7b2cff" />
        </linearGradient>
        <linearGradient id={glass} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity=".85" />
          <stop offset=".45" stopColor="#8beaff" stopOpacity=".45" />
          <stop offset="1" stopColor="#ffffff" stopOpacity=".18" />
        </linearGradient>
        <linearGradient id={gold} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffe58a" />
          <stop offset=".5" stopColor="#ffb52e" />
          <stop offset="1" stopColor="#d97808" />
        </linearGradient>
        <filter id={glow} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.2" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* atom orbit */}
      <g fill="none" stroke={`url(#${gold})`} strokeWidth="2.6" strokeLinecap="round">
        <ellipse cx="64" cy="77" rx="47" ry="20" transform="rotate(-18 64 77)" />
        <ellipse cx="64" cy="77" rx="47" ry="20" transform="rotate(42 64 77)" />
      </g>
      <g fill="#ffca4a" stroke="#5b3300" strokeWidth="1.4">
        <circle cx="20" cy="66" r="4" />
        <circle cx="104" cy="91" r="4" />
        <circle cx="88" cy="48" r="3.4" />
      </g>

      {/* flask */}
      <path
        d="M48 42h32v14c0 5 2 9 7 16l11 19c4 7-1 14-9 14H39c-8 0-13-7-9-14l11-19c5-7 7-11 7-16V42z"
        fill={`url(#${flask})`}
        stroke="#102548"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <path d="M48 42h32v7H48z" fill={`url(#${glass})`} stroke="#102548" strokeWidth="4" />
      <path
        d="M37 78c10 5 34 8 54 0l7 13c3 6-1 10-7 10H39c-6 0-10-5-7-10z"
        fill="#0b5bc8"
        opacity=".65"
      />
      <path
        d="M45 54v13c0 5-3 10-7 17"
        fill="none"
        stroke="#fff"
        strokeOpacity=".65"
        strokeWidth="3"
        strokeLinecap="round"
      />

      {/* bubbles */}
      <g fill="#8df4ff" stroke="#1765c8" strokeWidth="1">
        <circle cx="48" cy="87" r="3" />
        <circle cx="64" cy="94" r="2.4" />
        <circle cx="78" cy="84" r="3.2" />
        <circle cx="57" cy="77" r="1.8" />
        <circle cx="83" cy="96" r="1.7" />
      </g>

      {/* image card */}
      <g transform="rotate(-7 66 31)">
        <rect x="46" y="18" width="42" height="29" rx="5" fill="#f7f0d7" stroke="#142743" strokeWidth="3" />
        <rect x="51" y="23" width="32" height="19" rx="2.5" fill="#203451" />
        <circle cx="75" cy="28" r="3" fill="#ffe08a" />
        <path d="M53 39l8-7 5 4 5-5 10 8H53z" fill="#74d7df" />
      </g>

      {/* arrow */}
      <g filter={`url(#${glow})`}>
        <path
          d="M64 3l-10 11h6v12h8V14h6L64 3z"
          fill="#58efff"
          stroke="#102548"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}
