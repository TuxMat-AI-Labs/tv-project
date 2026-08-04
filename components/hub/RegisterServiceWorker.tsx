"use client";

import { useEffect } from "react";

/**
 * Registers the shared service worker (public/sw.js) so the hub can be
 * installed as a PWA. The TV-facing routes (/display, /tv) register the same
 * file too, via components/display/RegisterServiceWorker — see sw.js for why
 * (offline self-healing) and for how hub navigations are still exempted from
 * any caching.
 */
export function RegisterServiceWorker() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  return null;
}
