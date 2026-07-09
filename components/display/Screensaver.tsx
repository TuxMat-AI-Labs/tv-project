"use client";

import { PixelMassager } from "@/components/screensaver/PixelMassager";

/**
 * Overnight pixel-care screensaver: the full-screen PixelMassager — an
 * isometric voxel city endlessly building itself out, washed by a constant
 * full-spectrum rainbow sweep so every pixel cycles the complete hue range on
 * a loop. Canvas-based and allocation-free per frame, so it runs safely for
 * days unattended on the Tizen TVs. (The previous CSS LavaLamp still powers
 * the /hub/screensaver picker previews.)
 */
export function Screensaver() {
  return <PixelMassager />;
}
