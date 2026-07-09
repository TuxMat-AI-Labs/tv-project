"use client";

import { useEffect, useRef, useState } from "react";
import { DisplayPlayer } from "@/components/display/DisplayPlayer";
import { PairingScreen } from "@/components/tv/PairingScreen";

type RegisterResponse =
  | { status: "paired"; slug: string }
  | { status: "unpaired"; code: string; pairUrl: string; qrDataUrl: string };

// Poll quickly while waiting for an admin to approve, slowly once paired
// (just enough to notice a reassignment or unpair from the hub).
const UNPAIRED_POLL_MS = 4_000;
const PAIRED_POLL_MS = 30_000;

// Self-heal watchdog for the pairing screen: if the page's CSS/JS assets fail
// to load on first paint (a network blip, or a cold-start/deploy window), the
// pairing screen can render unstyled and gets stuck that way forever — these
// kiosk tabs never reload themselves. A full reload while unpaired is safe
// (nothing is playing yet) and clears that state within a few minutes instead
// of needing someone to walk up to the TV.
const UNPAIRED_WATCHDOG_RELOAD_MS = 3 * 60_000;

/**
 * The public `/tv` entry. On a loop it registers with the server (which
 * identifies the TV by its httpOnly device cookie): while unpaired it shows the
 * pairing screen and polls for approval; once paired it renders that Display's
 * content permanently. No auth, no password on the TV.
 */
export function TvClient() {
  const [state, setState] = useState<RegisterResponse | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Runs once on mount, independent of the poll loop below, so it fires even
  // if the very first render is the broken/unstyled one this is guarding
  // against — it doesn't depend on `state` ever successfully updating. Skips
  // the reload if the TV got paired in the meantime (nothing to self-heal).
  useEffect(() => {
    const watchdog = setTimeout(() => {
      if (stateRef.current?.status !== "paired" && !document.hidden) window.location.reload();
    }, UNPAIRED_WATCHDOG_RELOAD_MS);
    return () => clearTimeout(watchdog);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      let next = UNPAIRED_POLL_MS;
      try {
        const res = await fetch("/api/tv/register", { method: "POST", cache: "no-store" });
        const json = (await res.json()) as RegisterResponse;
        if (!cancelled) {
          setState(json);
          next = json.status === "paired" ? PAIRED_POLL_MS : UNPAIRED_POLL_MS;
        }
      } catch {
        // network blip — keep the last state and retry
      } finally {
        if (!cancelled) timerRef.current = setTimeout(poll, next);
      }
    }

    poll();
    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (!state) return <div className="absolute inset-0 bg-black" />;

  if (state.status === "paired") {
    return <DisplayPlayer slug={state.slug} />;
  }

  return <PairingScreen code={state.code} qrDataUrl={state.qrDataUrl} pairUrl={state.pairUrl} />;
}
