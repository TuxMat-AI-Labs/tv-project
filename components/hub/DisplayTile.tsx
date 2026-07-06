"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useState, type CSSProperties } from "react";
import { TVFrame } from "@/components/hub/TVFrame";
import { StatusCircle } from "@/components/hub/StatusDot";
import type { HubDisplayStatus } from "@/lib/hub/types";

const MODE_LABEL: Record<HubDisplayStatus["mode"], string> = {
  playlist: "Playing",
  screensaver: "Screensaver",
  inactive: "Inactive",
};

// Max degrees the tile rotates toward the cursor on hover (Task E).
const MAX_TILT = 5;

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function DisplayTile({
  display,
  index = 0,
}: {
  display: HubDisplayStatus;
  index?: number;
}) {
  // rx/ry are the live rotation; `lift` toggles the scale/shadow push.
  const [t, setT] = useState({ rx: 0, ry: 0, lift: false });

  function handleMove(e: React.MouseEvent<HTMLDivElement>) {
    if (prefersReducedMotion()) return;
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5; // -0.5 … 0.5
    const py = (e.clientY - r.top) / r.height - 0.5;
    setT({ ry: px * MAX_TILT * 2, rx: -py * MAX_TILT * 2, lift: true });
  }

  function handleLeave() {
    setT({ rx: 0, ry: 0, lift: false });
  }

  return (
    <Link href={`/hub/displays/${display.id}`} className="group block" scroll={false}>
      <motion.div layoutId={`display-frame-${display.id}`} style={{ perspective: 900 }}>
        {/* Stage: holds the soft ground shadow behind the TV and the lift wrapper. */}
        <div className="relative">
          {/* Ambient shadow — a soft radial that fades fully to transparent (no
              edges, no rectangle), sitting BEHIND the TV. It does not tilt with
              the TV, and its gradient never resolves to a line, so it can't bleed
              a hard edge into the caption below. Fades in and grounds on lift. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 transition-all duration-300 ease-out"
            style={{
              background: "radial-gradient(58% 52% at 50% 58%, rgba(18,14,9,0.55) 0%, rgba(18,14,9,0) 70%)",
              filter: "blur(20px)",
              opacity: t.lift ? 1 : 0,
              transform: t.lift ? "translateY(10px) scale(1)" : "translateY(2px) scale(0.9)",
            }}
          />
          {/* Lift wrapper — the bezel + screen live on one plane here, so they
              rise toward you and tilt together as a single solid object. */}
          <div
            onMouseMove={handleMove}
            onMouseLeave={handleLeave}
            className="relative transition-transform duration-200 ease-out will-change-transform"
            style={{
              transformStyle: "preserve-3d",
              transform: `rotateX(${t.rx}deg) rotateY(${t.ry}deg) translateY(${t.lift ? -6 : 0}px) scale(${t.lift ? 1.03 : 1})`,
            }}
          >
            <TVFrame>
              {/* Screen content — wakes with the staggered power-on (Task F). */}
              <div
                className="screen-content absolute inset-0 z-0"
                style={{ "--tile-index": index } as CSSProperties}
              >
                {display.currentContent?.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={display.currentContent.thumbnailUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[9px] tracking-[0.25em] text-white/70 uppercase">
                    {MODE_LABEL[display.mode]}
                  </div>
                )}
              </div>
              {/* Bright wake line for the power-on (Task F). */}
              <span
                className="screen-flash pointer-events-none absolute inset-0 z-30"
                style={{ "--tile-index": index } as CSSProperties}
              />
              {/* Hover edge glow. */}
              <span className="pointer-events-none absolute inset-0 z-20 ring-1 ring-inset ring-transparent transition group-hover:ring-gold/50" />
            </TVFrame>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between gap-2">
          <p className="truncate text-sm font-medium text-foreground">
            Display <span className="text-gold">{display.number}</span>
          </p>
          <StatusCircle online={display.online} />
        </div>
      </motion.div>
    </Link>
  );
}
