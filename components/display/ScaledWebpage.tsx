"use client";

import { useEffect, useRef, useState } from "react";

// The panels' native resolutions. An iframe pinned to these and then CSS-scaled
// is immune to the TV browser's own "page zoom" setting — which is the whole
// point of this component. See the note below.
const NATIVE_PORTRAIT = { w: 1080, h: 1920 };
const NATIVE_LANDSCAPE = { w: 1920, h: 1080 };

/**
 * A webpage rendered at the panel's NATIVE resolution and CSS-scaled to fit its
 * container, used both on the TV itself and in the hub's preview tiles.
 *
 * Why not just `width: 100%; height: 100%`?
 *
 * Browser "page zoom" changes the CSS viewport an iframe is given. On a 1080p
 * portrait panel at 125% zoom the frame is handed 864x1536 instead of
 * 1080x1920, so the embedded dashboard lays itself out for a narrower viewport
 * and everything renders ~25% larger on the wall — the screens "zoom in" on
 * their own, and someone has to walk over and set the zoom back to 100%. The
 * page cannot read or reset that setting (it is browser chrome, not page
 * state), so instead the layout is pinned: the iframe is always given a
 * 1080x1920 (or 1920x1080) layout viewport and scaled down to whatever CSS
 * space it actually occupies. Zoom then only affects rasterization density,
 * never layout.
 *
 * Measured on prod, portrait display, iframe layout viewport:
 *   width:100%  ->  1080x1920 at 100% zoom, 864x1536 at 125%   (drifts)
 *   pinned      ->  1080x1920 at both                          (immune)
 *
 * Full-bleed IMAGE/VIDEO content is already zoom-immune (a viewport-relative
 * box plus `object-fit` renders identically at any zoom), so this only matters
 * for WEBPAGE content.
 */
export function ScaledWebpage({
  src,
  title,
  orientation,
  lazy = false,
}: {
  src: string;
  title: string;
  /** Omit to infer from the container's aspect ratio (preserved under zoom). */
  orientation?: "PORTRAIT" | "LANDSCAPE";
  /**
   * Defer mounting until scrolled into view. For the hub dashboard, which draws
   * one of these per screen; never for the TV, which must paint immediately.
   */
  lazy?: boolean;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(!lazy);
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);

  // Mount the page only once this element is on screen, then stop observing —
  // it must not unmount and re-load when scrolled back past.
  useEffect(() => {
    if (!lazy) return;
    const el = hostRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      // Deferred a frame rather than set synchronously, to stay out of the
      // effect's render pass.
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
  }, [lazy]);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    // clientWidth/Height, NOT getBoundingClientRect(): the rect includes any
    // ancestor transform, and this renders inside framer-motion layers that
    // animate transforms (the hub's shared-layout morph from tile to detail
    // view, the player's slide transition, the tile's hover tilt). Measuring
    // the transformed rect mid-animation locked in a tile-sized scale and left
    // the page shrunk into the top-left corner — and ResizeObserver never
    // corrected it, because the layout box never changed, only the transform.
    const measure = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w > 0 && h > 0) setBox((prev) => (prev && prev.w === w && prev.h === h ? prev : { w, h }));
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const resolvedOrientation = orientation ?? (box && box.h >= box.w ? "PORTRAIT" : "LANDSCAPE");
  const native = resolvedOrientation === "LANDSCAPE" ? NATIVE_LANDSCAPE : NATIVE_PORTRAIT;
  // `cover` so there is never a letterboxed gap at the panel/bezel edge.
  const scale = box ? Math.max(box.w / native.w, box.h / native.h) : null;

  return (
    <div ref={hostRef} className="absolute inset-0 overflow-hidden bg-black">
      {visible && scale !== null && (
        <iframe
          src={src}
          title={title}
          className="border-0"
          // These are internal dashboards on an unattended screen: no top-level
          // navigation, no popups. `allow-same-origin` is required for the page
          // to reach its own API and cookies.
          sandbox="allow-scripts allow-same-origin"
          referrerPolicy="same-origin"
          aria-hidden="true"
          style={{
            width: native.w,
            height: native.h,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            // Nothing here is ever interactive — a stray touch on the TV must
            // not navigate it, and in the hub the tile's own link must win.
            pointerEvents: "none",
          }}
        />
      )}
    </div>
  );
}
