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
  titleAction,
}: {
  title?: string;
  online?: boolean;
  displays: HubDisplayStatus[];
  tileSize?: "default" | "large";
  emptyText?: string;
  titleAction?: React.ReactNode;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const [nav, setNav] = useState({ overflow: false, atStart: true, atEnd: false });

  // Measure once, and only re-render when a nav value actually flips — so
  // scrolling doesn't fire a setState on every frame (that caused the jitter).
  const update = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const next = {
      overflow: el.scrollWidth > el.clientWidth + 4,
      atStart: el.scrollLeft <= 2,
      atEnd: el.scrollLeft + el.clientWidth >= el.scrollWidth - 2,
    };
    setNav((prev) =>
      prev.overflow === next.overflow && prev.atStart === next.atStart && prev.atEnd === next.atEnd ? prev : next
    );
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    // Coalesce scroll events to one measurement per animation frame.
    const onScroll = () => {
      if (rafRef.current != null) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        update();
      });
    };
    const ro = new ResizeObserver(update); // fires once on observe → initial measure
    ro.observe(el);
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", onScroll);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [update]);

  function page(dir: 1 | -1) {
    const el = scrollRef.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: "smooth" });
  }

  // Tiles share one HEIGHT regardless of orientation so a row of mixed
  // portrait/landscape panels lines up (tops + bottoms aligned), like TVs hung
  // at the same height. A landscape (16:9) tile of the same height as a portrait
  // (9:16) one is ~3.05× as wide — the carousel scrolls, so the width is fine.
  const tileWidths =
    tileSize === "large"
      ? { PORTRAIT: "w-56 sm:w-64", LANDSCAPE: "w-[42.65rem] sm:w-[48.75rem]" }
      : { PORTRAIT: "w-40 sm:w-44", LANDSCAPE: "w-[30.5rem] sm:w-[33.5rem]" };

  return (
    <div>
      {(title || nav.overflow) && (
        <div className="mb-5 flex items-center justify-between gap-4">
          {title ? (
            <h2 className="flex items-center gap-2.5 text-lg font-semibold tracking-wide text-foreground uppercase">
              {title}
              {online !== undefined && <StatusCircle online={online} />}
              {titleAction}
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
          className="no-scrollbar flex gap-6 overflow-x-auto scroll-smooth px-2 py-10 overscroll-x-contain"
        >
          {displays.map((display, i) => (
            <div key={display.id} className={`shrink-0 ${tileWidths[display.orientation] ?? tileWidths.PORTRAIT}`}>
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
