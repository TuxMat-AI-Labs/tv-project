import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canManageContent, canManageRoom } from "@/lib/auth/roles";

export type Actor = { id: string; role: "ADMIN" | "MARKETING" | "VIEWER"; scopedRoomSlug: string | null };

/**
 * Server-side authorization for "may this person change what plays here?".
 *
 * Room scoping has to be enforced here and not only in the UI. A scoped user's
 * view never offers another room's displays, but the API takes a display id
 * straight from the request body — hiding a control is not access control, and
 * posting someone else's display id is a one-line curl.
 */
export async function requireActor(): Promise<{ actor: Actor } | { error: NextResponse }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  }
  if (!canManageContent(session.user.role)) {
    return { error: NextResponse.json({ error: "forbidden" }, { status: 403 }) };
  }
  return {
    actor: {
      id: session.user.id,
      role: session.user.role,
      scopedRoomSlug: session.user.scopedRoomSlug ?? null,
    },
  };
}

/**
 * Confirms the actor may manage the room this display sits in.
 *
 * Returns the display's room slug on success so a caller can log or branch on
 * it. A display id that does not exist is a 404 rather than a 403: it is not a
 * permissions answer, and conflating the two makes a genuine typo look like an
 * access problem.
 */
export async function authorizeDisplay(
  actor: Actor,
  displayId: string
): Promise<{ roomSlug: string } | { error: NextResponse }> {
  const display = await prisma.display.findUnique({
    where: { id: displayId },
    select: { room: { select: { slug: true } } },
  });
  if (!display) {
    return { error: NextResponse.json({ error: "display not found" }, { status: 404 }) };
  }
  if (!canManageRoom(actor.role, actor.scopedRoomSlug, display.room.slug)) {
    return {
      error: NextResponse.json(
        { error: `forbidden: you can only manage the ${actor.scopedRoomSlug} room` },
        { status: 403 }
      ),
    };
  }
  return { roomSlug: display.room.slug };
}

/**
 * Same check for an existing assignment, reached by its own id.
 *
 * Guards the room the assignment currently lives in. A caller that also MOVES
 * an assignment to another display must additionally authorize the destination
 * with `authorizeDisplay`, or a scoped user could push their own row onto a
 * display in a room they cannot touch.
 */
export async function authorizeAssignment(
  actor: Actor,
  assignmentId: string
): Promise<{ roomSlug: string } | { error: NextResponse }> {
  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    select: { display: { select: { room: { select: { slug: true } } } } },
  });
  if (!assignment) {
    return { error: NextResponse.json({ error: "assignment not found" }, { status: 404 }) };
  }
  const roomSlug = assignment.display.room.slug;
  if (!canManageRoom(actor.role, actor.scopedRoomSlug, roomSlug)) {
    return {
      error: NextResponse.json(
        { error: `forbidden: you can only manage the ${actor.scopedRoomSlug} room` },
        { status: 403 }
      ),
    };
  }
  return { roomSlug };
}
