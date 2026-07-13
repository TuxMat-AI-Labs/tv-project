import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveContentForDisplay } from "@/lib/display/resolveContentForDisplay";
import type { HubStatusResponse } from "@/lib/hub/types";

export const dynamic = "force-dynamic";

const HEARTBEAT_THRESHOLD_MS = 45_000;
const DEVICE_THRESHOLD_MS = 60_000; // a paired TV checks in via /api/tv/register

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

  const payload: HubStatusResponse = {
    rooms: rooms.map((room) => ({
      id: room.id,
      name: room.name,
      slug: room.slug,
      carouselActive: room.carouselActive,
      displays: room.displays.map((display) => {
        const resolved = resolveContentForDisplay(display, now);
        // Online = an actually-synced TV is checking in: a paired device polling
        // (the normal case) or a slug-only TV reporting a content heartbeat.
        // Admin browsing no longer stamps either, so unpaired slots read offline.
        const heartbeatFresh = display.heartbeat
          ? now.getTime() - display.heartbeat.reportedAt.getTime() < HEARTBEAT_THRESHOLD_MS
          : false;
        const deviceFresh = display.device?.lastSeenAt
          ? now.getTime() - display.device.lastSeenAt.getTime() < DEVICE_THRESHOLD_MS
          : false;
        const online = heartbeatFresh || deviceFresh;

        const matchedAssignment = display.heartbeat?.currentContentId
          ? display.assignments.find((a) => a.contentItem.id === display.heartbeat!.currentContentId)
          : undefined;

        // Fall back to the first scheduled item so a tile shows its artwork even
        // before any TV has reported a heartbeat.
        const firstPlaylistId = resolved.mode === "playlist" ? resolved.playlist[0]?.id : undefined;
        const fallbackAssignment = firstPlaylistId
          ? display.assignments.find((a) => a.contentItem.id === firstPlaylistId)
          : undefined;
        const content = (matchedAssignment ?? fallbackAssignment)?.contentItem;

        return {
          id: display.id,
          slug: display.slug,
          name: display.name,
          number: display.number,
          active: display.active,
          orientation: display.orientation,
          mode: resolved.mode,
          currentContent: content
            ? {
                id: content.id,
                type: content.type,
                thumbnailUrl: content.thumbnailUrl,
                title: content.title,
              }
            : null,
          online,
          lastSeenAt: display.heartbeat?.reportedAt.toISOString() ?? null,
        };
      }),
    })),
  };

  return NextResponse.json(payload);
}
