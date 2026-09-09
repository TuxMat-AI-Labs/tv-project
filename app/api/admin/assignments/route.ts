import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActor, authorizeDisplay } from "@/lib/auth/guard";

export async function GET() {
  const assignments = await prisma.assignment.findMany({
    include: {
      contentItem: { select: { id: true, title: true, type: true, thumbnailUrl: true } },
      display: { select: { id: true, name: true, number: true, room: { select: { name: true } } } },
    },
    orderBy: [{ displayId: "asc" }, { sortOrder: "asc" }],
  });
  return NextResponse.json({ assignments });
}

type PostBody = {
  contentItemId: string;
  displayId: string;
  sortOrder?: number;
  startsAt?: string | null;
  endsAt?: string | null;
  daypartStart?: string | null;
  daypartEnd?: string | null;
};

export async function POST(req: NextRequest) {
  const gate = await requireActor();
  if ("error" in gate) return gate.error;

  const body = (await req.json()) as PostBody;

  // Same reason as the per-display fast path: the display id comes from the
  // request, so a room-scoped user's confinement has to be checked here.
  const allowed = await authorizeDisplay(gate.actor, body.displayId);
  if ("error" in allowed) return allowed.error;

  const assignment = await prisma.assignment.create({
    data: {
      contentItemId: body.contentItemId,
      displayId: body.displayId,
      sortOrder: body.sortOrder ?? 0,
      startsAt: body.startsAt ? new Date(body.startsAt) : null,
      endsAt: body.endsAt ? new Date(body.endsAt) : null,
      daypartStart: body.daypartStart ?? null,
      daypartEnd: body.daypartEnd ?? null,
      createdById: gate.actor.id,
    },
  });

  return NextResponse.json(assignment, { status: 201 });
}
