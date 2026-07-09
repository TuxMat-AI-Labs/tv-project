import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

/**
 * Test/demo helper: assigns every content-library item to every display in
 * this room as an ordered playlist, so the PlaylistPlayer's push-slide
 * transition (components/display/PlaylistPlayer.tsx) actually has more than
 * one item to cycle through. Also forces displays active + screensaver off
 * so the carousel is visible immediately regardless of business hours.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: roomId } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [displays, items] = await Promise.all([
    prisma.display.findMany({ where: { roomId }, select: { id: true } }),
    prisma.contentItem.findMany({ orderBy: { createdAt: "asc" }, select: { id: true } }),
  ]);

  if (displays.length === 0) {
    return NextResponse.json({ error: "No displays in this room." }, { status: 400 });
  }
  if (items.length < 2) {
    return NextResponse.json({ error: "Need at least 2 items in the content library to demo a carousel." }, { status: 400 });
  }

  const displayIds = displays.map((d) => d.id);

  await prisma.$transaction([
    prisma.assignment.deleteMany({ where: { displayId: { in: displayIds } } }),
    prisma.assignment.createMany({
      data: displayIds.flatMap((displayId) =>
        items.map((item, sortOrder) => ({
          displayId,
          contentItemId: item.id,
          sortOrder,
          createdById: session.user.id,
        }))
      ),
    }),
    prisma.display.updateMany({
      where: { id: { in: displayIds } },
      data: { active: true, screensaverOverride: false },
    }),
  ]);

  return NextResponse.json({ ok: true, displays: displayIds.length, items: items.length });
}
