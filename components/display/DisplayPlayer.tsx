"use client";

import { useEffect } from "react";
import { useDisplayContent } from "@/lib/display/useDisplayContent";
import { PlaylistPlayer } from "@/components/display/PlaylistPlayer";
import { CarouselPlayer } from "@/components/display/CarouselPlayer";
import { Screensaver } from "@/components/display/Screensaver";
import { InactiveScreen } from "@/components/display/InactiveScreen";

/**
 * The full-screen TV player: polls a Display's content by slug and renders the
 * playlist, screensaver, or inactive state. Shared by the per-slug route
 * (`/display/[slug]`) and the paired `/tv` entry so both behave identically.
 */
export function DisplayPlayer({ slug }: { slug: string }) {
  const { data, reportHeartbeat } = useDisplayContent(slug);

  useEffect(() => {
    if (data && data.mode !== "playlist" && data.mode !== "carousel") reportHeartbeat(null);
  }, [data, reportHeartbeat]);

  if (!data) return null;

  if (data.mode === "carousel" && data.carousel?.ring.length) {
    return (
      <CarouselPlayer
        carousel={data.carousel}
        contentFit={data.contentFit ?? "COVER"}
        onCurrentItemChange={reportHeartbeat}
      />
    );
  }

  if (data.mode === "playlist" && data.playlist?.length) {
    return (
      <PlaylistPlayer
        playlist={data.playlist}
        contentFit={data.contentFit ?? "COVER"}
        onCurrentItemChange={reportHeartbeat}
      />
    );
  }

  if (data.mode === "screensaver") {
    return <Screensaver variant={data.screensaverStyle} />;
  }

  return <InactiveScreen />;
}
