"use client";

import { useId } from "react";

/**
 * The artwork on the "load image" placeholder.
 *
 * Inlined rather than served as a file so it inherits the page's own loading:
 * an <img> here would mean a network request to avoid a network request.
 *
 * Every gradient and filter id is namespaced per instance with useId(). SVG ids
 * are document-global: with a feed of posts there can be a dozen of these on
 * screen at once, and duplicate ids mean every copy after the first paints with
 * whichever definition happened to render first. That failure looks like a
 * rendering glitch and is genuinely unpleasant to track down.
 *
 * The Illustrator export this came from carried its paint in a <style> block of
 * `.st0`-style class names. Those are global too, and far more collision-prone
 * than the ids, so every rule is applied here as an attribute instead. Path data
 * is otherwise verbatim from the source file.
 */
export function LoadImageMark({ className = "" }: { className?: string }) {
  const uid = useId().replace(/:/g, "");
  const orbitA = `orbit-a-${uid}`;
  const orbitB = `orbit-b-${uid}`;
  const beadA = `bead-a-${uid}`;
  const beadB = `bead-b-${uid}`;
  const beadC = `bead-c-${uid}`;
  const flask = `flask-${uid}`;
  const glass = `glass-${uid}`;
  const glow = `glow-${uid}`;

  const bead = { stroke: "#5b3300", strokeWidth: 1.4 };

  return (
    <svg viewBox="0 0 128 128" className={className} role="img" aria-hidden focusable="false">
      <defs>
        <linearGradient
          id={orbitA}
          x1="-231.76"
          y1="474.97"
          x2="-230.76"
          y2="473.97"
          gradientTransform="translate(21802.9505 19040.2674) scale(94 -40)"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#ffe58a" />
          <stop offset=".5" stopColor="#ffb52e" />
          <stop offset="1" stopColor="#d97808" />
        </linearGradient>
        <linearGradient
          id={orbitB}
          x1="-228.73"
          y1="482.44"
          x2="-227.73"
          y2="481.44"
          gradientTransform="translate(-19213.6479 21514.7511) rotate(90) scale(94 -40)"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#ffe58a" />
          <stop offset=".5" stopColor="#ffb52e" />
          <stop offset="1" stopColor="#d97808" />
        </linearGradient>
        <linearGradient
          id={beadA}
          x1="30.17"
          y1="70.64"
          x2="36.78"
          y2="70.64"
          gradientTransform="translate(-3.38 -1.93) rotate(.73) scale(1.03) skewX(1.45)"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset=".04" stopColor="#db489a" />
          <stop offset=".09" stopColor="#db538f" />
          <stop offset=".33" stopColor="#dc8d55" />
          <stop offset=".52" stopColor="#dcb231" />
          <stop offset=".62" stopColor="#ddc024" />
          <stop offset=".99" stopColor="#fff" />
        </linearGradient>
        <linearGradient
          id={beadB}
          x1="101.2"
          y1="91.63"
          x2="107.99"
          y2="91.63"
          gradientTransform="translate(-3.38 -1.93) rotate(.73) scale(1.03) skewX(1.45)"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#db489a" />
          <stop offset=".5" stopColor="#ddc024" />
          <stop offset="1" stopColor="#fff" />
        </linearGradient>
        {/* Inherits its stops from the bead above, as the source file did. */}
        <linearGradient id={beadC} x1="88.11" y1="55.51" x2="93.88" y2="55.51" href={`#${beadB}`} />
        <linearGradient
          id={flask}
          x1="-229.76"
          y1="479.18"
          x2="-228.76"
          y2="478.18"
          gradientTransform="translate(16295.63 30233.0594) scale(70.8156 -63)"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#42e8ff" />
          <stop offset=".5" stopColor="#1478e8" />
          <stop offset="1" stopColor="#7b2cff" />
        </linearGradient>
        <linearGradient
          id={glass}
          x1="-225.72"
          y1="433.89"
          x2="-224.72"
          y2="432.89"
          gradientTransform="translate(7271 3079.2288) scale(32 -7)"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#fff" stopOpacity=".85" />
          <stop offset=".45" stopColor="#8beaff" stopOpacity=".45" />
          <stop offset="1" stopColor="#fff" stopOpacity=".18" />
        </linearGradient>
        <filter id={glow} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur result="b" stdDeviation="2.2" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* atom orbits */}
      <g fill="none" strokeWidth="2.6" strokeLinecap="round">
        <ellipse
          cx="64.13"
          cy="61.53"
          rx="47"
          ry="20"
          transform="translate(-15.88 22.83) rotate(-18)"
          stroke={`url(#${orbitA})`}
        />
        <ellipse
          cx="64.13"
          cy="61.53"
          rx="20"
          ry="47"
          transform="translate(-24.51 68.02) rotate(-48)"
          stroke={`url(#${orbitB})`}
        />
      </g>

      {/* beads riding the orbits */}
      <g>
        <path
          d="M31.8,67.54c1.94.02,3.53,1.59,3.55,3.49s-1.53,3.43-3.46,3.4-3.53-1.59-3.55-3.49,1.53-3.43,3.46-3.4Z"
          fill={`url(#${beadA})`}
          {...bead}
        />
        <path
          d="M105.73,90.01c1.94.02,3.53,1.59,3.55,3.49s-1.53,3.43-3.46,3.4-3.53-1.59-3.55-3.49,1.53-3.43,3.46-3.4Z"
          fill={`url(#${beadB})`}
          {...bead}
        />
        <path
          d="M91.23,53.29c1.65.02,3,1.35,3.02,2.97s-1.3,2.91-2.94,2.89-3-1.35-3.02-2.97,1.3-2.91,2.94-2.89Z"
          fill={`url(#${beadC})`}
          {...bead}
        />
      </g>

      {/* flask */}
      <path
        d="M48,42h32v14c0,5,2,9,7,16l11,19c4,7-1,14-9,14h-50c-8,0-13-7-9-14l11-19c5-7,7-11,7-16v-14Z"
        fill={`url(#${flask})`}
        stroke="#102548"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <path d="M48,42h32v7h-32v-7Z" fill={`url(#${glass})`} stroke="#102548" strokeWidth="4" />
      <path
        d="M35.84,82.89c10.25,4.43,34.85,7.1,55.34,0l7.17,11.53c3.07,5.32-1.02,8.87-7.17,8.87h-53.29c-6.15,0-10.25-4.43-7.17-8.87l5.12-11.53Z"
        fill="#a20cc6"
        opacity=".65"
        style={{ isolation: "isolate" }}
      />

      {/* bubbles */}
      <g fill="#8df4ff" stroke="#1765c8">
        <circle cx="47.6" cy="83.13" r="3" />
        <circle cx="63.6" cy="90.13" r="2.4" />
        <circle cx="77.6" cy="80.13" r="3.2" />
        <circle cx="56.6" cy="73.13" r="1.8" />
        <circle cx="82.6" cy="92.13" r="1.7" />
      </g>

      {/* image card */}
      <g>
        <path
          d="M45.79,39.54l16.83-27.82c1.45-2.4,4.62-3.13,7.07-1.62l16.88,10.36c2.45,1.51,3.26,4.67,1.81,7.07l-16.83,27.82c-1.45,2.4-4.62,3.13-7.07,1.62l-16.88-10.36c-2.45-1.51-3.26-4.67-1.81-7.07Z"
          fill="#f7f0d7"
          stroke="#142743"
          strokeWidth="3"
        />
        <path
          d="M51.54,40.09l14.2-23.47c.73-1.2,2.31-1.56,3.54-.81l12.43,7.63c1.23.75,1.63,2.34.91,3.54l-14.2,23.47c-.73,1.2-2.31,1.56-3.54.81l-12.43-7.63c-1.23-.75-1.63-2.34-.91-3.54Z"
          fill="#203451"
        />
        <ellipse
          cx="67.29"
          cy="24.13"
          rx="3.05"
          ry="3.13"
          transform="translate(6.61 61.92) rotate(-51.64)"
          fill="#ffe08a"
        />
        <path d="M65.49,49.25l-2.01-10.77,6.18-2.17-1.81-7.07,12.37-4.33-14.73,24.34Z" fill="#74d7df" />
      </g>

      {/* arrow */}
      <g filter={`url(#${glow})`}>
        <path
          d="M52.17,9.8l-10.17,11h6.1v12h8.13v-12h6.1l-10.17-11Z"
          fill="#58efff"
          stroke="#102548"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}
