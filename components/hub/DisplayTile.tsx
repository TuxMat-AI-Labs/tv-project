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
const MAX_TILT = 7;

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
        {/* 3D push wrapper — tilts toward the cursor and lifts on hover (Task E). */}
        <div
          onMouseMove={handleMove}
          onMouseLeave={handleLeave}
          className="relative transition-transform duration-200 ease-out will-change-transform"
          style={{
            transformStyle: "preserve-3d",
            transform: `rotateX(${t.rx}deg) rotateY(${t.ry}deg) scale(${t.lift ? 1.045 : 1})`,
            filter: t.lift ? "drop-shadow(0 22px 30px rgba(32,28,22,0.28))" : undefined,
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
