import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveContentForDisplay } from "@/lib/display/resolveContentForDisplay";
import { resolveLandscapeDisplay } from "@/lib/display/landscapeCarousel";
import { coerceCarouselTransition } from "@/lib/display/transition";
import { SCREENSAVER_STYLE_SETTING_KEY, coerceScreensaverVariant } from "@/lib/screensaver";

export const dynamic = "force-dynamic";

// The TV's client-side poll already sets fetch({ cache: "no-store" }), but a
// Smart TV browser's HTTP cache or an intermediate proxy can still apply
// heuristic caching to a GET response with no explicit directives — an
// explicit "no-store" here closes that gap so a TV can never poll into a
// stale playlist/reload signal.
const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

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

  // Displays in a room draw from their room's shared same-orientation pool
  // (see lib/display/landscapeCarousel.ts — shared with the hub status route
  // so the dashboard preview always matches what's actually on screen).
  // A display currently showing its own video, or one with no pool to join,
  // falls through to the normal resolution below untouched.
  const landscape = await resolveLandscapeDisplay(
    {
      id: display.id,
      roomId: display.roomId,
      active: display.active,
      orientation: display.orientation,
      screensaverOverride: display.screensaverOverride,
      room: { carouselActive: display.room.carouselActive, carouselStartedAt: display.room.carouselStartedAt },
    },
    now
  );

  if (landscape.mode === "screensaver") {
    const screensaverStyle = await getScreensaverStyle();
    return NextResponse.json({ mode: "screensaver", screensaverStyle, ...base }, { headers: NO_STORE_HEADERS });
  }
  if (landscape.mode === "carousel") {
    return NextResponse.json({ mode: "carousel", carousel: landscape.carousel, ...base }, { headers: NO_STORE_HEADERS });
  }
  if (landscape.mode === "playlist") {
    return NextResponse.json({ mode: "playlist", playlist: landscape.playlist, ...base }, { headers: NO_STORE_HEADERS });
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
