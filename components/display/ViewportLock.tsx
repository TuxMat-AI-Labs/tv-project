"use client";

import { useEffect } from "react";

/**
 * Locks the document to the viewport while a TV output route (`/display/[slug]`,
 * `/tv`) is mounted, then restores it on unmount so the scrollable Hub is
 * unaffected. The player already fills the screen with a `fixed inset-0` layer,
 * but on a zoomed Samsung/Tizen browser that fixed layer can be sized to the
 * visual viewport and end up a hair taller than the layout viewport, surfacing a
 * stray scrollbar. Forcing `overflow: hidden` on <html>/<body> guarantees no
 * zoom level can produce one. Renders nothing.
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
