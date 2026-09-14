"use client";

import { useEffect, useRef, useState } from "react";
import { DisplayPlayer } from "@/components/display/DisplayPlayer";
import { PairingScreen } from "@/components/tv/PairingScreen";
import { TvStatusScreen } from "@/components/tv/TvStatusScreen";

type RegisterResponse =
  | { status: "paired"; slug: string; buildId?: string }
  | { status: "unpaired"; code: string; pairUrl: string; qrDataUrl: string; buildId?: string };

// Poll quickly while waiting for an admin to approve, slowly once paired
// (just enough to notice a reassignment or unpair from the hub).
const UNPAIRED_POLL_MS = 4_000;
const PAIRED_POLL_MS = 30_000;
// Back off a failing request rather than hammering a server that may be
// restarting mid-deploy — but stay fast enough to recover on its own.
const ERROR_POLL_MS = 6_000;

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
 *
 * Set this URL — just `/tv` — as the panel's homepage. It is short enough to
 * type with a remote, and it never changes: which display a screen *is* gets
 * decided by pairing it from the hub, not by typing a different URL. Re-pairing
 * a screen (unpair in the hub, approve it again) is also the way to fix a panel
 * that is bound to the wrong display record.
 */
export function TvClient() {
  const [state, setState] = useState<RegisterResponse | null>(null);
  // Failures are rendered, never swallowed. A screen that cannot reach the
  // server used to sit black and indistinguishable from a dead panel.
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
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
        if (!res.ok) throw new Error(`server answered ${res.status}`);
        const json = (await res.json()) as RegisterResponse;
        if (!cancelled) {
          setState(json);
          setError(null);
          setAttempts(0);
          next = json.status === "paired" ? PAIRED_POLL_MS : UNPAIRED_POLL_MS;
        }
      } catch (e) {
        if (!cancelled) {
          setAttempts((n) => n + 1);
          // Keep the last good state on screen if there is one — a paired TV
          // that briefly loses the network should keep PLAYING, not throw an
          // error over the wall. The message is only for a screen that has
          // nothing to show in the first place.
          if (!stateRef.current) setError(e instanceof Error ? e.message : "request failed");
          next = ERROR_POLL_MS;
        }
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

  if (!state) {
    return error ? (
      <TvStatusScreen state="error" detail={error} attempts={attempts} />
    ) : (
      <TvStatusScreen state="connecting" />
    );
  }

  if (state.status === "paired") {
    return <DisplayPlayer slug={state.slug} />;
  }

  return (
    <PairingScreen
      code={state.code}
      qrDataUrl={state.qrDataUrl}
      pairUrl={state.pairUrl}
      buildId={state.buildId}
    />
  );
}
