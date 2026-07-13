import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

/**
 * Sets a room's rotation transition — SLIDE (push) or FADE (crossfade bleed).
 * Applies to both the synchronized landscape carousel and any display's own
 * multi-item playlist in this room (see lib/display/transition.ts).
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: roomId } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { transition?: string } | null;
  if (body?.transition !== "SLIDE" && body?.transition !== "FADE") {
    return NextResponse.json({ error: "transition must be SLIDE or FADE" }, { status: 400 });
  }

  const room = await prisma.room.findUnique({ where: { id: roomId }, select: { id: true } });
  if (!room) return NextResponse.json({ error: "Room not found." }, { status: 404 });

  await prisma.room.update({ where: { id: roomId }, data: { carouselTransition: body.transition } });

  return NextResponse.json({ ok: true, transition: body.transition });
}
