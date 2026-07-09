"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PixelMassager } from "@/components/screensaver/PixelMassager";
import {
  type ScreensaverVariant,
  SCREENSAVER_VARIANTS,
  DEFAULT_SCREENSAVER_VARIANT,
} from "@/lib/screensaver";

/**
 * Screensaver picker — three full-bleed pixel-massager previews (the exact
 * voxel-city motion that plays on the TVs) separated by thin white lines, each
 * a distinct variant. Hovering (or selecting) a panel makes it more vibrant.
 * The Activate control is a charging health bar that fills left → right;
 * clicking a panel charges it, persists the choice to the backend (so it
 * actually drives the TVs on their next screensaver window), then returns to
 * the dashboard.
 */
export function ScreensaverPicker() {
  const router = useRouter();
  const [active, setActive] = useState<ScreensaverVariant | null>(null);
  const [committing, setCommitting] = useState<ScreensaverVariant | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    // Load the current server-side selection so the picker reflects what the
    // TVs are actually showing (falls back to the default on any error).
    fetch("/api/admin/screensaver", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (cancelled) return;
        setActive((json?.style as ScreensaverVariant) ?? DEFAULT_SCREENSAVER_VARIANT);
      })
      .catch(() => {
        if (!cancelled) setActive(DEFAULT_SCREENSAVER_VARIANT);
      });
    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function commit(key: ScreensaverVariant) {
    if (committing) return;
    setCommitting(key);
    setActive(key);
    // Persist (fire-and-forget — the charge animation covers the round-trip).
    fetch("/api/admin/screensaver", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ style: key }),
    }).catch(() => {});
    // Let the health bar charge to full, then return to the dashboard.
    timerRef.current = setTimeout(() => router.push("/hub"), 950);
  }

  return (
    <div className="grid h-full grid-cols-3 bg-black">
      {SCREENSAVER_VARIANTS.map((opt, i) => {
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
              <PixelMassager variant={opt.key} />
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
