/**
 * Scheduled off-hours state: a plain black screen. Shown evenings/overnight
 * (outside the short pixel-care window) and all weekend — see lib/time.ts
 * `scheduledSurface`. Distinct from InactiveScreen (which flags a display that
 * has nothing configured); this is a deliberate, scheduled dark panel.
 *
 * Note: this only paints black pixels — an LCD's backlight stays lit. For true
 * power/lifetime savings during these hours, also set the panels' own on-device
 * on/off schedule.
 */
export function BlackScreen() {
  return <div className="absolute inset-0 bg-black" />;
}
