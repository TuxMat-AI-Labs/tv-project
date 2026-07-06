"use client";

import { useEffect, useRef, useState } from "react";
import type { PlaylistItem } from "@/lib/display/resolveContentForDisplay";

const FIT_TO_OBJECT_FIT: Record<"COVER" | "CONTAIN" | "FILL", string> = {
  COVER: "cover",
  CONTAIN: "contain",
  FILL: "fill",
};

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

  useEffect(() => {
    if (!current || current.type !== "IMAGE") return;
    const timer = setTimeout(() => {
      setIndex((i) => (i + 1) % playlist.length);
    }, current.durationSec * 1000);
    return () => clearTimeout(timer);
  }, [current, playlist.length]);

  if (!current) return null;

  const objectFit = FIT_TO_OBJECT_FIT[contentFit];

  return (
    <div className="absolute inset-0 bg-black">
      {current.type === "IMAGE" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={current.id}
          src={current.fileUrl}
          alt=""
          className="h-full w-full"
          style={{ objectFit: objectFit as React.CSSProperties["objectFit"] }}
        />
      ) : (
        <video
          key={current.id}
          src={current.fileUrl}
          className="h-full w-full"
          style={{ objectFit: objectFit as React.CSSProperties["objectFit"] }}
          autoPlay
          muted
          playsInline
          onEnded={() => setIndex((i) => (i + 1) % playlist.length)}
        />
      )}
    </div>
  );
}
