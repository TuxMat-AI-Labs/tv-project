"use client";

import { useEffect, useState, type CSSProperties } from "react";

type Variant = "drift" | "bounce" | "pulse";

// Each option carries its own colour: a hue-rotate that recolours the gold
// monogram plus a matching glow (as "r, g, b"). Together the three panels read
// as three distinct colours instead of one gold.
const OPTIONS: { key: Variant; label: string; blurb: string; hue: number; glow: string }[] = [
  { key: "drift", label: "Drift", blurb: "Slow wander", hue: 0, glow: "223, 186, 124" }, // gold
  { key: "pulse", label: "Pulse", blurb: "Breathing glow", hue: 152, glow: "94, 214, 214" }, // aqua
  { key: "bounce", label: "Bounce", blurb: "Edge to edge", hue: 232, glow: "170, 141, 236" }, // violet
];

const STORAGE_KEY = "tuxdisplay:screensaver";

/**
 * Screensaver picker — three live, full-bleed previews, each in its own colour
 * and animating exactly as it will on the TV. Hovering a panel makes its artwork
 * markedly more vibrant (no outline) and sweeps a band of light across its
 * Activate button, right → left. Tap activates it for the scheduled pixel-care
 * window. Selection persists locally for now (wiring it to displays needs a
 * `screensaverStyle` field on the backend).
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
    <div className="grid h-full grid-cols-3 bg-black">
      {OPTIONS.map((opt, i) => {
        const isActive = active === opt.key;
        return (
          <button
            key={opt.key}
            type="button"
            onClick={() => activate(opt.key)}
            aria-pressed={isActive}
            className={`ss-panel group/panel relative overflow-hidden focus:outline-none ${
              i > 0 ? "border-l border-white/10" : ""
            } ${isActive ? "is-active" : ""}`}
          >
            <ScreensaverStage variant={opt.key} hue={opt.hue} glow={opt.glow} />

            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-center justify-between p-6">
              <span className="flex flex-col text-left">
                <span className="text-base font-semibold tracking-wide text-white uppercase">{opt.label}</span>
                <span className="text-xs tracking-wide text-white/50 uppercase">{opt.blurb}</span>
              </span>
              <span
                className={`ss-activate glass-btn glass-btn--dark rounded-full px-4 py-1.5 text-xs font-medium tracking-wide uppercase ${
                  isActive ? "is-active" : ""
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

function ScreensaverStage({ variant, hue, glow }: { variant: Variant; hue: number; glow: string }) {
  const anim =
    variant === "drift"
      ? "ss-drift 16s ease-in-out infinite alternate"
      : variant === "bounce"
        ? "ss-bounce 15s linear infinite"
        : "ss-pulse 5s ease-in-out infinite";
  const markClass =
    variant === "pulse"
      ? "absolute top-1/2 left-1/2 w-[34%]"
      : variant === "bounce"
        ? "absolute w-[22%]"
        : "absolute w-[26%]";

  return (
    <div
      className="ss-stage absolute inset-0 overflow-hidden"
      style={{ backgroundImage: `radial-gradient(60% 55% at 50% 45%, rgba(${glow}, 0.3) 0%, rgba(0,0,0,0) 70%)` }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/tuxmat-monogram.png"
        alt=""
        className={`${markClass} opacity-95`}
        style={{ animation: anim, filter: `hue-rotate(${hue}deg) drop-shadow(0 0 24px rgba(${glow}, 0.55))` } as CSSProperties}
      />
    </div>
  );
}
