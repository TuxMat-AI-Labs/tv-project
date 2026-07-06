import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const body = await req.json().catch(() => ({}) as { currentContentId?: string | null });

  const display = await prisma.display.findUnique({ where: { slug } });
  if (!display) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  await prisma.heartbeat.upsert({
    where: { displayId: display.id },
    create: { displayId: display.id, currentContentId: body.currentContentId ?? null },
    update: { currentContentId: body.currentContentId ?? null, reportedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
