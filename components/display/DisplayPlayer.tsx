"use client";

import { useEffect } from "react";
import { useDisplayContent } from "@/lib/display/useDisplayContent";
import { PlaylistPlayer } from "@/components/display/PlaylistPlayer";
import { CarouselPlayer } from "@/components/display/CarouselPlayer";
import { Screensaver } from "@/components/display/Screensaver";
import { InactiveScreen } from "@/components/display/InactiveScreen";
import { BlackScreen } from "@/components/display/BlackScreen";
import { ViewportFaultBanner } from "@/components/display/ViewportFaultBanner";

/**
 * The full-screen TV player: polls a Display's content by slug and renders the
 * playlist, screensaver, or inactive state. Shared by the per-slug route
 * (`/display/[slug]`) and the paired `/tv` entry so both behave identically.
 */
export function DisplayPlayer({ slug }: { slug: string }) {
  const { data, reportHeartbeat, viewportFaults } = useDisplayContent(slug);

  useEffect(() => {
    if (data && data.mode !== "playlist" && data.mode !== "carousel") reportHeartbeat(null);
  }, [data, reportHeartbeat]);

  if (!data) return null;

  const content =
    data.mode === "carousel" && data.carousel?.ring.length ? (
      <CarouselPlayer
        carousel={data.carousel}
        contentFit={data.contentFit ?? "COVER"}
        transition={data.carouselTransition}
        onCurrentItemChange={reportHeartbeat}
      />
    ) : data.mode === "playlist" && data.playlist?.length ? (
      <PlaylistPlayer
        playlist={data.playlist}
        contentFit={data.contentFit ?? "COVER"}
        transition={data.carouselTransition}
        onCurrentItemChange={reportHeartbeat}
      />
    ) : data.mode === "screensaver" ? (
      <Screensaver variant={data.screensaverStyle} />
    ) : data.mode === "black" ? (
      <BlackScreen />
    ) : (
      <InactiveScreen />
    );

  return (
    <>
      {content}
      {/* Over every mode, not only the playlist. A screen that has fallen out of
          kiosk mode is just as wrong while it is showing the screensaver — and
          that is precisely when nobody would otherwise notice. */}
      <ViewportFaultBanner faults={viewportFaults} />
    </>
  );
}
