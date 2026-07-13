import { prisma } from "@/lib/prisma";
import { isWithinBusinessHours, isWithinDateRange, isWithinDaypart } from "@/lib/time";
import { resolveRoomCarousel, type CarouselPayload } from "@/lib/display/resolveRoomCarousel";
import type { PlaylistItem } from "@/lib/display/resolveContentForDisplay";

const DEFAULT_IMAGE_DURATION_SEC = 10;

// Kill switch for the whole landscape-room mechanic (pool + rotation + the
// "hold at home image when off" behavior). With this false every LANDSCAPE
// display falls through to normal per-display scheduling, same as a PORTRAIT
// one.
export const CAROUSEL_ENABLED = true;

export type LandscapeResolution =
  | { mode: "screensaver" }
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
  orientation: string;
  screensaverOverride: boolean | null;
  room: { carouselActive: boolean; carouselStartedAt: Date | null };
};

/**
 * Resolves what a LANDSCAPE display should show from its room's shared
 * landscape-image pool. Used by BOTH the TV content route and the hub status
 * route so the dashboard preview always matches what's actually on screen —
 * previously the dashboard had no awareness of this mechanic at all.
 */
export async function resolveLandscapeDisplay(
  display: LandscapeDisplayInput,
  now: Date
): Promise<LandscapeResolution> {
  if (!CAROUSEL_ENABLED || !display.active || display.orientation !== "LANDSCAPE") return { mode: "none" };

  const { ring, position } = await buildLandscapeRoomRing(display.roomId, display.id, now);
  if (ring.length === 0 || position < 0) return { mode: "none" };

  // Screensaver still wins (overnight burn-in care / an explicit override),
  // even mid-rotation — the pool counts as "has content" so a display feeding
  // off the pool isn't forced to the screensaver during the day.
  const wantsScreensaver =
    display.screensaverOverride === true ||
    (display.screensaverOverride !== false && !isWithinBusinessHours(now));
  if (wantsScreensaver) return { mode: "screensaver" };

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
 * The room's shared landscape-image pool: every currently-in-window
 * LANDSCAPE-tagged IMAGE assigned to any of the room's active, PARTICIPATING
 * landscape displays (deduped, sorted by id for a stable shared order), plus
 * this display's slot (0..N-1) among the participating displays (ordered by
 * `number`).
 *
 * A display currently showing a live VIDEO assignment sits out the rotation
 * entirely — "only the statics rotate" — so it's excluded from the
 * participant list (no ring contribution, no position) and just plays its
 * video normally via the caller's normal-resolution fallback.
 */
async function buildLandscapeRoomRing(
  roomId: string,
  thisDisplayId: string,
  now: Date
): Promise<{ ring: PlaylistItem[]; position: number }> {
  const displays = await prisma.display.findMany({
    where: { roomId, active: true, orientation: "LANDSCAPE" },
    orderBy: { number: "asc" },
    include: { assignments: { include: { contentItem: true } } },
  });

  const isLive = (a: { startsAt: Date | null; endsAt: Date | null; daypartStart: string | null; daypartEnd: string | null }) =>
    isWithinDateRange(now, a.startsAt, a.endsAt) && isWithinDaypart(now, a.daypartStart, a.daypartEnd);

  const participating = displays.filter(
    (d) => !d.assignments.some((a) => a.contentItem.type === "VIDEO" && isLive(a))
  );

  const position = participating.findIndex((d) => d.id === thisDisplayId);

  const seen = new Set<string>();
  const ring: PlaylistItem[] = [];
  for (const d of participating) {
    for (const a of d.assignments) {
      const ci = a.contentItem;
      if (ci.type !== "IMAGE" || ci.orientation !== "LANDSCAPE") continue;
      if (!isLive(a)) continue;
      if (seen.has(ci.id)) continue;
      seen.add(ci.id);
      ring.push({
        id: ci.id,
        type: ci.type,
        fileUrl: ci.fileUrl,
        thumbnailUrl: ci.thumbnailUrl,
        durationSec: ci.durationSec ?? DEFAULT_IMAGE_DURATION_SEC,
      });
    }
  }
  // Stable pool order regardless of assignment iteration order above.
  ring.sort((a, b) => a.id.localeCompare(b.id));

  return { ring, position };
}
