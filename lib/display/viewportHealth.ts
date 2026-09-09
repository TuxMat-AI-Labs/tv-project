/**
 * Is this screen actually showing its content correctly?
 *
 * A display can be online, paired, and on the right item, and still be wrong on
 * the wall. Two ways, both seen on the Samsung panels:
 *
 *   1. The browser zoom drifts off 100%. It comes back on its own after being
 *      reset, so it is not a one-time misconfiguration.
 *   2. The browser drops out of kiosk into a windowed browser, so a toolbar eats
 *      the top of the panel and the content is squeezed into what is left.
 *
 * Neither moves anything the hub was already watching — the heartbeat is fresh,
 * the content id is right — so a screen in either state read as perfectly
 * healthy. This is the rule that catches them.
 *
 * ── How the zoom is detected ──────────────────────────────────────────────
 *
 * Measured on the hardware with a throwaway diagnostic page, at two zoom levels
 * on the same panel:
 *
 *              innerWidth  innerHeight  visualViewport.scale  devicePixelRatio
 *   zoom 125%     864         1350              1                  1.25
 *   zoom 100%    1080         1688              1                  1
 *   screen.width x height 1080x1920 at both; outerWidth x outerHeight likewise
 *
 * So this browser's zoom RESIZES THE CSS VIEWPORT and raises devicePixelRatio to
 * match, leaving `visualViewport.scale` at 1. `screen.width` does not move with
 * zoom, which is what makes it a usable reference:
 *
 *     zoom = screen.width / window.innerWidth
 *
 * 1080/864 = 1.25 exactly, and 1080/1080 = 1 when correct.
 *
 * Width, not height, because the browser's toolbar eats HEIGHT — mixing the two
 * would conflate zoom with being out of kiosk, and they need different fixes.
 *
 * ── Why this cannot simply assert a verdict ───────────────────────────────
 *
 * `screen.width` is not reported the same way everywhere. On this hardware it is
 * zoom-independent, which is the whole basis of the ratio. A browser that reports
 * it in CSS pixels instead would shrink it in step with `innerWidth` and the
 * ratio would sit at 1 however zoomed it was — no false alarm, but no detection
 * either. So a "healthy" verdict here means "nothing detectable is wrong", and
 * the raw numbers are always carried alongside so a person can see the case the
 * rule did not anticipate.
 */

export type ViewportReport = {
  viewportWidth: number | null;
  viewportHeight: number | null;
  screenWidth: number | null;
  screenHeight: number | null;
  pixelRatio: number | null;
};

export type ViewportFault =
  /**
   * `short` is for the TV itself and `detail` for the hub.
   *
   * They are not the same job. On the panel this competes with the content for
   * space and is read by whoever is standing there, so it has to fit on one line
   * and say only what to do. In the hub it is read by someone deciding whether
   * to walk over, so it can afford the numbers and the reasoning.
   */
  { kind: "NOT_FULLSCREEN"; missingPx: number; short: string; detail: string };

/**
 * Browser chrome under this is not worth reporting. A toolbar is ~230px on a
 * 1920-tall panel; a few pixels of difference is rounding, or a panel whose
 * reported screen height includes something the page never gets.
 */
const CHROME_TOLERANCE_PX = 32;

/** Read the live viewport. Must run in the TOP-LEVEL TV window. */
export function measureViewport(): ViewportReport {
  if (typeof window === "undefined") {
    return {
      viewportWidth: null,
      viewportHeight: null,
      screenWidth: null,
      screenHeight: null,
      pixelRatio: null,
    };
  }
  return {
    viewportWidth: Math.round(window.innerWidth) || null,
    viewportHeight: Math.round(window.innerHeight) || null,
    screenWidth: Math.round(window.screen?.width ?? 0) || null,
    screenHeight: Math.round(window.screen?.height ?? 0) || null,
    pixelRatio: window.devicePixelRatio || null,
  };
}

/**
 * @returns every fault detectable from one report, most serious first. Empty
 *   means nothing detectable is wrong — see the caveat above.
 */
export function faultsFor(r: ViewportReport | null | undefined): ViewportFault[] {
  if (!r?.viewportWidth || !r.screenWidth) return [];

  const faults: ViewportFault[] = [];

  // Match the screen's axes to the VIEWPORT's orientation before comparing.
  //
  // A landscape-mounted panel may report `screen` in its native portrait
  // (1080x1920) while handing the page a 1920x1080 viewport. Comparing
  // screen.width to innerWidth then gives 1080/1920 = 0.56 and the rule
  // reports "zoom 56%" plus 1313px of phantom toolbar on a perfectly healthy
  // screen. Flagging a good wall is worse than missing a bad one, so the
  // comparison is made orientation-independent.
  //
  // Still width-for-zoom and height-for-chrome, just resolved per orientation:
  // the browser toolbar eats the viewport's HEIGHT in either orientation, so
  // the width axis stays the clean zoom reference. (Which is why this cannot
  // simply compare long edge to long edge — for a portrait panel the long edge
  // IS the height, which would fold the toolbar back into the zoom number.)
  const viewportIsLandscape = !!r.viewportHeight && r.viewportWidth > r.viewportHeight;
  const screenLong = Math.max(r.screenWidth, r.screenHeight ?? r.screenWidth);
  const screenShort = Math.min(r.screenWidth, r.screenHeight ?? r.screenWidth);
  const screenAcross = viewportIsLandscape ? screenLong : screenShort;
  const screenDown = viewportIsLandscape ? screenShort : screenLong;

  // Zoom is measured but is NOT reported as a fault. It is the scale factor the
  // chrome check below needs, and nothing more.
  //
  // These panels load at 125% natively — that is not drift, it is how the whole
  // fleet has always run. And a layout sized in vh/% renders identically at any
  // zoom (at 125% the viewport is 864x1536, every vh is 0.8x, and it rasterises
  // at devicePixelRatio 1.25 for the same device pixels), which is why nobody
  // ever noticed. Flagging it put a red warning on every healthy screen on the
  // wall, and the doc's own standard is that crying wolf is worse than no check.
  //
  // "Set it back to 100%" was also advice that does not stick: the panels revert
  // (suspected hospitality mode), and it did not need to stick.
  //
  // The one place zoom genuinely changes output is a WEBPAGE display, where the
  // embedded dashboard is handed 864 CSS px instead of 1080 and lays itself out
  // for the narrower viewport. That is a content-fit problem to solve in the
  // player, not a "go and fix this panel" errand — see PlaylistPlayer.
  const zoom = screenAcross / r.viewportWidth;

  // Only meaningful once the zoom is known, since the toolbar's height has to be
  // compared in the same units as the panel's.
  if (r.viewportHeight && r.screenHeight && Number.isFinite(zoom)) {
    const usedPx = r.viewportHeight * zoom;
    const missingPx = Math.round(screenDown - usedPx);
    if (missingPx > CHROME_TOLERANCE_PX) {
      faults.push({
        kind: "NOT_FULLSCREEN",
        missingPx,
        short: `Not full screen — ${missingPx}px of browser toolbar`,
        detail:
          `${missingPx}px of the panel is browser chrome, not content — this ` +
          `screen is in a windowed browser rather than kiosk/fullscreen. ` +
          `Hide the toolbar or relaunch full screen.`,
      });
    }
  }

  return faults;
}

/** One line for a hub list, or null when nothing is detectably wrong. */
export function faultSummary(r: ViewportReport | null | undefined): string | null {
  const faults = faultsFor(r);
  if (!faults.length) return null;
  return faults.map((f) => `${f.missingPx}px chrome`).join(" · ");
}
