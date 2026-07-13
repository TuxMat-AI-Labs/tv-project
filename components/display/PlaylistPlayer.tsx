"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { PlaylistItem } from "@/lib/display/resolveContentForDisplay";
import type { CarouselTransition } from "@/lib/display/transition";

const FIT_TO_OBJECT_FIT: Record<"COVER" | "CONTAIN" | "FILL", string> = {
  COVER: "cover",
  CONTAIN: "contain",
  FILL: "fill",
};

// Fast-out, gentle-settle "whip" easing — the outgoing and incoming slides run
// this same curve in lockstep, so the incoming edge always meets the outgoing
// edge exactly (no gap, no overlap) at every point in the animation.
const SLIDE_TRANSITION = { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const };

// Soft crossfade "bleed" between images — both layers overlap and blend
// instead of pushing past each other.
const FADE_TRANSITION = { duration: 1, ease: "easeInOut" as const };

const TRANSITION_VARIANTS: Record<
  CarouselTransition,
  {
    initial: Record<string, string | number>;
    animate: Record<string, string | number>;
    exit: Record<string, string | number>;
    transition: typeof SLIDE_TRANSITION | typeof FADE_TRANSITION;
  }
> = {
  SLIDE: { initial: { x: "100%" }, animate: { x: 0 }, exit: { x: "-100%" }, transition: SLIDE_TRANSITION },
  FADE: { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: FADE_TRANSITION },
};

function preloadImage(url: string) {
  return new Promise<void>((resolve) => {
    const img = new window.Image();
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = url;
  });
}

export function PlaylistPlayer({
  playlist,
  contentFit,
  transition = "SLIDE",
  onCurrentItemChange,
}: {
  playlist: PlaylistItem[];
  contentFit: "COVER" | "CONTAIN" | "FILL";
  transition?: CarouselTransition;
  onCurrentItemChange?: (id: string | null) => void;
}) {
  const [index, setIndex] = useState(0);
  const prevIdsRef = useRef<string>("");
  const advancingRef = useRef(false);

  const ids = playlist.map((item) => item.id).join(",");
  useEffect(() => {
    if (ids !== prevIdsRef.current) {
      prevIdsRef.current = ids;
      setIndex(0);
    }
  }, [ids]);

  const current = playlist[index] ?? null;

  useEffect(() => {
    onCurrentItemChange?.(current?.id ?? null);
  }, [current?.id, onCurrentItemChange]);

  // Advances to the next slide, sliding it in with a "push" transition. For
  // images we preload the next file first so the incoming slide never shows a
  // blank/loading frame mid-whip — the whole point is no empty space between
  // one ad and the next.
  const advance = useCallback(async () => {
    if (advancingRef.current || playlist.length === 0) return;
    advancingRef.current = true;
    const nextIndex = (index + 1) % playlist.length;
    const next = playlist[nextIndex];
    if (next?.type === "IMAGE") await preloadImage(next.fileUrl);
    setIndex(nextIndex);
    advancingRef.current = false;
  }, [index, playlist]);

  useEffect(() => {
    if (!current || current.type !== "IMAGE") return;
    const timer = setTimeout(advance, current.durationSec * 1000);
    return () => clearTimeout(timer);
  }, [current, advance]);

  if (!current) return null;

  const objectFit = FIT_TO_OBJECT_FIT[contentFit] as React.CSSProperties["objectFit"];
  const variant = TRANSITION_VARIANTS[transition];

  return (
    <div className="absolute inset-0 overflow-hidden bg-black">
      <AnimatePresence initial={false}>
        <motion.div
          key={`${index}-${current.id}`}
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
              playsInline
              // Sole item: loop it (no next slide to advance to, and re-selecting
              // the same index wouldn't remount/replay it). Multi-item: don't
              // loop — 'ended' drives the push-slide to the next ad.
              loop={playlist.length === 1}
              onEnded={advance}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
