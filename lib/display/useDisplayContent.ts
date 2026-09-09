"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PlaylistItem } from "@/lib/display/resolveContentForDisplay";
import type { CarouselPayload } from "@/lib/display/resolveRoomCarousel";
import type { CarouselTransition } from "@/lib/display/transition";
import type { ScreensaverVariant } from "@/lib/screensaver";
import { measureViewport, faultsFor, type ViewportReport } from "@/lib/display/viewportHealth";

export type DisplayContentResponse = {
  mode: "playlist" | "screensaver" | "inactive" | "carousel" | "black";
  playlist?: PlaylistItem[];
  carousel?: CarouselPayload;
  contentFit?: "COVER" | "CONTAIN" | "FILL";
  carouselTransition?: CarouselTransition;
  screensaverStyle?: ScreensaverVariant;
  reloadRequestedAt?: string | null;
  buildId?: string;
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
  // The last content id we reported, so the periodic heartbeat below can repeat
  // it without the players having to fire again.
  const lastContentIdRef = useRef<string | null>(null);
  // Held in a ref so the poll effect can call it without taking it as a
  // dependency — depending on the callback would tear down and restart polling.
  const postHeartbeatRef = useRef<(id: string | null) => void>(() => {});
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Baseline the reload marker on the first poll (an old value already on the
  // Display shouldn't trigger a reload on mount) — only a *change* after that
  // means the hub just asked this TV to refresh.
  const reloadBaselineRef = useRef<string | null | undefined>(undefined);
  // Same baseline-then-watch pattern for the server's deploy id: a change means
  // a new build shipped, so this always-on TV hard-reloads onto the new bundle
  // instead of running stale JS that may not understand newer response shapes.
  const buildBaselineRef = useRef<string | null | undefined>(undefined);

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

        // A new deploy shipped since this TV loaded → reload onto the new
        // bundle. Baselined on the first poll so mount never self-reloads.
        const buildMarker = json.buildId ?? null;
        if (buildBaselineRef.current === undefined) {
          buildBaselineRef.current = buildMarker;
        } else if (buildMarker !== buildBaselineRef.current) {
          window.location.reload();
          return;
        }

        setData(json);

        // Beat on every poll, not only when the content changes.
        //
        // A wall board is one webpage item that never advances, so
        // onCurrentItemChange fired once on mount and never again — which meant
        // the viewport was measured once, at load, and the screens we are trying
        // to catch drift hours later. A heartbeat that only beats when something
        // else happens is not a heartbeat.
        postHeartbeatRef.current(lastContentIdRef.current);
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

  // Measured fresh on every heartbeat rather than once on mount: the whole point
  // is that these TVs change zoom on their own, hours after loading.
  const [viewport, setViewport] = useState<ViewportReport | null>(null);

  const reportHeartbeat = useCallback(
    (currentContentId: string | null) => {
      lastContentIdRef.current = currentContentId;
      const measured = measureViewport();
      setViewport(measured);
      fetch(`/api/displays/${slug}/heartbeat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentContentId, ...measured }),
        keepalive: true,
      }).catch(() => {});
    },
    [slug]
  );

  // Kept current in an effect, not during render: writing a ref while rendering
  // is a hooks violation, and this only has to be right by the time the poll
  // timer next fires.
  useEffect(() => {
    postHeartbeatRef.current = reportHeartbeat;
  }, [reportHeartbeat]);

  // A screen showing nothing (screensaver, black, inactive) still heartbeats via
  // DisplayPlayer, so this stays current on every display regardless of mode.
  const viewportFaults = faultsFor(viewport);

  return { data, reportHeartbeat, viewport, viewportFaults };
}
