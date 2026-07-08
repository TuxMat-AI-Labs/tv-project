"use client";

import { useEffect } from "react";

/**
 * Locks the document to the viewport while a TV output route (`/display/[slug]`,
 * `/tv`) is mounted, then restores it on unmount so the scrollable Hub is
 * unaffected. Some Smart TV browsers (Samsung Internet's "page zoom" included)
 * size `position: fixed` elements against the *visual* viewport while `html`/
 * `body` size against the *layout* viewport — under non-100% zoom those two can
 * differ by a fraction of a pixel, which used to both surface a stray scrollbar
 * and let a sliver of the (light) Hub background peek through at the edge of an
 * otherwise full-bleed black player. Every full-bleed TV-output layer now uses
 * `position: absolute` instead of `fixed` (ties sizing to the layout viewport,
 * immune to that mismatch); this component's `overflow: hidden` on <html>/
 * <body> remains as a second guarantee against any residual scrollbar. Renders
 * nothing.
 */
export function ViewportLock() {
  useEffect(() => {
    document.documentElement.classList.add("tv-output");
    return () => {
      document.documentElement.classList.remove("tv-output");
    };
  }, []);

  return null;
}
