"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";

type Variant = "drift" | "bounce" | "pulse";

// Each option carries its own colour: a hue-rotate that recolours the gold
// monogram plus a matching glow (as "r, g, b").
const OPTIONS: { key: Variant; label: string; blurb: string; hue: number; glow: string }[] = [
  { key: "drift", label: "Drift", blurb: "Slow wander", hue: 0, glow: "223, 186, 124" }, // gold
  { key: "pulse", label: "Pulse", blurb: "Breathing glow", hue: 152, glow: "94, 214, 214" }, // aqua
  { key: "bounce", label: "Bounce", blurb: "Edge to edge", hue: 232, glow: "170, 141, 236" }, // violet
];

// Deterministic colourful pixel cubes (fixed so SSR and client match). A mix of
// hues keeps every panel lively and colourful, not just the monogram's tint.
const CUBES: { x: number; y: number; s: number; c: string; d: number; dur: number }[] = [
  { x: 14, y: 20, s: 16, c: "#dfba7c", d: 0.0, dur: 6.0 },
  { x: 80, y: 28, s: 10, c: "#5ed6d6", d: 1.1, dur: 7.2 },
  { x: 26, y: 68, s: 13, c: "#aa8dec", d: 0.6, dur: 8.1 },
  { x: 68, y: 64, s: 15, c: "#f0a6c8", d: 1.8, dur: 6.6 },
  { x: 46, y: 14, s: 8, c: "#7ec8ff", d: 0.3, dur: 7.6 },
  { x: 88, y: 80, s: 9, c: "#ffd27e", d: 2.2, dur: 6.1 },
  { x: 8, y: 48, s: 11, c: "#8affc1", d: 1.4, dur: 8.4 },
  { x: 58, y: 86, s: 12, c: "#5ed6d6", d: 0.9, dur: 7.0 },
  { x: 36, y: 40, s: 7, c: "#f0a6c8", d: 2.6, dur: 6.8 },
  { x: 74, y: 46, s: 10, c: "#aa8dec", d: 0.5, dur: 7.9 },
];

const STORAGE_KEY = "tuxdisplay:screensaver";

/**
 * Screensaver picker — three vibrant, colourful, full-bleed previews separated by
 * thin white lines. Hovering (or selecting) a panel makes its artwork vibrant.
 * The Activate control is a charging health bar: it fills left → right on hover,
 * and clicking a panel charges it to full, activates the style, then returns to
 * the dashboard. Selection persists locally for now (see handoff #2).
 */
export function ScreensaverPicker() {
  const router = useRouter();
  const [active, setActive] = useState<Variant | null>(null);
  const [committing, setCommitting] = useState<Variant | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActive(localStorage.getItem(STORAGE_KEY) as Variant | null);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function commit(key: Variant) {
    if (committing) return;
    setCommitting(key);
    setActive(key);
    localStorage.setItem(STORAGE_KEY, key);
    // Let the health bar charge to full, then return to the dashboard.
    timerRef.current = setTimeout(() => router.push("/hub"), 950);
  }

  return (
    <div className="grid h-full grid-cols-3 bg-black">
      {OPTIONS.map((opt, i) => {
        const isActive = active === opt.key;
        const isCommitting = committing === opt.key;
        return (
          <button
            key={opt.key}
            type="button"
            onClick={() => commit(opt.key)}
            aria-pressed={isActive}
            className={`ss-panel group/panel relative overflow-hidden focus:outline-none ${
              i > 0 ? "border-l border-white/40" : ""
            } ${isActive ? "is-active" : ""}`}
          >
            <ScreensaverStage variant={opt.key} hue={opt.hue} glow={opt.glow} />

            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col gap-3 p-6">
              <span className="flex flex-col text-left">
                <span className="text-base font-semibold tracking-wide text-white uppercase">{opt.label}</span>
                <span className="text-xs tracking-wide text-white/50 uppercase">{opt.blurb}</span>
              </span>
              <span className="ss-charge glass-btn glass-btn--dark block w-full rounded-full px-4 py-2 text-center">
                <span className={`ss-charge-fill ${isActive || isCommitting ? "is-full" : ""}`} />
                <span className="ss-charge-label text-xs font-semibold tracking-[0.2em] text-white uppercase">
                  {isCommitting ? "Activating…" : isActive ? "Active" : "Activate"}
                </span>
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
      ? "absolute top-1/2 left-1/2 w-[32%]"
      : variant === "bounce"
        ? "absolute w-[22%]"
        : "absolute w-[26%]";

  return (
    <div
      className="ss-stage absolute inset-0 overflow-hidden"
      style={{ backgroundImage: `radial-gradient(60% 55% at 50% 45%, rgba(${glow}, 0.34) 0%, rgba(0,0,0,0) 70%)` }}
    >
      {CUBES.map((c, idx) => (
        <span
          key={idx}
          className="ss-cube"
          style={{
            left: `${c.x}%`,
            top: `${c.y}%`,
            width: c.s,
            height: c.s,
            background: c.c,
            boxShadow: `0 0 ${c.s}px ${c.c}`,
            animationDuration: `${c.dur}s`,
            animationDelay: `${c.d}s`,
          }}
        />
      ))}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/tuxmat-monogram.png"
        alt=""
        className={`${markClass} opacity-95`}
        style={{ animation: anim, filter: `hue-rotate(${hue}deg) drop-shadow(0 0 24px rgba(${glow}, 0.6))` } as CSSProperties}
      />
    </div>
  );
}
