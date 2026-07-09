import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

/**
 * Toggles the room's synchronized video-wall carousel on/off. When on, every
 * active display in the room rotates its "home" graphic to the next display on
 * a shared, server-timed beat (see lib/display/resolveRoomCarousel.ts and
 * components/display/CarouselPlayer.tsx). This does not touch any content
 * assignments — turning it off simply drops each display back to its own
 * graphic. `carouselStartedAt` is the anchor every display's rotation tick is
 * computed from, so it's stamped fresh each time the carousel starts.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: roomId } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const room = await prisma.room.findUnique({ where: { id: roomId }, select: { carouselActive: true } });
  if (!room) return NextResponse.json({ error: "Room not found." }, { status: 404 });

  const active = !room.carouselActive;
  await prisma.room.update({
    where: { id: roomId },
    data: { carouselActive: active, carouselStartedAt: active ? new Date() : null },
  });

  return NextResponse.json({ ok: true, active });
}
