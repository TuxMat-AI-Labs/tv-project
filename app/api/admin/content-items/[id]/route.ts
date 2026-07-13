import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { canManageContent } from "@/lib/auth/roles";

/**
 * Re-tags a library item's orientation and/or its room rotation membership
 * (`rotationRoomId` — null means "not in any room's rotation"). Enforces the
 * invariant that only a LANDSCAPE, IMAGE item can be in a rotation: a VIDEO
 * is rejected outright, and dropping orientation away from LANDSCAPE while
 * still in a rotation auto-clears it rather than leaving an inconsistent row.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id || !canManageContent(session.user.role)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = (await req.json().catch(() => null)) as
    | { orientation?: string; rotationRoomId?: string | null }
    | null;
  if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });

  const hasOrientation = body.orientation !== undefined;
  const hasRotation = Object.prototype.hasOwnProperty.call(body, "rotationRoomId");
  if (!hasOrientation && !hasRotation) {
    return NextResponse.json({ error: "nothing to update" }, { status: 400 });
  }
  if (hasOrientation && body.orientation !== "PORTRAIT" && body.orientation !== "LANDSCAPE") {
    return NextResponse.json({ error: "orientation must be PORTRAIT or LANDSCAPE" }, { status: 400 });
  }

  const current = await prisma.contentItem.findUnique({
    where: { id },
    select: { type: true, orientation: true, rotationRoomId: true },
  });
  if (!current) return NextResponse.json({ error: "not found" }, { status: 404 });

  const finalOrientation = hasOrientation ? (body.orientation as "PORTRAIT" | "LANDSCAPE") : current.orientation;

  // undefined = leave rotationRoomId untouched.
  let rotationRoomId: string | null | undefined;
  if (hasRotation) {
    if (body.rotationRoomId !== null) {
      if (current.type === "VIDEO") {
        return NextResponse.json({ error: "a video can never join a room's rotation" }, { status: 400 });
      }
      if (finalOrientation !== "LANDSCAPE") {
        return NextResponse.json({ error: "only a landscape item can join a room's rotation" }, { status: 400 });
      }
      const room = await prisma.room.findUnique({ where: { id: body.rotationRoomId }, select: { id: true } });
      if (!room) return NextResponse.json({ error: "room not found" }, { status: 400 });
    }
    rotationRoomId = body.rotationRoomId;
  } else if (hasOrientation && finalOrientation !== "LANDSCAPE" && current.rotationRoomId) {
    // Leaving LANDSCAPE while still in a rotation — auto-clear to keep the
    // "only landscape rotates" invariant instead of leaving a stale pointer.
    rotationRoomId = null;
  }

  const item = await prisma.contentItem.update({
    where: { id },
    data: {
      ...(hasOrientation ? { orientation: body.orientation as "PORTRAIT" | "LANDSCAPE" } : {}),
      ...(rotationRoomId !== undefined ? { rotationRoomId } : {}),
    },
  });

  return NextResponse.json(item);
}
