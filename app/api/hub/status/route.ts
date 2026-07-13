import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveContentForDisplay } from "@/lib/display/resolveContentForDisplay";
import { resolveLandscapeDisplay } from "@/lib/display/landscapeCarousel";
import type { HubDisplayStatus, HubStatusResponse } from "@/lib/hub/types";

export const dynamic = "force-dynamic";

const HEARTBEAT_THRESHOLD_MS = 45_000;
const DEVICE_THRESHOLD_MS = 60_000; // a paired TV checks in via /api/tv/register

type ContentLite = { id: string; type: "IMAGE" | "VIDEO"; thumbnailUrl: string | null; title: string };

export async function GET() {
  const rooms = await prisma.room.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      displays: {
        orderBy: { number: "asc" },
        include: {
          assignments: { include: { contentItem: true } },
          heartbeat: true,
          device: true,
        },
      },
    },
  });

  const now = new Date();

  // Every content item referenced by any assignment in the whole hub, so a
  // landscape display's rotating item — which can come from a DIFFERENT
  // display's assignment in the same room's shared pool — can still be
  // looked up here for its title/thumbnail/type.
  const contentById = new Map<string, ContentLite>();
  for (const room of rooms) {
    for (const d of room.displays) {
      for (const a of d.assignments) {
        contentById.set(a.contentItem.id, {
          id: a.contentItem.id,
          type: a.contentItem.type,
          thumbnailUrl: a.contentItem.thumbnailUrl,
          title: a.contentItem.title,
        });
      }
    }
  }

  const payload: HubStatusResponse = {
    rooms: await Promise.all(
      rooms.map(async (room) => ({
        id: room.id,
        name: room.name,
        slug: room.slug,
        carouselActive: room.carouselActive,
        carouselTransition: room.carouselTransition,
        displays: await Promise.all(
          room.displays.map(async (display) => {
            // Online = an actually-synced TV is checking in: a paired device
            // polling (the normal case) or a slug-only TV reporting a content
            // heartbeat. Admin browsing no longer stamps either, so unpaired
            // slots read offline.
            const heartbeatFresh = display.heartbeat
              ? now.getTime() - display.heartbeat.reportedAt.getTime() < HEARTBEAT_THRESHOLD_MS
              : false;
            const deviceFresh = display.device?.lastSeenAt
              ? now.getTime() - display.device.lastSeenAt.getTime() < DEVICE_THRESHOLD_MS
              : false;
            const online = heartbeatFresh || deviceFresh;

            // Mirror the exact same landscape-pool resolution the TV content
            // route uses, so this tile's preview always matches what's really
            // on screen instead of guessing from raw assignments.
            const landscape = await resolveLandscapeDisplay(
              {
                id: display.id,
                roomId: room.id,
                active: display.active,
                orientation: display.orientation,
                screensaverOverride: display.screensaverOverride,
                room: { carouselActive: room.carouselActive, carouselStartedAt: room.carouselStartedAt },
              },
              now
            );

            let mode: HubDisplayStatus["mode"];
            let content: ContentLite | undefined;

            if (landscape.mode === "screensaver") {
              mode = "screensaver";
            } else if (landscape.mode === "carousel") {
              mode = "carousel";
              const { ring, position, tick } = landscape.carousel;
              const n = ring.length;
              const idx = (((position + tick) % n) + n) % n;
              content = contentById.get(ring[idx].id);
            } else if (landscape.mode === "playlist") {
              mode = "playlist";
              content = landscape.playlist[0] ? contentById.get(landscape.playlist[0].id) : undefined;
            } else {
              // Normal per-display scheduling (portrait, or a landscape
              // display currently showing its own video). Its own multi-item
              // playlist advances on an unsynced local TV timer, so prefer
              // what the TV itself last reported playing (heartbeat) over a
              // guess — the server can't compute "current index" the way it
              // can for the deterministic landscape pool above.
              const resolved = resolveContentForDisplay(display, now);
              mode = resolved.mode;
              const matchedAssignment = display.heartbeat?.currentContentId
                ? display.assignments.find((a) => a.contentItem.id === display.heartbeat!.currentContentId)
                : undefined;
              const firstPlaylistId = resolved.mode === "playlist" ? resolved.playlist[0]?.id : undefined;
              const fallbackAssignment = firstPlaylistId
                ? display.assignments.find((a) => a.contentItem.id === firstPlaylistId)
                : undefined;
              content = (matchedAssignment ?? fallbackAssignment)?.contentItem;
            }

            return {
              id: display.id,
              slug: display.slug,
              name: display.name,
              number: display.number,
              active: display.active,
              orientation: display.orientation,
              mode,
              currentContent: content
                ? { id: content.id, type: content.type, thumbnailUrl: content.thumbnailUrl, title: content.title }
                : null,
              online,
              lastSeenAt: display.heartbeat?.reportedAt.toISOString() ?? null,
            };
          })
        ),
      }))
    ),
  };

  return NextResponse.json(payload);
}
