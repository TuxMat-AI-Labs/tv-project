import Link from "next/link";
import { ScreensaverPicker } from "@/components/hub/ScreensaverPicker";
import { Wordmark } from "@/components/brand/Wordmark";

/**
 * Immersive, full-screen screensaver picker. A fixed overlay covers the hub
 * chrome (nav + account), leaving only the TUXDISPLAY wordmark header; the three
 * colour previews bleed edge to edge beneath it.
 */
export default function ScreensaverPage() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <header className="flex items-center justify-between px-6 py-4">
        <Link href="/hub" aria-label="Back to hub" className="transition-opacity hover:opacity-80">
          <Wordmark tone="light" />
        </Link>
        <Link
          href="/hub"
          className="glass-btn glass-btn--dark rounded-full px-4 py-1.5 text-xs font-medium tracking-wide uppercase"
        >
          Close
        </Link>
      </header>
      <div className="min-h-0 flex-1">
        <ScreensaverPicker />
      </div>
    </div>
  );
}
