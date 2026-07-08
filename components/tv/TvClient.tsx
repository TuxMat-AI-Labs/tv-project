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

/**
 * The public `/tv` entry. On a loop it registers with the server (which
 * identifies the TV by its httpOnly device cookie): while unpaired it shows the
 * pairing screen and polls for approval; once paired it renders that Display's
 * content permanently. No auth, no password on the TV.
 */
export function TvClient() {
  const [state, setState] = useState<RegisterResponse | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
