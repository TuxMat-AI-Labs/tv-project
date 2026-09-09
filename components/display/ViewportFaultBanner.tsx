"use client";

import type { ViewportFault } from "@/lib/display/viewportHealth";

/**
 * Says on the screen itself that this screen is rendering its content wrong.
 *
 * The hub records the same fault, but a wall display is looked at by people who
 * never open the hub, and what it reports is fixable only by somebody standing
 * at the TV — a browser zoom, or a browser that has fallen out of kiosk mode.
 * Putting it on the panel puts it in front of whoever can act on it.
 *
 * ── Why it is this small, and down here ───────────────────────────────────
 *
 * The first version was a top-left box carrying the full explanation. Rendered
 * over a real board it covered the TuxMat wordmark and the company headline
 * figure — the single number the main-floor screen exists to show. A warning
 * that hides the most important thing on the wall in order to report that the
 * wall is slightly the wrong size is a worse outcome than the fault it reports.
 *
 * So: bottom-left, one short line per fault, no prose. Bottom-left is the
 * quietest corner of every board we run — it holds the period year and the board
 * name, which are the two most expendable things on screen. The full sentence,
 * the measured numbers and the reasoning live in the hub's Pixel health panel,
 * where the reader is deciding whether to walk over rather than standing there
 * already.
 *
 * Sized in `vh` like the boards themselves — which also means it keeps its
 * physical size on the panel even when the very fault it is reporting has
 * changed the viewport out from under it.
 */
export function ViewportFaultBanner({ faults }: { faults: ViewportFault[] }) {
  if (!faults.length) return null;

  return (
    <div
      // pointer-events off: the TV is unattended and nothing here is interactive.
      // aria-hidden: an operator's note on a screen nobody navigates.
      aria-hidden="true"
      className="pointer-events-none fixed bottom-0 left-0 z-[9999] m-[1vh] rounded-[0.6vh] px-[1.1vh] py-[0.7vh]"
      style={{
        background: "rgba(140, 22, 22, 0.94)",
        border: "0.12vh solid rgba(255, 170, 170, 0.5)",
        color: "#fff",
        // Never inherits the page's font: this has to stay legible even when
        // whatever it is reporting has broken the page's own type.
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
      }}
    >
      {faults.map((f) => (
        <p key={f.kind} className="whitespace-nowrap text-[1.15vh] font-medium leading-tight">
          {f.short}
        </p>
      ))}
    </div>
  );
}
