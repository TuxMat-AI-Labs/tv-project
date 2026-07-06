"use client";

import { useEffect, useState } from "react";

type Variant = "drift" | "bounce" | "pulse";
const OPTIONS: { key: Variant; label: string; blurb: string }[] = [
  { key: "drift", label: "Drift", blurb: "Slow wander" },
  { key: "pulse", label: "Pulse", blurb: "Breathing glow" },
  { key: "bounce", label: "Bounce", blurb: "Edge to edge" },
];

const STORAGE_KEY = "tuxdisplay:screensaver";

/**
 * Screensaver picker — three live previews side by side, separated by a hairline,
 * each animating exactly as it will on the TV. Hover focuses one; tap activates
 * it for the scheduled pixel-care window. Selection persists locally for now
 * (wiring it to displays needs a `screensaverStyle` field on the backend).
 */
export function ScreensaverPicker() {
  const [active, setActive] = useState<Variant | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActive(localStorage.getItem(STORAGE_KEY) as Variant | null);
  }, []);

  function activate(key: Variant) {
    setActive(key);
    localStorage.setItem(STORAGE_KEY, key);
  }

  return (
    <div className="group/row grid grid-cols-3 overflow-hidden rounded-2xl border border-black/10 bg-black shadow-[0_24px_60px_-24px_rgba(32,28,22,0.4)]" style={{ height: "76vh" }}>
      {OPTIONS.map((opt, i) => {
        const isActive = active === opt.key;
        return (
          <button
            key={opt.key}
            type="button"
            onClick={() => activate(opt.key)}
            aria-pressed={isActive}
            className={`group/panel relative overflow-hidden focus:outline-none ${i > 0 ? "border-l border-white/40" : ""}`}
          >
            <ScreensaverStage variant={opt.key} />

            {/* Dim every panel except the hovered one, so hover previews the pick. */}
            <span className="pointer-events-none absolute inset-0 bg-black/45 transition-colors duration-300 group-hover/row:bg-black/60 group-hover/panel:!bg-transparent" />

            {isActive && <span className="pointer-events-none absolute inset-0 z-10 ring-2 ring-inset ring-gold" />}

            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-center justify-between p-5">
              <span className="flex flex-col text-left">
                <span className="text-sm font-semibold tracking-wide text-white uppercase">{opt.label}</span>
                <span className="text-[0.7rem] tracking-wide text-white/50 uppercase">{opt.blurb}</span>
              </span>
              <span
                className={`rounded-full border px-3 py-1 text-xs font-medium tracking-wide uppercase transition ${
                  isActive ? "border-gold bg-gold text-black" : "border-white/30 text-white/80"
                }`}
              >
                {isActive ? "Active" : "Activate"}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function ScreensaverStage({ variant }: { variant: Variant }) {
  const anim =
    variant === "drift"
      ? "ss-drift 16s ease-in-out infinite alternate"
      : variant === "bounce"
        ? "ss-bounce 15s linear infinite"
        : "ss-pulse 5s ease-in-out infinite";
  const markClass =
    variant === "pulse"
      ? "absolute top-1/2 left-1/2 w-[36%]"
      : variant === "bounce"
        ? "absolute w-[22%]"
        : "absolute w-[26%]";

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{ backgroundImage: "radial-gradient(60% 50% at 50% 45%, rgba(46,51,57,0.5) 0%, rgba(0,0,0,0) 70%)" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/tuxmat-monogram.png" alt="" className={`${markClass} opacity-90`} style={{ animation: anim }} />
    </div>
  );
}
