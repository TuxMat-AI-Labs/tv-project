"use client";

import { useState } from "react";
import type { CarouselTransition } from "@/lib/display/transition";

/**
 * Per-room rotation controls shown next to a room's heading: a plain-text
 * Slide / Fade transition choice, and an ON/OFF switch to its right that
 * starts/stops the room's landscape rotation.
 *
 * Both values are server-authoritative (fed from the hub's ~10s status poll
 * via RoomSection). Each control keeps a short-lived optimistic override so a
 * click feels instant, but the override is dropped — adjusted during render,
 * React's prescribed way to reset state when a prop changes, NOT in an effect —
 * the moment the server's own value matches it. That's what keeps the switch
 * from ever getting stuck against a stale poll: turning it off always sticks.
 */
export function RoomCarouselControls({
  roomId,
  transition,
  active,
}: {
  roomId: string;
  transition: CarouselTransition;
  active: boolean;
}) {
  const [transitionOverride, setTransitionOverride] = useState<CarouselTransition | null>(null);
  const [prevTransition, setPrevTransition] = useState(transition);
  const [activeOverride, setActiveOverride] = useState<boolean | null>(null);
  const [prevActive, setPrevActive] = useState(active);
  const [pending, setPending] = useState(false);

  if (transition !== prevTransition) {
    setPrevTransition(transition);
    if (transitionOverride !== null && transitionOverride === transition) setTransitionOverride(null);
  }
  if (active !== prevActive) {
    setPrevActive(active);
    if (activeOverride !== null && activeOverride === active) setActiveOverride(null);
  }

  const currentTransition = transitionOverride ?? transition;
  const isOn = activeOverride ?? active;

  async function chooseTransition(next: CarouselTransition) {
    if (next === currentTransition) return;
    const prev = currentTransition;
    setTransitionOverride(next);
    try {
      const res = await fetch(`/api/admin/rooms/${roomId}/carousel-transition`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transition: next }),
      });
      if (!res.ok) setTransitionOverride(prev);
    } catch {
      setTransitionOverride(prev);
    }
  }

  async function toggleActive() {
    if (pending) return;
    setPending(true);
    const next = !isOn;
    setActiveOverride(next);
    try {
      const res = await fetch(`/api/admin/rooms/${roomId}/activate-carousel`, { method: "POST" });
      const data = (await res.json().catch(() => null)) as { active?: boolean } | null;
      if (!res.ok || !data) setActiveOverride(!next);
      else setActiveOverride(Boolean(data.active));
    } catch {
      setActiveOverride(!next);
    } finally {
      setPending(false);
    }
  }

  return (
    <span className="flex items-center gap-1 text-[11px] font-medium tracking-wide">
      <span className="flex items-center">
        {(["SLIDE", "FADE"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => chooseTransition(option)}
            aria-pressed={currentTransition === option}
            className={`rounded px-2 py-2.5 uppercase transition-colors ${
              currentTransition === option ? "text-gold" : "text-muted hover:text-foreground"
            }`}
          >
            {option === "SLIDE" ? "Slide" : "Fade"}
          </button>
        ))}
      </span>

      <button
        type="button"
        role="switch"
        aria-checked={isOn}
        aria-label={isOn ? "Rotation on — click to turn off" : "Rotation off — click to turn on"}
        title={isOn ? "Rotation on — click to turn off" : "Rotation off — click to turn on"}
        onClick={toggleActive}
        disabled={pending}
        className="flex h-11 w-11 shrink-0 items-center justify-center disabled:opacity-60"
      >
        <span
          className={`relative h-7 w-12 rounded-full transition-colors ${isOn ? "bg-emerald-500" : "bg-black/20"}`}
        >
          <span
            className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition-transform ${
              isOn ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </span>
      </button>
    </span>
  );
}
