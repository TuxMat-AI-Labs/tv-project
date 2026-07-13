import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveContentForDisplay, type PlaylistItem } from "@/lib/display/resolveContentForDisplay";
import { resolveRoomCarousel } from "@/lib/display/resolveRoomCarousel";
import { coerceCarouselTransition } from "@/lib/display/transition";
import { isWithinBusinessHours, isWithinDateRange, isWithinDaypart } from "@/lib/time";
import { SCREENSAVER_STYLE_SETTING_KEY, coerceScreensaverVariant } from "@/lib/screensaver";

export const dynamic = "force-dynamic";

// The TV's client-side poll already sets fetch({ cache: "no-store" }), but a
// Smart TV browser's HTTP cache or an intermediate proxy can still apply
// heuristic caching to a GET response with no explicit directives — an
// explicit "no-store" here closes that gap so a TV can never poll into a
// stale playlist/reload signal.
const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

const DEFAULT_IMAGE_DURATION_SEC = 10;

// Kill switch for the synchronized landscape room carousel. With this false,
// every display serves its normal scheduled content regardless of a room's
// carouselActive flag, so any room stuck "on" reverts on its next poll.
const CAROUSEL_ENABLED = true;

// EMERGENCY FREEZE: the first version of the carousel button stuffed the whole
// content library into each display as a multi-item playlist, so those
// displays keep cycling via the normal PlaylistPlayer even with the carousel
// disabled. Until those assignments are cleaned up (see handoff), collapse
// every playlist to its first item so nothing rotates — each display shows a
// single static graphic. Set false once assignments are sorted out.
const FREEZE_TO_SINGLE_SLIDE = true;

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const display = await prisma.display.findUnique({
    where: { slug },
    include: {
      room: true,
      assignments: { include: { contentItem: true }, orderBy: { sortOrder: "asc" } },
    },
  });

  if (!display) {
    return NextResponse.json(
      { mode: "inactive", serverTime: new Date().toISOString() },
      { status: 404, headers: NO_STORE_HEADERS }
    );
  }

  const now = new Date();
  const base = {
    contentFit: display.contentFit,
    reloadRequestedAt: display.reloadRequestedAt?.toISOString() ?? null,
    carouselTransition: coerceCarouselTransition(display.room.carouselTransition),
    serverTime: now.toISOString(),
  };

  // Landscape displays in a room draw from the room's shared landscape pool.
  // Portrait displays in the same room keep showing their own assigned content
  // untouched (they fall through to the normal resolution below).
  if (CAROUSEL_ENABLED && display.active && display.orientation === "LANDSCAPE") {
    const { ring, position } = await buildLandscapeRoomRing(display.roomId, display.id, now);
    if (ring.length > 0 && position >= 0) {
      // Screensaver still wins (overnight burn-in care / an explicit override),
      // even mid-rotation — the pool counts as "has content" so a display
      // feeding off the pool isn't forced to the screensaver during the day.
      const wantsScreensaver =
        display.screensaverOverride === true ||
        (display.screensaverOverride !== false && !isWithinBusinessHours(now));
      if (wantsScreensaver) {
        const screensaverStyle = await getScreensaverStyle();
        return NextResponse.json({ mode: "screensaver", screensaverStyle, ...base }, { headers: NO_STORE_HEADERS });
      }

      // Carousel ON: rotate the whole wall through the pool in lockstep.
      if (display.room.carouselActive && display.room.carouselStartedAt) {
        const carousel = resolveRoomCarousel(ring, position, display.room.carouselStartedAt, now);
        if (carousel) {
          return NextResponse.json({ mode: "carousel", carousel, ...base }, { headers: NO_STORE_HEADERS });
        }
      }

      // Carousel OFF (or a single-item pool that can't rotate): hold the one
      // image this display starts the rotation on — ring[position] is exactly
      // what tick 0 shows — as a static single-item playlist. So flipping the
      // switch off always drops every screen back to its original graphic.
      const home = ring[((position % ring.length) + ring.length) % ring.length];
      return NextResponse.json({ mode: "playlist", playlist: [home], ...base }, { headers: NO_STORE_HEADERS });
    }
  }

  const resolved = resolveContentForDisplay(display, now);

  if (resolved.mode === "screensaver") {
    const screensaverStyle = await getScreensaverStyle();
    return NextResponse.json({ mode: "screensaver", screensaverStyle, ...base }, { headers: NO_STORE_HEADERS });
  }

  const finalResolved =
    FREEZE_TO_SINGLE_SLIDE && resolved.mode === "playlist" && resolved.playlist.length > 1
      ? { mode: "playlist" as const, playlist: resolved.playlist.slice(0, 1) }
      : resolved;
  return NextResponse.json({ ...finalResolved, ...base }, { headers: NO_STORE_HEADERS });
}

/** The globally-selected screensaver style (falls back to the default). */
async function getScreensaverStyle() {
  const row = await prisma.setting.findUnique({ where: { key: SCREENSAVER_STYLE_SETTING_KEY } });
  return coerceScreensaverVariant(row?.value);
}

/**
 * The room's landscape carousel: a shared pool of LANDSCAPE-tagged content
 * items assigned to any of the room's active LANDSCAPE displays (deduped, in
 * a stable order — every display's request computes the same pool), plus
 * this display's slot (0..N-1) among those displays ordered by `number`. The
 * pool can be larger than the number of participating displays, so as long as
 * there are at least as many pool images as landscape displays, no two
 * displays ever land on the same image at the same tick (see
 * resolveRoomCarousel). Only currently-in-window assignments (date range +
 * daypart) contribute, matching the normal per-display schedule.
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

  const position = displays.findIndex((d) => d.id === thisDisplayId);

  const seen = new Set<string>();
  const ring: PlaylistItem[] = [];
  for (const d of displays) {
    for (const a of d.assignments) {
      const ci = a.contentItem;
      if (ci.orientation !== "LANDSCAPE") continue;
      if (!isWithinDateRange(now, a.startsAt, a.endsAt) || !isWithinDaypart(now, a.daypartStart, a.daypartEnd)) {
        continue;
      }
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
