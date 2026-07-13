"use client";

import { useEffect } from "react";

/**
 * Registers the app-shell-only service worker (public/sw.js) so the hub can
 * be installed as a PWA. Mounted only in the hub layout — the TV-facing
 * routes (/display, /tv) have no need for it and should never risk a cached
 * response there.
 */
export function RegisterServiceWorker() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  return null;
}
