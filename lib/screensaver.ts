/**
 * Screensaver style — shared, server-safe definitions (no React/client code) so
 * the content API, the admin setter, the picker, and the player all agree on
 * the same variant keys. The actual rendering config lives in the client
 * `PixelMassager` component; this is just identity + validation + persistence.
 */

export type ScreensaverVariant = "skyline" | "metropolis" | "horizon";

export const DEFAULT_SCREENSAVER_VARIANT: ScreensaverVariant = "skyline";

// Picker metadata, in display order.
export const SCREENSAVER_VARIANTS: { key: ScreensaverVariant; label: string; blurb: string }[] = [
  { key: "skyline", label: "Skyline", blurb: "Steady build" },
  { key: "metropolis", label: "Metropolis", blurb: "Dense & fast" },
  { key: "horizon", label: "Horizon", blurb: "Big & calm" },
];

// The key under which the chosen style is stored in the global Setting table.
export const SCREENSAVER_STYLE_SETTING_KEY = "screensaverStyle";

/** Narrow arbitrary input to a valid variant, falling back to the default. */
export function coerceScreensaverVariant(value: unknown): ScreensaverVariant {
  return SCREENSAVER_VARIANTS.some((v) => v.key === value)
    ? (value as ScreensaverVariant)
    : DEFAULT_SCREENSAVER_VARIANT;
}
