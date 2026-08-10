"use client";

import { ScaledWebpage } from "@/components/display/ScaledWebpage";

/**
 * Live render of an assigned WEBPAGE for a hub dashboard tile.
 *
 * A webpage has no thumbnail, so without this the wall could only show the word
 * "Playing" over black and every dashboard screen looked identical.
 *
 * Shares ScaledWebpage with the TV player, so a tile is a true miniature of the
 * wall: the page lays out at the panel's native resolution and is scaled down,
 * rather than being handed the tile's own ~250px width (which would trip the
 * page's mobile breakpoints and preview a layout no TV ever shows).
 *
 * `lazy` matters here and not on the TV — the hub draws one of these per screen,
 * so they only mount as their tile scrolls into view.
 */
export function WebpagePreview({
  src,
  orientation,
  title,
}: {
  src: string;
  orientation: "PORTRAIT" | "LANDSCAPE";
  title: string;
}) {
  return <ScaledWebpage src={src} title={title} orientation={orientation} lazy />;
}
