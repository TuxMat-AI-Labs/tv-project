"use client";

import { useEffect } from "react";

/**
 * Registers the shared service worker (public/sw.js) so the hub can be
 * installed as a PWA, and keeps an already-installed copy from going stale.
 *
 * The staleness problem this solves: an installed PWA is a long-lived app that
 * may not be fully closed for days, so without this it can keep running the
 * bundle it started with and never show a new deploy. Three things are needed:
 *
 *  1. `updateViaCache: "none"` — otherwise the browser is allowed to satisfy
 *     its check for a new sw.js from its own HTTP cache, so a new worker can go
 *     unnoticed. This forces that request to the network.
 *  2. An explicit `update()` on mount and whenever the app is brought back to
 *     the foreground — that is when a phone user actually returns to it.
 *  3. A one-shot reload when a new worker takes control. sw.js calls
 *     skipWaiting()/clients.claim(), so a new version takes over without a
 *     reload; the page would otherwise keep its already-loaded assets.
 *
 * The TV routes register the same file (components/display/RegisterServiceWorker)
 * but deliberately skip the reload — they already hard-reload on a `buildId`
 * change, and a second reload path on the wall is not worth the risk.
 */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // A new worker taking control means the shell it caches has changed, so the
    // assets this page is running are stale. Reload exactly once.
    // `controller` being present tells us this is an UPDATE rather than the
    // first-ever install (where there is nothing stale to discard).
    const hadController = Boolean(navigator.serviceWorker.controller);
    let reloaded = false;
    const onControllerChange = () => {
      if (reloaded || !hadController) return;
      reloaded = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    let registration: ServiceWorkerRegistration | undefined;
    navigator.serviceWorker
      .register("/sw.js", { updateViaCache: "none" })
      .then((reg) => {
        registration = reg;
        return reg.update();
      })
      .catch(() => {});

    // Coming back to the app is the moment worth re-checking — an installed PWA
    // is often left open in the background for days between uses.
    const onVisible = () => {
      if (document.visibilityState === "visible") registration?.update().catch(() => {});
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return null;
}
