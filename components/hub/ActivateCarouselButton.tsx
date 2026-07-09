"use client";

import { useState } from "react";
import { CarouselIcon } from "@/components/hub/icons";

/**
 * Icon-only toggle next to a room's heading. Starts/stops the room's
 * synchronized video-wall carousel (see
 * app/api/admin/rooms/[id]/activate-carousel/route.ts). Turns green while
 * active; the slider glyph scrolls continuously when active, and on hover
 * when idle.
 */
export function ActivateCarouselButton({ roomId, initialActive }: { roomId: string; initialActive: boolean }) {
  const [active, setActive] = useState(initialActive);
  const [pending, setPending] = useState(false);

  async function toggle() {
    if (pending) return;
    setPending(true);
    const optimistic = !active;
    setActive(optimistic); // reflect intent immediately; reconcile with the server below
    try {
      const res = await fetch(`/api/admin/rooms/${roomId}/activate-carousel`, { method: "POST" });
      const data = (await res.json().catch(() => null)) as { active?: boolean } | null;
      if (!res.ok || !data) setActive(!optimistic);
      else setActive(Boolean(data.active));
    } catch {
      setActive(!optimistic);
    } finally {
      setPending(false);
    }
  }

  const title = active ? "Carousel running — click to stop" : "Activate carousel";
  // The center slide scrolls forever while active; only on hover when idle.
  const stripClassName = active
    ? "motion-reduce:animate-none animate-[carousel-slide-strip_1.2s_linear_infinite]"
    : "motion-reduce:animate-none animate-[carousel-slide-strip_1.2s_linear_infinite] [animation-play-state:paused] group-hover:[animation-play-state:running]";

  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      onClick={toggle}
      disabled={pending}
      className={`group flex h-6 w-8 items-center justify-center transition-colors disabled:opacity-60 ${
        active ? "text-emerald-500" : "text-muted hover:text-gold"
      }`}
    >
      <CarouselIcon className="h-5 w-8" stripClassName={stripClassName} />
    </button>
  );
}
