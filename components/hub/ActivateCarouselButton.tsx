"use client";

import { useState } from "react";
import { CarouselIcon } from "@/components/hub/icons";

/**
 * Icon-only button next to a room's heading. Assigns the whole content
 * library to every display in the room as a playlist, so the existing
 * push-slide carousel (PlaylistPlayer) has multiple items to cycle through
 * for testing — see app/api/admin/rooms/[id]/activate-carousel/route.ts.
 */
export function ActivateCarouselButton({ roomId }: { roomId: string }) {
  const [state, setState] = useState<"idle" | "requesting" | "done" | "error">("idle");

  async function activate() {
    if (state === "requesting") return;
    if (!confirm("Activate the test carousel? This replaces every display's current content in this room with the full content library, cycling through it.")) {
      return;
    }
    setState("requesting");
    try {
      const res = await fetch(`/api/admin/rooms/${roomId}/activate-carousel`, { method: "POST" });
      setState(res.ok ? "done" : "error");
    } catch {
      setState("error");
    } finally {
      setTimeout(() => setState("idle"), 2000);
    }
  }

  const title =
    state === "requesting" ? "Activating carousel…" : state === "error" ? "Failed to activate carousel" : "Activate test carousel";

  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={activate}
      disabled={state === "requesting"}
      className={`group flex h-6 w-8 items-center justify-center text-muted transition-colors hover:text-gold disabled:opacity-60 ${
        state === "error" ? "text-red-500" : ""
      }`}
    >
      {/* Clipped one-glyph-wide window; the track inside is two glyphs wide
          and scrolls left by exactly one glyph on hover — since both copies
          are identical, the loop is seamless (see carousel-track-slide). */}
      <span className="relative block h-4 w-6 overflow-hidden">
        <span className="motion-reduce:animate-none flex h-4 w-12 animate-[carousel-track-slide_0.9s_linear_infinite] [animation-play-state:paused] group-hover:[animation-play-state:running]">
          <CarouselIcon className="h-4 w-6 shrink-0" />
          <CarouselIcon className="h-4 w-6 shrink-0" />
        </span>
      </span>
    </button>
  );
}
