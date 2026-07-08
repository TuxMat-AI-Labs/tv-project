"use client";

import { LavaLamp } from "@/components/screensaver/LavaLamp";

// Full brand palette for the overnight lava lamp.
const COLORS = ["#e5c770", "#5ed6d6", "#aa8dec", "#f0a6c8", "#dfba7c", "#7ec8ff"];

/**
 * Overnight pixel-care screensaver: a flowing "lava lamp" of soft colour blobs
 * over black. Everything moves continuously — no static gradient, line, or logo
 * — so no pixel holds a fixed image (an effective screen massage). CSS-only, so
 * it runs safely for days unattended. Once the picker's selection is wired to
 * the backend (handoff #2), pass the chosen `motion` here.
 */
export function Screensaver() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-black">
      <LavaLamp motion="drift" colors={COLORS} blur={72} />
    </div>
  );
}
