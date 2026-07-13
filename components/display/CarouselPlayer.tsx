"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { CarouselPayload } from "@/lib/display/resolveRoomCarousel";
import type { CarouselTransition } from "@/lib/display/transition";

const FIT_TO_OBJECT_FIT: Record<"COVER" | "CONTAIN" | "FILL", string> = {
  COVER: "cover",
  CONTAIN: "contain",
  FILL: "fill",
};

// Same "whip" curve as the single-screen PlaylistPlayer so a push reads the
// same everywhere. Content moves toward lower display numbers, so on every
// screen the incoming graphic enters from the right and the outgoing exits
// left — across the wall that reads as one continuous leftward conveyor.
const SLIDE_TRANSITION = { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const };

// Soft crossfade "bleed" between images — both layers overlap and blend
// instead of pushing past each other.
const FADE_TRANSITION = { duration: 1, ease: "easeInOut" as const };

const TRANSITION_VARIANTS: Record<
  CarouselTransition,
  { initial: Record<string, string | number>; animate: Record<string, string | number>; exit: Record<string, string | number>; transition: typeof SLIDE_TRANSITION | typeof FADE_TRANSITION }
> = {
  SLIDE: { initial: { x: "100%" }, animate: { x: 0 }, exit: { x: "-100%" }, transition: SLIDE_TRANSITION },
  FADE: { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: FADE_TRANSITION },
};

function ringItem(carousel: CarouselPayload, tick: number) {
  const n = carousel.ring.length;
  return carousel.ring[(((carousel.position + tick) % n) + n) % n];
}

/**
 * One screen of the synchronized video-wall carousel. Every display in the
 * room runs this against the same server-anchored beat: it renders its current
 * ring item and, exactly `msUntilNextRotation` later (a server-derived delay,
 * timed with a local setTimeout so an unreliable TV clock can't skew it),
 * pushes to the next item. Because all screens fire off the same server delta,
 * they slide and land together. Re-anchors to the server on every poll refresh.
 */
export function CarouselPlayer({
  carousel,
  contentFit,
  transition = "SLIDE",
  onCurrentItemChange,
}: {
  carousel: CarouselPayload;
  contentFit: "COVER" | "CONTAIN" | "FILL";
  transition?: CarouselTransition;
  onCurrentItemChange?: (id: string | null) => void;
}) {
  const [tick, setTick] = useState(carousel.tick);
  // Every setTick below also writes tickRef, so the ref never goes stale.
  const tickRef = useRef(tick);

  // Preload every ring image once so an incoming slide never flashes blank
  // mid-push (the whole point is no empty gap between one ad and the next).
  useEffect(() => {
    for (const item of carousel.ring) {
      if (item.type === "IMAGE") {
        const img = new window.Image();
        img.src = item.fileUrl;
      }
    }
  }, [carousel.ring]);

  // Drive the local ticker off the server's timing. This effect re-runs on
  // every poll (tick / msUntilNextRotation change), snapping the displayed
  // tick to the server's and re-scheduling the next push from the fresh
  // server-derived delay — so long-run drift is corrected each beat.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: snap the local ticker to the server beat on every poll
    setTick(carousel.tick);
    tickRef.current = carousel.tick;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const step = (delay: number) => {
      timer = setTimeout(() => {
        if (cancelled) return;
        const next = tickRef.current + 1;
        tickRef.current = next;
        setTick(next);
        step(carousel.periodMs);
      }, delay);
    };
    step(carousel.msUntilNextRotation);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [carousel.tick, carousel.msUntilNextRotation, carousel.periodMs]);

  const current = ringItem(carousel, tick);

  useEffect(() => {
    onCurrentItemChange?.(current?.id ?? null);
  }, [current?.id, onCurrentItemChange]);

  if (!current) return null;

  const objectFit = FIT_TO_OBJECT_FIT[contentFit] as React.CSSProperties["objectFit"];
  const variant = TRANSITION_VARIANTS[transition];

  return (
    <div className="absolute inset-0 overflow-hidden bg-black">
      <AnimatePresence initial={false}>
        <motion.div
          key={tick}
          className="absolute inset-0"
          initial={variant.initial}
          animate={variant.animate}
          exit={variant.exit}
          transition={variant.transition}
        >
          {current.type === "IMAGE" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={current.fileUrl} alt="" className="h-full w-full" style={{ objectFit }} />
          ) : (
            <video
              src={current.fileUrl}
              poster={current.thumbnailUrl ?? undefined}
              className="h-full w-full"
              style={{ objectFit }}
              autoPlay
              muted
              loop
              playsInline
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
