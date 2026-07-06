import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveContentForDisplay } from "@/lib/display/resolveContentForDisplay";

const ONLINE_THRESHOLD_MS = 45_000;

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const display = await prisma.display.findUnique({
    where: { id },
    include: {
      room: true,
      assignments: { include: { contentItem: true }, orderBy: { sortOrder: "asc" } },
      heartbeat: true,
    },
  });
  if (!display) return NextResponse.json({ error: "not found" }, { status: 404 });

  const now = new Date();
  const resolved = resolveContentForDisplay(display, now);
  const online = display.heartbeat ? now.getTime() - display.heartbeat.reportedAt.getTime() < ONLINE_THRESHOLD_MS : false;

  return NextResponse.json({
    ...display,
    mode: resolved.mode,
    online,
    lastSeenAt: display.heartbeat?.reportedAt.toISOString() ?? null,
  });
}

type PatchBody = {
  name?: string;
  number?: number;
  roomId?: string;
  active?: boolean;
  screensaverOverride?: boolean | null;
  contentFit?: "COVER" | "CONTAIN" | "FILL";
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
  if (body.regenerateSlug) data.slug = crypto.randomUUID();

  const display = await prisma.display.update({ where: { id }, data });
  return NextResponse.json(display);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.display.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
