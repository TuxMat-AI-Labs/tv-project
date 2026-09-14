"use client";

import { useState } from "react";
import { TvClient } from "@/components/tv/TvClient";
import { TvCacheReset } from "@/components/tv/TvCacheReset";

/**
 * `/screen`'s entry point: wipe every local store on the panel, then behave
 * exactly like `/tv`.
 *
 * The clearing happens alongside the player rather than blocking it, so a
 * screen is never left staring at a maintenance message — it pairs or plays as
 * normal while the cleanup happens underneath.
 *
 * What it removed is printed in the corner. That readout is the point: it turns
 * "I cleared the cache" into evidence. If it says `nothing cached`, then caching
 * was never what was holding that panel back, and we stop chasing it.
 */
export function ScreenEntry() {
  const [note, setNote] = useState<string | null>(null);

  return (
    <>
      <TvClient />
      <TvCacheReset onDone={setNote} />
      {note && (
        <p
          className="pointer-events-none absolute top-[1.5vh] right-[1.5vh] z-[9999] rounded font-mono text-white/70"
          style={{ fontSize: "1.3vh", background: "rgba(0,0,0,0.6)", padding: "0.5vh 0.9vh" }}
        >
          reset: {note}
        </p>
      )}
    </>
  );
}
