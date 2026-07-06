"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LavaLamp } from "@/components/screensaver/LavaLamp";

type Variant = "drift" | "bounce" | "pulse";

const OPTIONS: { key: Variant; label: string; blurb: string }[] = [
  { key: "drift", label: "Drift", blurb: "Slow wander" },
  { key: "pulse", label: "Pulse", blurb: "Breathing glow" },
  { key: "bounce", label: "Bounce", blurb: "Edge to edge" },
];

// Each variation gets its own colour family so the three read as distinct at a
// glance; the motion (drift/pulse/bounce) is what actually differs on the TV.
const PALETTES: Record<Variant, string[]> = {
  drift: ["#e5c770", "#dfba7c", "#c9962f", "#f0d9a0"], // warm gold
  pulse: ["#5ed6d6", "#7ec8ff", "#4aa3c7", "#a0e8e8"], // cool aqua
  bounce: ["#aa8dec", "#f0a6c8", "#c78dec", "#e8b8ff"], // violet
};

const STORAGE_KEY = "tuxdisplay:screensaver";

/**
 * Screensaver picker — three full-bleed, flowing "lava lamp" previews separated
 * by thin white lines, each in its own colour family and motion. Hovering (or
 * selecting) a panel makes it more vibrant. The Activate control is a charging
 * health bar that fills left → right; clicking a panel charges it, activates the
 * style, then returns to the dashboard. Selection persists locally (see handoff #2).
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
            <div className="ss-stage absolute inset-0">
              <LavaLamp motion={opt.key} colors={PALETTES[opt.key]} blur={26} />
            </div>

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
