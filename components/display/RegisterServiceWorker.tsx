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
    if (!("serviceWorker" in navigator)) return;
    // `updateViaCache: "none"` so the check for a new sw.js can't be satisfied
    // from the browser's own HTTP cache — on a screen that is never manually
    // refreshed, a stale worker would otherwise persist indefinitely.
    // No reload-on-update here, unlike the hub: the TV already hard-reloads on
    // a `buildId` change, and a second reload path on the wall isn't worth it.
    navigator.serviceWorker
      .register("/sw.js", { updateViaCache: "none" })
      .then((reg) => reg.update())
      .catch(() => {});
  }, []);

  return null;
}
