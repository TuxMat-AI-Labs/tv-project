import type { PlaylistItem } from "@/lib/display/resolveContentForDisplay";

// How long each graphic sits on a screen before the whole wall pushes to the
// next one. Every display computes ticks from this same period against the
// room's shared `carouselStartedAt`, so they advance in lockstep.
export const CAROUSEL_PERIOD_MS = 8_000;

// One display's "home" tile in the rotation ring, in stable room order.
export type CarouselTile = { displayId: string; item: PlaylistItem };

export type CarouselPayload = {
  periodMs: number;
  // The rotation index at `now`. Display at position p shows ring[(p + tick) % N].
  tick: number;
  // ms from `now` until the next push. Clients schedule the slide off this
  // *server-derived delta* (not their own clock, which is unreliable on TVs),
  // so every screen fires the animation at the same instant.
  msUntilNextRotation: number;
  // This display's index in the ring.
  position: number;
  ring: PlaylistItem[];
};

/**
 * Pure computation of a display's place in the synchronized room carousel.
 * `tiles` must be the room's participating displays (active, with content) in
 * a stable order shared by every display's request. Returns null when there's
 * nothing to rotate (fewer than 2 tiles, or this display isn't participating),
 * so the caller can fall back to normal content resolution.
 */
export function resolveRoomCarousel(
  tiles: CarouselTile[],
  thisDisplayId: string,
  startedAt: Date,
  now: Date
): CarouselPayload | null {
  const ringLength = tiles.length;
  if (ringLength < 2) return null;

  const position = tiles.findIndex((t) => t.displayId === thisDisplayId);
  if (position < 0) return null;

  const elapsed = now.getTime() - startedAt.getTime();
  // Guard against a clock that hasn't reached startedAt yet (elapsed < 0).
  const intoTick = ((elapsed % CAROUSEL_PERIOD_MS) + CAROUSEL_PERIOD_MS) % CAROUSEL_PERIOD_MS;
  const tick = Math.max(0, Math.floor(elapsed / CAROUSEL_PERIOD_MS));

  return {
    periodMs: CAROUSEL_PERIOD_MS,
    tick,
    msUntilNextRotation: CAROUSEL_PERIOD_MS - intoTick,
    position,
    ring: tiles.map((t) => t.item),
  };
}
