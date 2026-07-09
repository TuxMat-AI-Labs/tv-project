import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveContentForDisplay, type PlaylistItem } from "@/lib/display/resolveContentForDisplay";
import { resolveRoomCarousel, type CarouselTile } from "@/lib/display/resolveRoomCarousel";

export const dynamic = "force-dynamic";

// The TV's client-side poll already sets fetch({ cache: "no-store" }), but a
// Smart TV browser's HTTP cache or an intermediate proxy can still apply
// heuristic caching to a GET response with no explicit directives — an
// explicit "no-store" here closes that gap so a TV can never poll into a
// stale playlist/reload signal.
const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

const DEFAULT_IMAGE_DURATION_SEC = 10;

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
    serverTime: now.toISOString(),
  };

  // Synchronized video-wall carousel takes precedence over the normal schedule.
  if (display.active && display.room.carouselActive && display.room.carouselStartedAt) {
    const tiles = await buildRoomRing(display.roomId);
    const carousel = resolveRoomCarousel(tiles, display.id, display.room.carouselStartedAt, now);
    if (carousel) {
      return NextResponse.json({ mode: "carousel", carousel, ...base }, { headers: NO_STORE_HEADERS });
    }
  }

  const resolved = resolveContentForDisplay(display, now);
  return NextResponse.json({ ...resolved, ...base }, { headers: NO_STORE_HEADERS });
}

/**
 * The room's rotation ring: every active display with at least one content
 * item, ordered by `number` so every display in the room computes the same
 * ring in the same order. Each display contributes its first assigned item as
 * its "home" tile.
 */
async function buildRoomRing(roomId: string): Promise<CarouselTile[]> {
  const displays = await prisma.display.findMany({
    where: { roomId, active: true },
    orderBy: { number: "asc" },
    include: { assignments: { include: { contentItem: true }, orderBy: { sortOrder: "asc" } } },
  });

  const tiles: CarouselTile[] = [];
  for (const d of displays) {
    const ci = d.assignments[0]?.contentItem;
    if (!ci) continue;
    const item: PlaylistItem = {
      id: ci.id,
      type: ci.type,
      fileUrl: ci.fileUrl,
      thumbnailUrl: ci.thumbnailUrl,
      durationSec: ci.durationSec ?? DEFAULT_IMAGE_DURATION_SEC,
    };
    tiles.push({ displayId: d.id, item });
  }
  return tiles;
}
