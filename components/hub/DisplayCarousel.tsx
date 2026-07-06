"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DisplayTile } from "@/components/hub/DisplayTile";
import { StatusCircle } from "@/components/hub/StatusDot";
import type { HubDisplayStatus } from "@/lib/hub/types";

/**
 * A horizontally swipeable row of display tiles with a header (title + optional
 * status circle) and prev/next arrows that appear only when the row overflows.
 * Trackpad/touch swipe works natively via overflow-x; the arrows page by ~a
 * screenful. Shared by RoomSection and the stat pages.
 */
export function DisplayCarousel({
  title,
  online,
  displays,
  tileSize = "default",
  emptyText = "No displays.",
}: {
  title?: string;
  online?: boolean;
  displays: HubDisplayStatus[];
  tileSize?: "default" | "large";
  emptyText?: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [nav, setNav] = useState({ overflow: false, atStart: true, atEnd: false });

  const update = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setNav({
      overflow: el.scrollWidth > el.clientWidth + 4,
      atStart: el.scrollLeft <= 2,
      atEnd: el.scrollLeft + el.clientWidth >= el.scrollWidth - 2,
    });
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(update); // fires once on observe → initial measure
    ro.observe(el);
    el.addEventListener("scroll", update, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", update);
    };
  }, [update]);

  function page(dir: 1 | -1) {
    const el = scrollRef.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: "smooth" });
  }

  const tileWidth = tileSize === "large" ? "w-56 sm:w-64" : "w-40 sm:w-44";

  return (
    <div>
      {(title || nav.overflow) && (
        <div className="mb-5 flex items-center justify-between gap-4">
          {title ? (
            <h2 className="flex items-center gap-2.5 text-lg font-semibold tracking-wide text-foreground uppercase">
              {title}
              {online !== undefined && <StatusCircle online={online} />}
            </h2>
          ) : (
            <span />
          )}
          {nav.overflow && (
            <div className="flex items-center gap-2">
              <CarouselArrow dir="left" disabled={nav.atStart} onClick={() => page(-1)} />
              <CarouselArrow dir="right" disabled={nav.atEnd} onClick={() => page(1)} />
            </div>
          )}
        </div>
      )}

      {displays.length === 0 ? (
        <p className="text-sm text-muted">{emptyText}</p>
      ) : (
        <div
          ref={scrollRef}
          className="no-scrollbar flex snap-x snap-mandatory gap-6 overflow-x-auto scroll-smooth py-3"
        >
          {displays.map((display, i) => (
            <div key={display.id} className={`shrink-0 snap-start ${tileWidth}`}>
              <DisplayTile display={display} index={i} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CarouselArrow({ dir, disabled, onClick }: { dir: "left" | "right"; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={dir === "left" ? "Previous displays" : "Next displays"}
      onClick={onClick}
      disabled={disabled}
      className="glass-btn flex h-8 w-8 items-center justify-center rounded-full disabled:pointer-events-none"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
        <polyline points={dir === "left" ? "15 18 9 12 15 6" : "9 18 15 12 9 6"} />
      </svg>
    </button>
  );
}
