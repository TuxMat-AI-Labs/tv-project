import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

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
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = (await req.json()) as PatchBody;

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
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.assignment.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
