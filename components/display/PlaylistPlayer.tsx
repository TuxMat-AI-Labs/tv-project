"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { PlaylistItem } from "@/lib/display/resolveContentForDisplay";

const FIT_TO_OBJECT_FIT: Record<"COVER" | "CONTAIN" | "FILL", string> = {
  COVER: "cover",
  CONTAIN: "contain",
  FILL: "fill",
};

// Fast-out, gentle-settle "whip" easing — the outgoing and incoming slides run
// this same curve in lockstep, so the incoming edge always meets the outgoing
// edge exactly (no gap, no overlap) at every point in the animation.
const SLIDE_TRANSITION = { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const };

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
  onCurrentItemChange,
}: {
  playlist: PlaylistItem[];
  contentFit: "COVER" | "CONTAIN" | "FILL";
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

  return (
    <div className="absolute inset-0 overflow-hidden bg-black">
      <AnimatePresence initial={false}>
        <motion.div
          key={`${index}-${current.id}`}
          className="absolute inset-0"
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "-100%" }}
          transition={SLIDE_TRANSITION}
        >
          {current.type === "IMAGE" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={current.fileUrl} alt="" className="h-full w-full" style={{ objectFit }} />
          ) : (
            <video
              src={current.fileUrl}
              className="h-full w-full"
              style={{ objectFit }}
              autoPlay
              muted
              playsInline
              onEnded={advance}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
