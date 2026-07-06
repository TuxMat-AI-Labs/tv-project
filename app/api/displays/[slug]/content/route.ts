import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveContentForDisplay } from "@/lib/display/resolveContentForDisplay";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const display = await prisma.display.findUnique({
    where: { slug },
    include: { assignments: { include: { contentItem: true } } },
  });

  if (!display) {
    return NextResponse.json({ mode: "inactive", serverTime: new Date().toISOString() }, { status: 404 });
  }

  const now = new Date();
  const resolved = resolveContentForDisplay(display, now);

  return NextResponse.json({
    ...resolved,
    contentFit: display.contentFit,
    serverTime: now.toISOString(),
  });
}
