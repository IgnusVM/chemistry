"use client";

import { useEffect } from "react";

/**
 * Registers the service worker that makes Chemistry installable and gives it an
 * offline fallback. Served from /sw.js (the origin root) rather than a bundled
 * path so its default scope is "/" — a worker emitted under /_next/static/ can
 * only control that subtree unless the server also sends Service-Worker-Allowed.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {
      // A failed SW registration must never break the app — it's pure enhancement.
    });
  }, []);

  return null;
}
