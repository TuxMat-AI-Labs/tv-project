import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const body = await req.json().catch(
    () =>
      ({}) as {
        currentContentId?: string | null;
        viewportWidth?: number | null;
        viewportHeight?: number | null;
        screenWidth?: number | null;
        screenHeight?: number | null;
        pixelRatio?: number | null;
      },
  );

  // The TV's own report of how it is rendering — see lib/display/viewportHealth.
  // Coerced rather than trusted: this endpoint is unauthenticated by design (a
  // screen cannot sign in), so a bad or hostile body must not be able to write
  // nonsense into the record the hub reads. Anything not a finite positive
  // number lands as null, which reads as "not reporting".
  const num = (v: unknown, max: number): number | null => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 && n <= max ? n : null;
  };
  const viewport = {
    viewportWidth: num(body.viewportWidth, 32_000),
    viewportHeight: num(body.viewportHeight, 32_000),
    screenWidth: num(body.screenWidth, 32_000),
    screenHeight: num(body.screenHeight, 32_000),
    pixelRatio: num(body.pixelRatio, 16),
  };

  const display = await prisma.display.findUnique({ where: { slug } });
  if (!display) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  await prisma.heartbeat.upsert({
    where: { displayId: display.id },
    create: { displayId: display.id, currentContentId: body.currentContentId ?? null, ...viewport },
    update: { currentContentId: body.currentContentId ?? null, reportedAt: new Date(), ...viewport },
  });

  return NextResponse.json({ ok: true });
}
