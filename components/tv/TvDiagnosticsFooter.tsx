"use client";

import { useEffect, useState } from "react";

/**
 * A quiet line of facts about the screen you are standing in front of.
 *
 * Worth the pixels because of what it cost not to have it. Weeks went into a
 * display that rendered differently from the identical panel beside it, and the
 * question that would have cut that short — "is this screen even running the
 * same code as that one?" — could not be answered without walking to a laptop
 * and cross-referencing telemetry. The build id on the glass answers it from
 * across the room.
 *
 * Only on the pairing/status screens, never over live content.
 */
export function TvDiagnosticsFooter({ buildId }: { buildId?: string }) {
  const [info, setInfo] = useState<string[] | null>(null);

  useEffect(() => {
    // After mount: these read the live window, and rendering them on the server
    // would both mismatch on hydration and report the wrong machine entirely.
    // Deferred a frame so this stays out of the effect's render pass.
    const raf = requestAnimationFrame(() =>
      setInfo([
        `viewport ${window.innerWidth}×${window.innerHeight}`,
        `panel ${window.screen?.width ?? "?"}×${window.screen?.height ?? "?"}`,
        `dpr ${window.devicePixelRatio}`,
      ])
    );
    return () => cancelAnimationFrame(raf);
  }, []);

  if (!info) return null;
  const parts = buildId ? [...info, `build ${buildId.slice(0, 7)}`] : info;

  return (
    <p
      className="absolute bottom-[2vh] left-1/2 -translate-x-1/2 font-mono text-white/25"
      style={{ fontSize: "1.3vh", letterSpacing: "0.06em" }}
    >
      {parts.join("  ·  ")}
    </p>
  );
}
