"use client";

import { useEffect, useRef, useState } from "react";
import type { HubStatusResponse } from "@/lib/hub/types";

const POLL_INTERVAL_MS = 10_000;

export function useHubStatus() {
  const [data, setData] = useState<HubStatusResponse | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch("/api/hub/status", { cache: "no-store" });
        const json = (await res.json()) as HubStatusResponse;
        if (!cancelled) setData(json);
      } catch {
        // keep showing last-known state; retry next cycle
      } finally {
        if (!cancelled) timerRef.current = setTimeout(poll, POLL_INTERVAL_MS);
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
