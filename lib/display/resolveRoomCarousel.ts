import type { PlaylistItem } from "@/lib/display/resolveContentForDisplay";

// How long each graphic sits on a screen before the whole wall pushes to the
// next one. Every display computes ticks from this same period against the
// room's shared `carouselStartedAt`, so they advance in lockstep.
export const CAROUSEL_PERIOD_MS = 8_000;

export type CarouselPayload = {
  periodMs: number;
  // The rotation index at `now`. Use `currentRingIndex` to turn this and a
  // display's `position` into a ring index — see that function for the
  // direction the wall pushes.
  tick: number;
  // ms from `now` until the next push. Clients schedule the slide off this
  // *server-derived delta* (not their own clock, which is unreliable on TVs),
  // so every screen fires the animation at the same instant.
  msUntilNextRotation: number;
  // This display's slot among the room's participating displays (0..N-1).
  position: number;
  ring: PlaylistItem[];
};

/**
 * Pure computation of a display's place in the synchronized room carousel.
 * `ring` is the room's shared pool of items (in a stable order shared by every
 * display's request) — it can be larger than the number of participating
 * displays. `position` is this display's slot (0..N-1) among those displays,
 * also in a stable, shared order. As long as the number of participating
 * displays doesn't exceed `ring.length`, every display shows a distinct item
 * at any given tick (consecutive slots map to consecutive, non-colliding ring
 * indices mod ring.length). Returns null when there's nothing to rotate
 * (fewer than 2 items in the ring, or this display isn't participating), so
 * the caller can fall back to normal content resolution.
 */
export function resolveRoomCarousel(
  ring: PlaylistItem[],
  position: number,
  startedAt: Date,
  now: Date
): CarouselPayload | null {
  const ringLength = ring.length;
  if (ringLength < 2 || position < 0) return null;

  const elapsed = now.getTime() - startedAt.getTime();
  // Guard against a clock that hasn't reached startedAt yet (elapsed < 0).
  const intoTick = ((elapsed % CAROUSEL_PERIOD_MS) + CAROUSEL_PERIOD_MS) % CAROUSEL_PERIOD_MS;
  const tick = Math.max(0, Math.floor(elapsed / CAROUSEL_PERIOD_MS));

  return {
    periodMs: CAROUSEL_PERIOD_MS,
    tick,
    msUntilNextRotation: CAROUSEL_PERIOD_MS - intoTick,
    position,
    ring,
  };
}

/**
 * The ring index a display at `position` shows at a given `tick`. Shared by
 * the TV's `CarouselPlayer` and the hub status route so both always agree on
 * what's currently on screen.
 *
 * Subtracting `tick` (rather than adding) makes a given ring item move from
 * position p to position p + 1 as tick advances — i.e. content pushes toward
 * HIGHER display numbers, left-to-right across the wall (positions are
 * assigned by ascending `Display.number`).
 */
export function currentRingIndex(position: number, tick: number, ringLength: number): number {
  return (((position - tick) % ringLength) + ringLength) % ringLength;
}
