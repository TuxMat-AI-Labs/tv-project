"use client";

import { useEffect } from "react";

/**
 * Registers the shared service worker (public/sw.js) on the TV-facing routes
 * so an unattended display can recover from a hard network failure (the
 * server briefly unreachable during a deploy restart, a DNS blip) without
 * someone walking over to press refresh — see sw.js for how the fallback
 * screen works. Mounted alongside <ViewportLock> in app/tv/page.tsx and
 * app/display/[slug]/layout.tsx.
 */
export function RegisterServiceWorker() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  return null;
}
