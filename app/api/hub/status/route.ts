import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { faultsFor } from "@/lib/display/viewportHealth";
import { resolveContentForDisplay } from "@/lib/display/resolveContentForDisplay";
import { resolveLandscapeDisplay } from "@/lib/display/landscapeCarousel";
import { currentRingIndex } from "@/lib/display/resolveRoomCarousel";
import type { HubDisplayStatus, HubStatusResponse } from "@/lib/hub/types";

export const dynamic = "force-dynamic";

const HEARTBEAT_THRESHOLD_MS = 45_000;
const DEVICE_THRESHOLD_MS = 60_000; // a paired TV checks in via /api/tv/register

type ContentLite = {
  id: string;
  type: "IMAGE" | "VIDEO" | "WEBPAGE";
  thumbnailUrl: string | null;
  fileUrl: string;
  title: string;
};

export async function GET() {
  // Authenticated HERE, not by the middleware: its matcher covers /hub/* and
  // /api/admin/*, so /api/hub/* was never gated and this returned the entire
  // hub — every room, every display, and every display's SLUG — to anyone who
  // asked. Those slugs are the only thing protecting the TV URLs
  // ("permanent, unguessable"), so leaking them undoes that model, and the
  // payload also carries each panel's viewport telemetry.
  //
  // Kept in the route rather than widening the matcher so it cannot be lost
  // again by an unrelated change to the middleware's paths.
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

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

  // Every content item the dashboard might need to name: anything referenced by
  // an assignment, PLUS every item tagged into a room's rotation pool.
  //
  // The pool matters separately because `rotationRoomId` is set directly on the
  // library item and is independent of any Assignment — so a rotating item need
  // not be assigned to any display. Building this map from assignments alone
  // meant those lookups missed, `currentContent` came back null, and a rotating
  // display rendered as a black tile reading "Rotating" with no way to tell
  // what was actually on the wall.
  const poolItems = await prisma.contentItem.findMany({ where: { rotationRoomId: { not: null } } });

  const contentById = new Map<string, ContentLite>();
  const remember = (ci: { id: string; type: ContentLite["type"]; thumbnailUrl: string | null; fileUrl: string; title: string }) =>
    contentById.set(ci.id, {
      id: ci.id,
      type: ci.type,
      thumbnailUrl: ci.thumbnailUrl,
      fileUrl: ci.fileUrl,
      title: ci.title,
    });

  for (const room of rooms) {
    for (const d of room.displays) {
      for (const a of d.assignments) remember(a.contentItem);
    }
  }
  for (const ci of poolItems) remember(ci);

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

            // How the screen says it is rendering. Only trusted while the
            // heartbeat is fresh: a stale reading describes how the wall looked
            // whenever this TV last checked in, which could be days ago, and
            // showing that as a live fault would be worse than showing nothing.
            const viewport = heartbeatFresh && display.heartbeat
              ? {
                  width: display.heartbeat.viewportWidth,
                  height: display.heartbeat.viewportHeight,
                  screenWidth: display.heartbeat.screenWidth,
                  screenHeight: display.heartbeat.screenHeight,
                  pixelRatio: display.heartbeat.pixelRatio,
                }
              : null;
            const viewportFaults = faultsFor(
              viewport && {
                viewportWidth: viewport.width,
                viewportHeight: viewport.height,
                screenWidth: viewport.screenWidth,
                screenHeight: viewport.screenHeight,
                pixelRatio: viewport.pixelRatio,
              },
            ).map((f) => ({ kind: f.kind, short: f.short, detail: f.detail }));

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
            } else if (landscape.mode === "black") {
              mode = "black";
            } else if (landscape.mode === "carousel") {
              mode = "carousel";
              const { ring, position, tick } = landscape.carousel;
              const idx = currentRingIndex(position, tick, ring.length);
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
                ? {
                    id: content.id,
                    type: content.type,
                    thumbnailUrl: content.thumbnailUrl,
                    fileUrl: content.fileUrl,
                    title: content.title,
                  }
                : null,
              online,
              lastSeenAt: display.heartbeat?.reportedAt.toISOString() ?? null,
              viewport,
              viewportFaults,
            };
          })
        ),
      }))
    ),
    // Same marker the TV content route serves, so the hub (notably the
    // installed PWA, which can stay open for days) can notice a new deploy and
    // reload itself instead of running a stale bundle.
    buildId: process.env.RENDER_GIT_COMMIT ?? "dev",
  };

  return NextResponse.json(payload);
}
