import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { canManageContent } from "@/lib/auth/roles";

/**
 * Re-tags a library item's orientation and/or its room rotation membership
 * (`rotationRoomId` — null means "not in any room's rotation"). Enforces the
 * invariant that only an IMAGE item can be in a rotation (either orientation
 * — LANDSCAPE and PORTRAIT each rotate within their own same-orientation
 * pool): a VIDEO or a WEBPAGE is rejected outright.
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

  // undefined = leave rotationRoomId untouched.
  let rotationRoomId: string | null | undefined;
  if (hasRotation) {
    if (body.rotationRoomId !== null) {
      // Allow-list, not a deny-list: the rotation pool query selects
      // `type: "IMAGE"` explicitly, so any type added later would be accepted
      // here and then silently never appear on screen.
      if (current.type !== "IMAGE") {
        return NextResponse.json(
          { error: `only an image can join a room's rotation (this is a ${current.type.toLowerCase()})` },
          { status: 400 },
        );
      }
      const room = await prisma.room.findUnique({ where: { id: body.rotationRoomId }, select: { id: true } });
      if (!room) return NextResponse.json({ error: "room not found" }, { status: 400 });
    }
    rotationRoomId = body.rotationRoomId;
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

/**
 * Removes a library item.
 *
 * Refuses while the item is assigned to a display, and names the displays. The
 * alternative — cascading the delete — would silently blank a screen on the wall
 * that nobody is looking at, which is a worse outcome than an error message.
 * Change those displays to something else first.
 *
 * Leaves the underlying file in R2. Storage is cheap, an accidental delete is
 * not, and a stored object with no row is harmless.
 */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id || !canManageContent(session.user.role)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const item = await prisma.contentItem.findUnique({
    where: { id },
    select: {
      title: true,
      assignments: { select: { display: { select: { name: true } } } },
    },
  });
  if (!item) return NextResponse.json({ error: "not found" }, { status: 404 });

  if (item.assignments.length > 0) {
    const where = [...new Set(item.assignments.map((a) => a.display.name))].join(", ");
    return NextResponse.json(
      { error: `Still assigned to ${where}. Change those displays first, then delete.` },
      { status: 409 },
    );
  }

  await prisma.contentItem.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
