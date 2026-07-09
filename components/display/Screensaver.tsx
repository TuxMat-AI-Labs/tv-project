"use client";

import { PixelMassager } from "@/components/screensaver/PixelMassager";
import { type ScreensaverVariant, DEFAULT_SCREENSAVER_VARIANT } from "@/lib/screensaver";

/**
 * Overnight pixel-care screensaver: the full-screen PixelMassager — an
 * isometric voxel city endlessly building itself out (every block always
 * moving) washed by a constant full-spectrum rainbow sweep so every pixel
 * cycles the complete hue range on a loop. Canvas-based and allocation-free per
 * frame, so it runs safely for days unattended on the Tizen TVs. The `variant`
 * is chosen in the hub picker and delivered by the content API.
 */
export function Screensaver({ variant = DEFAULT_SCREENSAVER_VARIANT }: { variant?: ScreensaverVariant }) {
  return <PixelMassager variant={variant} />;
}
