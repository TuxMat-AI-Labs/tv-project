"use client";

import { useEffect } from "react";
import { useDisplayContent } from "@/lib/display/useDisplayContent";
import { PlaylistPlayer } from "@/components/display/PlaylistPlayer";
import { CarouselPlayer } from "@/components/display/CarouselPlayer";
import { Screensaver } from "@/components/display/Screensaver";
import { InactiveScreen } from "@/components/display/InactiveScreen";
import { BlackScreen } from "@/components/display/BlackScreen";
import { ViewportFaultBanner } from "@/components/display/ViewportFaultBanner";
import { CalibrationOverlay } from "@/components/display/CalibrationOverlay";

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

  // Underscan compensation. 100 (the default, and every display until someone
  // changes one) renders exactly as before — this whole branch is inert.
  //
  // Below 100 the content is drawn into a smaller centred box on black, to
  // cancel out a panel that magnifies what it is handed and crops its own
  // edges. Done by SIZING the box, not by `transform: scale()`: a transform on
  // a full-screen element allocates a large composited layer on a TV that is
  // never restarted, which is the same thing suspected of crashing Display 1.
  // Sizing costs nothing and the content lays out correctly inside it, so the
  // images stay sharp instead of being a scaled bitmap.
  const scale = Math.min(100, Math.max(50, data.contentScale ?? 100));
  const inset = scale >= 100 ? null : `${(100 - scale) / 2}%`;

  return (
    <>
      {inset ? (
        <div className="absolute inset-0 overflow-hidden bg-black">
          <div className="absolute" style={{ top: inset, bottom: inset, left: inset, right: inset }}>
            {content}
          </div>
        </div>
      ) : (
        content
      )}
      {/* Over every mode, not only the playlist. A screen that has fallen out of
          kiosk mode is just as wrong while it is showing the screensaver — and
          that is precisely when nobody would otherwise notice.
          Outside the inset box on purpose: the markers measure what the PANEL
          does to the full viewport, so shrinking them with the content would
          destroy the very thing they exist to measure. */}
      {data?.calibration && <CalibrationOverlay />}
      <ViewportFaultBanner faults={viewportFaults} />
    </>
  );
}
