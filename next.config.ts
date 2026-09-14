import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // The TV-facing entry points must never be served from a cache.
        //
        // These panels are kiosks that run for weeks without anyone touching
        // them, so a cached HTML document is not a stale page for thirty
        // seconds — it is a screen frozen on whatever code it happened to fetch,
        // indefinitely, with no way for a new build to reach it. That has
        // already cost real time on this wall: a display kept rendering
        // differently from the identical panel beside it, and the difference
        // that mattered turned out to be which bundle each was running.
        //
        // Only the HTML documents are covered. Next's own static assets are
        // content-hashed and stay cacheable, so this does not make the TVs
        // re-download the app on every poll.
        source: "/:path(tv|screen)",
        headers: [
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate, max-age=0" },
          { key: "Pragma", value: "no-cache" },
        ],
      },
      {
        source: "/display/:slug*",
        headers: [
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate, max-age=0" },
          { key: "Pragma", value: "no-cache" },
        ],
      },
    ];
  },
};

export default nextConfig;
