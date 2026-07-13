"use client";

import { useState } from "react";
import type { CarouselTransition } from "@/lib/display/transition";

/**
 * Slide/Fade segmented control next to a room's heading. Governs how this
 * room's rotation (synchronized landscape carousel + any display's own
 * multi-item playlist) transitions between items — see
 * app/api/admin/rooms/[id]/carousel-transition/route.ts.
 */
export function CarouselTransitionToggle({
  roomId,
  transition,
}: {
  roomId: string;
  transition: CarouselTransition;
}) {
  const [value, setValue] = useState(transition);
  const [pending, setPending] = useState(false);

  async function choose(next: CarouselTransition) {
    if (next === value || pending) return;
    const prev = value;
    setPending(true);
    setValue(next); // optimistic
    try {
      const res = await fetch(`/api/admin/rooms/${roomId}/carousel-transition`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transition: next }),
      });
      if (!res.ok) setValue(prev);
    } catch {
      setValue(prev);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex items-center overflow-hidden rounded-full border border-black/10 text-[10px] font-medium uppercase tracking-wide">
      {(["SLIDE", "FADE"] as const).map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => choose(option)}
          disabled={pending}
          aria-pressed={value === option}
          className={`px-2.5 py-1 transition-colors disabled:opacity-60 ${
            value === option ? "bg-gold text-white" : "text-muted hover:text-foreground"
          }`}
        >
          {option === "SLIDE" ? "Slide" : "Fade"}
        </button>
      ))}
    </div>
  );
}
