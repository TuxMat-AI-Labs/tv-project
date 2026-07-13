"use client";

import { useState } from "react";
import { CarouselIcon } from "@/components/hub/icons";

/**
 * Icon-only toggle next to a room's heading. Starts/stops the room's
 * synchronized landscape carousel (see
 * app/api/admin/rooms/[id]/activate-carousel/route.ts). Turns green while
 * active; the slider glyph scrolls continuously when active, and on hover
 * when idle.
 *
 * `serverActive` is authoritative (from the hub's ~10s status poll, via
 * RoomSection). A click sets a local optimistic override so the click feels
 * instant, but that override is dropped the moment the server's own value
 * catches up (adjusted during render, React's prescribed way to reset state
 * when a prop changes — see https://react.dev/learn/you-might-not-need-an-effect)
 * — it never permanently diverges from the server, which is what let a stale
 * poll fight a stuck "on" button before.
 */
export function ActivateCarouselButton({ roomId, serverActive }: { roomId: string; serverActive: boolean }) {
  const [override, setOverride] = useState<boolean | null>(null);
  const [prevServerActive, setPrevServerActive] = useState(serverActive);
  const [pending, setPending] = useState(false);

  if (serverActive !== prevServerActive) {
    setPrevServerActive(serverActive);
    if (override !== null && override === serverActive) setOverride(null);
  }

  const active = override ?? serverActive;

  async function toggle() {
    if (pending) return;
    setPending(true);
    const optimistic = !active;
    setOverride(optimistic); // reflect intent immediately; the effect above reconciles once the poll confirms
    try {
      const res = await fetch(`/api/admin/rooms/${roomId}/activate-carousel`, { method: "POST" });
      const data = (await res.json().catch(() => null)) as { active?: boolean } | null;
      if (!res.ok || !data) setOverride(!optimistic);
      else setOverride(Boolean(data.active));
    } catch {
      setOverride(!optimistic);
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
