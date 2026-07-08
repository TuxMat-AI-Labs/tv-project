import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveContentForDisplay } from "@/lib/display/resolveContentForDisplay";

export const dynamic = "force-dynamic";

// The TV's client-side poll already sets fetch({ cache: "no-store" }), but a
// Smart TV browser's HTTP cache or an intermediate proxy can still apply
// heuristic caching to a GET response with no explicit directives — an
// explicit "no-store" here closes that gap so a TV can never poll into a
// stale playlist/reload signal.
const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const display = await prisma.display.findUnique({
    where: { slug },
    include: { assignments: { include: { contentItem: true } } },
  });

  if (!display) {
    return NextResponse.json(
      { mode: "inactive", serverTime: new Date().toISOString() },
      { status: 404, headers: NO_STORE_HEADERS }
    );
  }

  const now = new Date();
  const resolved = resolveContentForDisplay(display, now);

  return NextResponse.json(
    {
      ...resolved,
      contentFit: display.contentFit,
      reloadRequestedAt: display.reloadRequestedAt?.toISOString() ?? null,
      serverTime: now.toISOString(),
    },
    { headers: NO_STORE_HEADERS }
  );
}
