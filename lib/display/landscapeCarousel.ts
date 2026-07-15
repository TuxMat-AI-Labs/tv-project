import type { Orientation } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { scheduledSurface, isWithinDateRange, isWithinDaypart } from "@/lib/time";
import { resolveRoomCarousel, type CarouselPayload } from "@/lib/display/resolveRoomCarousel";
import type { PlaylistItem } from "@/lib/display/resolveContentForDisplay";

const DEFAULT_IMAGE_DURATION_SEC = 10;

// Kill switch for the whole room-rotation mechanic (pool + rotation + the
// "hold at home image when off" behavior). With this false every display
// falls through to normal per-display scheduling.
export const CAROUSEL_ENABLED = true;

export type LandscapeResolution =
  | { mode: "screensaver" }
  | { mode: "black" }
  | { mode: "carousel"; carousel: CarouselPayload }
  | { mode: "playlist"; playlist: PlaylistItem[] }
  // Doesn't apply to this display right now — caller falls through to normal
  // per-display scheduling (not landscape, no pool yet, or this display is
  // currently showing its own video and sits out the rotation).
  | { mode: "none" };

type LandscapeDisplayInput = {
  id: string;
  roomId: string;
  active: boolean;
  orientation: Orientation;
  screensaverOverride: boolean | null;
  room: { carouselActive: boolean; carouselStartedAt: Date | null };
};

/**
 * Resolves what a display should show from its room's shared same-orientation
 * image pool (LANDSCAPE displays draw from a LANDSCAPE pool, PORTRAIT from a
 * PORTRAIT pool — the two never mix). Used by BOTH the TV content route and
 * the hub status route so the dashboard preview always matches what's
 * actually on screen — previously the dashboard had no awareness of this
 * mechanic at all.
 */
export async function resolveLandscapeDisplay(
  display: LandscapeDisplayInput,
  now: Date
): Promise<LandscapeResolution> {
  if (!CAROUSEL_ENABLED || !display.active) return { mode: "none" };

  const { ring, position } = await buildLandscapeRoomRing(
    display.roomId,
    display.id,
    display.orientation,
    now
  );
  if (ring.length === 0 || position < 0) return { mode: "none" };

  // Schedule/override win over rotation, even mid-cycle. Forced-on → always
  // screensaver; forced-off → never blank (falls through to the pool). Auto →
  // follow the day's schedule: black overnight/weekends, the pixel-care
  // screensaver in the massage window, content during shift hours.
  if (display.screensaverOverride === true) return { mode: "screensaver" };
  if (display.screensaverOverride !== false) {
    const surface = scheduledSurface(now);
    if (surface === "screensaver") return { mode: "screensaver" };
    if (surface === "black") return { mode: "black" };
  }

  // Rotation ON: rotate the whole wall through the pool in lockstep.
  if (display.room.carouselActive && display.room.carouselStartedAt) {
    const carousel = resolveRoomCarousel(ring, position, display.room.carouselStartedAt, now);
    if (carousel) return { mode: "carousel", carousel };
  }

  // Rotation OFF (or a single-item pool that can't rotate): hold the one
  // image this display starts the rotation on — ring[position] is exactly
  // what tick 0 shows — as a static single-item playlist. So flipping the
  // switch off always drops every screen back to its original graphic.
  const home = ring[((position % ring.length) + ring.length) % ring.length];
  return { mode: "playlist", playlist: [home] };
}

/**
 * The room's shared same-orientation image pool, and this display's slot
 * (0..N-1) among the room's PARTICIPATING displays of that same orientation
 * (ordered by `number`). LANDSCAPE and PORTRAIT never share a pool — a
 * vertical image can't push into a horizontal slot — so each orientation
 * gets its own independent ring within the room.
 *
 * The pool is every IMAGE content item directly tagged into this room's
 * rotation (`ContentItem.rotationRoomId`, set via the library's "Rotation"
 * dropdown — not derived from any Assignment) matching this display's
 * orientation, sorted by id for a stable shared order. A VIDEO can never be
 * in the pool regardless of its `rotationRoomId` (enforced server-side when
 * it's set, but re-checked here too) — only statics rotate.
 *
 * A display currently showing a live VIDEO *assignment* sits out the
 * rotation entirely (excluded from the participant list — no position, no
 * effect on the ring) and just plays its video normally via the caller's
 * normal-resolution fallback, so the video keeps playing uninterrupted on
 * its own screen while the room's other same-orientation (static-only)
 * displays keep rotating among themselves.
 */
async function buildLandscapeRoomRing(
  roomId: string,
  thisDisplayId: string,
  orientation: Orientation,
  now: Date
): Promise<{ ring: PlaylistItem[]; position: number }> {
  const [displays, poolItems] = await Promise.all([
    prisma.display.findMany({
      where: { roomId, active: true, orientation },
      orderBy: { number: "asc" },
      include: { assignments: { include: { contentItem: true } } },
    }),
    prisma.contentItem.findMany({
      where: { rotationRoomId: roomId, type: "IMAGE", orientation },
      orderBy: { id: "asc" },
    }),
  ]);

  const isLive = (a: { startsAt: Date | null; endsAt: Date | null; daypartStart: string | null; daypartEnd: string | null }) =>
    isWithinDateRange(now, a.startsAt, a.endsAt) && isWithinDaypart(now, a.daypartStart, a.daypartEnd);

  const participating = displays.filter(
    (d) => !d.assignments.some((a) => a.contentItem.type === "VIDEO" && isLive(a))
  );

  const position = participating.findIndex((d) => d.id === thisDisplayId);

  const ring: PlaylistItem[] = poolItems.map((ci) => ({
    id: ci.id,
    type: ci.type,
    fileUrl: ci.fileUrl,
    thumbnailUrl: ci.thumbnailUrl,
    durationSec: ci.durationSec ?? DEFAULT_IMAGE_DURATION_SEC,
  }));

  return { ring, position };
}
