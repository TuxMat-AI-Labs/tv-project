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

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      let rotating = false;
      try {
        const res = await fetch("/api/hub/status", { cache: "no-store" });
        const json = (await res.json()) as HubStatusResponse;
        if (!cancelled) setData(json);
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
