import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActor, authorizeAssignment, authorizeDisplay } from "@/lib/auth/guard";

type PatchBody = {
  contentItemId?: string;
  displayId?: string;
  sortOrder?: number;
  startsAt?: string | null;
  endsAt?: string | null;
  daypartStart?: string | null;
  daypartEnd?: string | null;
};

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireActor();
  if ("error" in gate) return gate.error;

  const { id } = await params;
  const allowed = await authorizeAssignment(gate.actor, id);
  if ("error" in allowed) return allowed.error;

  const body = (await req.json()) as PatchBody;

  // Moving an assignment to another display needs the DESTINATION authorized
  // too — guarding only where it currently lives would let a room-scoped user
  // push their row onto a display in a room they cannot touch.
  if (body.displayId !== undefined) {
    const dest = await authorizeDisplay(gate.actor, body.displayId);
    if ("error" in dest) return dest.error;
  }

  const data: Record<string, unknown> = {};
  if (body.contentItemId !== undefined) data.contentItemId = body.contentItemId;
  if (body.displayId !== undefined) data.displayId = body.displayId;
  if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder;
  if (body.startsAt !== undefined) data.startsAt = body.startsAt ? new Date(body.startsAt) : null;
  if (body.endsAt !== undefined) data.endsAt = body.endsAt ? new Date(body.endsAt) : null;
  if (body.daypartStart !== undefined) data.daypartStart = body.daypartStart;
  if (body.daypartEnd !== undefined) data.daypartEnd = body.daypartEnd;

  const assignment = await prisma.assignment.update({ where: { id }, data });
  return NextResponse.json(assignment);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireActor();
  if ("error" in gate) return gate.error;

  const { id } = await params;
  const allowed = await authorizeAssignment(gate.actor, id);
  if ("error" in allowed) return allowed.error;
  await prisma.assignment.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
