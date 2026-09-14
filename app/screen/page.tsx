import { ViewportLock } from "@/components/display/ViewportLock";
import { ScreenEntry } from "@/components/tv/ScreenEntry";

export const metadata = {
  title: "TuxDisplay",
};

// Never serve this from a cache, at any layer.
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * A second, identical entry point to `/tv`.
 *
 * Why a duplicate route rather than a better `/tv`: a panel that is serving its
 * page from its own cache cannot be rescued by pointing it at the same address
 * again, and on the office wall we have screens stuck on code old enough that
 * they never pick up a new build. A path the browser has never requested has no
 * cache entry to serve, so the first load is guaranteed to come from the server.
 *
 * It is also deliberately OUTSIDE the service worker's interception list
 * (public/sw.js matches `/tv` and `/display/*`), so nothing local can sit
 * between the panel and the server on this path. That costs it the offline
 * fallback the other routes get, which is the right trade while the open
 * question is whether a screen is running current code at all.
 *
 * Behaviour is identical to /tv — same pairing, same player, same device
 * cookie. Either URL works; this one just cannot be answered from a cache.
 */
export default function ScreenPage() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-black">
      <ViewportLock />
      <ScreenEntry />
    </div>
  );
}
