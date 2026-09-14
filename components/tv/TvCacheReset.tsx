"use client";

import { useEffect, useState } from "react";

/**
 * Scrubs every local store this app has ever put on a panel: service worker
 * registrations and everything in Cache Storage.
 *
 * There is no remote way to clear a TV browser's cache — MDC controls the
 * panel, not the browser on it, and nobody wants to walk to twelve screens and
 * dig through Tizen settings menus. But code running ON the panel can do it, so
 * this does, from `/screen`: a path served `no-store` that has never been
 * requested before and so cannot itself come from a cache. That is the one
 * foothold guaranteed to be running current code.
 *
 * Runs once per page load and reports what it removed on screen, because
 * "I cleared the cache" with nothing to show for it is how the last few days
 * have gone. If it finds nothing, that is a real answer too: it means caching
 * was never what was holding that screen back.
 */
export function TvCacheReset({ onDone }: { onDone?: (summary: string) => void }) {
  const [summary, setSummary] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const removed: string[] = [];

      try {
        if ("serviceWorker" in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations();
          for (const r of regs) await r.unregister();
          if (regs.length) removed.push(`${regs.length} service worker${regs.length > 1 ? "s" : ""}`);
        }
      } catch {
        // A browser that refuses to enumerate them has none we can clear.
      }

      try {
        if (typeof caches !== "undefined") {
          const keys = await caches.keys();
          for (const k of keys) await caches.delete(k);
          if (keys.length) removed.push(`${keys.length} cache${keys.length > 1 ? "s" : ""}`);
        }
      } catch {
        // Same.
      }

      if (cancelled) return;
      const text = removed.length ? `cleared ${removed.join(" + ")}` : "nothing cached";
      setSummary(text);
      onDone?.(text);
    })();

    return () => {
      cancelled = true;
    };
    // Deliberately once per load: this is a cleanup, not a subscription.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!summary) return null;
  return <>{summary}</>;
}
