"use client";

import { useEffect, useRef, useState } from "react";

// The panels' native resolutions. An iframe pinned to these and then CSS-scaled
// is immune to the TV browser's own "page zoom" setting — which is the whole
// point of this component. See the note below.
const NATIVE_PORTRAIT = { w: 1080, h: 1920 };
const NATIVE_LANDSCAPE = { w: 1920, h: 1080 };

/**
 * A webpage rendered at a panel's NATIVE resolution and CSS-scaled to fit its
 * container. Used by the hub's dashboard/detail previews (see
 * components/hub/WebpagePreview) — NOT by the TV player.
 *
 * Why pin the size instead of `width: 100%; height: 100%`?
 *
 * For the hub's purposes the reason is presentational: a tile is ~250px wide, and
 * a percentage-sized iframe would hand the embedded dashboard a 250px viewport,
 * tripping its mobile breakpoints and previewing a layout no TV ever shows.
 * Pinning to 1080x1920 and scaling makes the tile a true miniature of the wall.
 *
 * Measured, iframe layout viewport, outer viewport 1080x1920 vs 864x1536:
 *   width:100%  ->  1080x1920, then 864x1536   (tracks the container)
 *   pinned      ->  1080x1920 in both          (constant)
 *
 * ⚠️ This was ALSO briefly used by the TV player to stop the embedded page
 * inheriting the TV browser's zoom setting, and that was reverted — do not
 * reintroduce it there without reading the note in PlaylistPlayer.tsx first.
 * Short version: the premise appears wrong (a correctly-sized image still
 * "zooms" on the wall, and images are provably immune to a CSS-viewport zoom,
 * implying the TV magnifies rendered output instead), and a 1080x1920 iframe
 * under a transform allocates a large composited layer that is a genuine risk on
 * a memory-constrained TV which is never restarted.
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
