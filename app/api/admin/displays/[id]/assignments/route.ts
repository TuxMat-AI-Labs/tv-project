import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

/** Replaces this display's active assignment with a single content item — the "Change" fast path. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { contentItemId } = (await req.json()) as { contentItemId: string };

  await prisma.$transaction([
    prisma.assignment.deleteMany({ where: { displayId: id } }),
    prisma.assignment.create({
      data: { displayId: id, contentItemId, sortOrder: 0, createdById: session.user.id },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
