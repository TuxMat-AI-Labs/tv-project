import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

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
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json()) as PostBody;

  const assignment = await prisma.assignment.create({
    data: {
      contentItemId: body.contentItemId,
      displayId: body.displayId,
      sortOrder: body.sortOrder ?? 0,
      startsAt: body.startsAt ? new Date(body.startsAt) : null,
      endsAt: body.endsAt ? new Date(body.endsAt) : null,
      daypartStart: body.daypartStart ?? null,
      daypartEnd: body.daypartEnd ?? null,
      createdById: session.user.id,
    },
  });

  return NextResponse.json(assignment, { status: 201 });
}
