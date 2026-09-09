import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveContentForDisplay } from "@/lib/display/resolveContentForDisplay";
import { faultsFor } from "@/lib/display/viewportHealth";

const HEARTBEAT_THRESHOLD_MS = 45_000;
const DEVICE_THRESHOLD_MS = 60_000;

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const display = await prisma.display.findUnique({
    where: { id },
    include: {
      room: true,
      assignments: { include: { contentItem: true }, orderBy: { sortOrder: "asc" } },
      heartbeat: true,
      device: true,
    },
  });
  if (!display) return NextResponse.json({ error: "not found" }, { status: 404 });

  const now = new Date();
  const resolved = resolveContentForDisplay(display, now);
  const heartbeatFresh = display.heartbeat
    ? now.getTime() - display.heartbeat.reportedAt.getTime() < HEARTBEAT_THRESHOLD_MS
    : false;
  const deviceFresh = display.device?.lastSeenAt
    ? now.getTime() - display.device.lastSeenAt.getTime() < DEVICE_THRESHOLD_MS
    : false;
  const online = heartbeatFresh || deviceFresh;

  // Only while the heartbeat is fresh: a stale reading describes how this wall
  // looked whenever the TV last checked in, and presenting that as current would
  // be worse than presenting nothing.
  const viewport = heartbeatFresh && display.heartbeat
    ? {
        viewportWidth: display.heartbeat.viewportWidth,
        viewportHeight: display.heartbeat.viewportHeight,
        screenWidth: display.heartbeat.screenWidth,
        screenHeight: display.heartbeat.screenHeight,
        pixelRatio: display.heartbeat.pixelRatio,
      }
    : null;

  return NextResponse.json({
    ...display,
    mode: resolved.mode,
    online,
    lastSeenAt: display.heartbeat?.reportedAt.toISOString() ?? null,
    viewport,
    viewportFaults: faultsFor(viewport).map((f) => ({ kind: f.kind, detail: f.detail })),
  });
}

type PatchBody = {
  name?: string;
  number?: number;
  roomId?: string;
  active?: boolean;
  screensaverOverride?: boolean | null;
  contentFit?: "COVER" | "CONTAIN" | "FILL";
  orientation?: "PORTRAIT" | "LANDSCAPE";
  joinsRotation?: boolean;
  regenerateSlug?: boolean;
};

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await req.json()) as PatchBody;

  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.number !== undefined) data.number = body.number;
  if (body.roomId !== undefined) data.roomId = body.roomId;
  if (body.active !== undefined) data.active = body.active;
  if (body.screensaverOverride !== undefined) data.screensaverOverride = body.screensaverOverride;
  if (body.contentFit !== undefined) data.contentFit = body.contentFit;
  if (body.joinsRotation !== undefined) data.joinsRotation = body.joinsRotation;
  if (body.orientation !== undefined) data.orientation = body.orientation;
  if (body.regenerateSlug) data.slug = crypto.randomUUID();

  const display = await prisma.display.update({ where: { id }, data });
  return NextResponse.json(display);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    // Clear everything that FK-references this Display first (no onDelete
    // cascade in the schema) — including its paired Device, so the TV drops
    // back to a fresh pairing screen instead of leaving an orphaned row.
    await prisma.$transaction([
      prisma.assignment.deleteMany({ where: { displayId: id } }),
      prisma.heartbeat.deleteMany({ where: { displayId: id } }),
      prisma.device.deleteMany({ where: { displayId: id } }),
      prisma.display.delete({ where: { id } }),
    ]);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete display." }, { status: 500 });
  }
}
