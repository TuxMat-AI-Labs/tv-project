"use client";

import { useEffect } from "react";

/**
 * Apple-style scroll reveal. Watches every `.reveal > *` element and adds
 * `.in-view` as it scrolls into the viewport (once), driving the CSS rise+fade
 * defined in globals.css. A MutationObserver re-scans as content mounts (e.g.
 * hub tiles that arrive after the status fetch, or client route changes), so a
 * single instance mounted in the root layout covers the whole app.
 * No-op under prefers-reduced-motion — the CSS leaves content visible there.
 */
export function ScrollReveal() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const io = new IntersectionObserver(
      (entries) => {
        // Items that cross into view together (e.g. the above-the-fold batch on
        // load) get an increasing delay so they arrive one at a time; a lone
        // item scrolled into view later gets index 0 and reveals immediately.
        const entering = entries.filter((e) => e.isIntersecting);
        entering.forEach((entry, i) => {
          const el = entry.target as HTMLElement;
          el.style.transitionDelay = `${i * 0.12}s`;
          el.classList.add("in-view");
          io.unobserve(el);
        });
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.08 },
    );

    const scan = () => {
      document.querySelectorAll(".reveal > *:not(.in-view)").forEach((el) => io.observe(el));
    };

    scan();
    const mo = new MutationObserver(scan);
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, []);

  return null;
}
