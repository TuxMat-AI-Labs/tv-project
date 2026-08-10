"use client";

import { useEffect, useRef, useState } from "react";

// The TV panels' native portrait resolution. The iframe is laid out at this
// size and then scaled down to the tile, so the preview is a true miniature of
// what's on the wall. Rendering it at the tile's own ~250px width would
// instead trigger the page's mobile breakpoints and preview a layout no TV
// ever shows.
const NATIVE_PORTRAIT = { w: 1080, h: 1920 };
const NATIVE_LANDSCAPE = { w: 1920, h: 1080 };

/**
 * Live, scaled-down render of an assigned WEBPAGE, for a dashboard tile.
 *
 * A webpage has no thumbnail, so without this the wall could only show the
 * word "Playing" over black and every dashboard screen looked identical.
 *
 * Two costs are managed deliberately, because the hub draws one of these per
 * screen (8+ across all rooms) and the earlier code avoided an iframe here for
 * exactly that reason:
 *  - It only mounts once the tile is actually scrolled into view
 *    (IntersectionObserver), so off-screen rooms cost nothing.
 *  - The <iframe> is keyed on `src` ONLY, and the hub's 3–15s status poll
 *    re-renders this component constantly. Nothing in here may depend on poll
 *    state, or every poll would remount the iframe and re-load the page.
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
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);
  const [scale, setScale] = useState<number | null>(null);
  const native = orientation === "LANDSCAPE" ? NATIVE_LANDSCAPE : NATIVE_PORTRAIT;

  // Mount the page only once this tile is on screen, then stop observing —
  // it should not unmount and re-load when scrolled back past.
  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      // No observer support — just mount it. Deferred a frame rather than set
      // synchronously here so this stays out of the effect's render pass.
      const raf = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(raf);
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: "200px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Scale the native-sized frame down to whatever the tile actually measures.
  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const measure = () => {
      const { width, height } = el.getBoundingClientRect();
      if (width > 0 && height > 0) {
        // `cover` the tile so there is never a letterboxed gap inside the bezel.
        setScale(Math.max(width / native.w, height / native.h));
      }
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [native.w, native.h]);

  return (
    <div ref={hostRef} className="absolute inset-0 overflow-hidden bg-black">
      {visible && scale !== null && (
        <iframe
          src={src}
          title={title}
          className="border-0"
          // Same sandbox rationale as the TV player: these are internal
          // dashboards, and a preview tile has no business running top-level
          // navigation or popups. `allow-same-origin` is required for the page
          // to reach its own API and cookies.
          sandbox="allow-scripts allow-same-origin"
          referrerPolicy="same-origin"
          loading="lazy"
          aria-hidden="true"
          style={{
            width: native.w,
            height: native.h,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            // The tile is a status glance wrapped in a <Link> to the detail
            // view — the iframe must never swallow that click.
            pointerEvents: "none",
          }}
        />
      )}
    </div>
  );
}
