"use client";

import { useEffect, useRef, useState } from "react";
import type { HubStatusResponse } from "@/lib/hub/types";

const POLL_INTERVAL_MS = 10_000;
// While any room's landscape carousel is running, poll much faster so an
// admin watching the hub dashboard sees the ON/OFF switch and the rotating
// image update with minimal delay, instead of waiting out the full 10s.
const ROTATING_POLL_INTERVAL_MS = 3_000;

export function useHubStatus() {
  const [data, setData] = useState<HubStatusResponse | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Baselined on the first poll (so mounting never self-reloads); a change
  // after that means a new build shipped. This is what keeps the installed PWA
  // from sitting on a stale bundle for days — a normal deploy changes the JS
  // chunks without touching sw.js, so the service worker never sees it.
  const buildBaselineRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      let rotating = false;
      try {
        const res = await fetch("/api/hub/status", { cache: "no-store" });
        const json = (await res.json()) as HubStatusResponse;
        if (cancelled) return;

        if (buildBaselineRef.current === undefined) {
          buildBaselineRef.current = json.buildId;
        } else if (json.buildId !== buildBaselineRef.current) {
          window.location.reload();
          return;
        }

        setData(json);
        rotating = json.rooms.some((r) => r.carouselActive);
      } catch {
        // keep showing last-known state; retry next cycle
      } finally {
        if (!cancelled) {
          const delay = rotating ? ROTATING_POLL_INTERVAL_MS : POLL_INTERVAL_MS;
          timerRef.current = setTimeout(poll, delay);
        }
      }
    }

    poll();
    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return data;
}
