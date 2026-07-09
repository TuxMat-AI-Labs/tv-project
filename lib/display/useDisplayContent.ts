"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PlaylistItem } from "@/lib/display/resolveContentForDisplay";
import type { CarouselPayload } from "@/lib/display/resolveRoomCarousel";

export type DisplayContentResponse = {
  mode: "playlist" | "screensaver" | "inactive" | "carousel";
  playlist?: PlaylistItem[];
  carousel?: CarouselPayload;
  contentFit?: "COVER" | "CONTAIN" | "FILL";
  reloadRequestedAt?: string | null;
  serverTime: string;
};

const POLL_INTERVAL_MS = 15_000;
const JITTER_MS = 3_000;
// While the carousel is active, poll faster (and without the anti-herd jitter)
// so each display re-anchors its local rotation timer to server time roughly
// once per beat — that keeps the wall from drifting apart over a long session.
const CAROUSEL_POLL_INTERVAL_MS = 6_000;
const MAX_CONSECUTIVE_FAILURES = 10;

function jitterFor(slug: string) {
  let hash = 0;
  for (let i = 0; i < slug.length; i++) hash = (hash * 31 + slug.charCodeAt(i)) >>> 0;
  return (hash % (JITTER_MS * 2)) - JITTER_MS;
}

export function useDisplayContent(slug: string) {
  const [data, setData] = useState<DisplayContentResponse | null>(null);
  const failuresRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Baseline the reload marker on the first poll (an old value already on the
  // Display shouldn't trigger a reload on mount) — only a *change* after that
  // means the hub just asked this TV to refresh.
  const reloadBaselineRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      let carouselActive = false;
      try {
        const res = await fetch(`/api/displays/${slug}/content`, { cache: "no-store" });
        if (!res.ok && res.status !== 404) throw new Error(`status ${res.status}`);
        const json = (await res.json()) as DisplayContentResponse;
        if (cancelled) return;
        failuresRef.current = 0;
        carouselActive = json.mode === "carousel";

        const reloadMarker = json.reloadRequestedAt ?? null;
        if (reloadBaselineRef.current === undefined) {
          reloadBaselineRef.current = reloadMarker;
        } else if (reloadMarker !== reloadBaselineRef.current) {
          window.location.reload();
          return;
        }

        setData(json);
      } catch {
        failuresRef.current += 1;
        if (!cancelled && failuresRef.current >= MAX_CONSECUTIVE_FAILURES) {
          setData({ mode: "screensaver", serverTime: new Date().toISOString() });
        }
      } finally {
        if (!cancelled) {
          const delay = carouselActive
            ? CAROUSEL_POLL_INTERVAL_MS
            : POLL_INTERVAL_MS + jitterFor(slug);
          timerRef.current = setTimeout(poll, delay);
        }
      }
    }

    poll();
    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [slug]);

  const reportHeartbeat = useCallback(
    (currentContentId: string | null) => {
      fetch(`/api/displays/${slug}/heartbeat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentContentId }),
        keepalive: true,
      }).catch(() => {});
    },
    [slug]
  );

  return { data, reportHeartbeat };
}
