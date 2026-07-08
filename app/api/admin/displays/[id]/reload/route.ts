import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Remotely reloads a TV's browser page: bumps `reloadRequestedAt`, which the
// player notices on its next content poll (~15s) and acts on with a plain
// window.location.reload() — no on-device action needed.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const display = await prisma.display.update({
    where: { id },
    data: { reloadRequestedAt: new Date() },
  });
  return NextResponse.json({ ok: true, reloadRequestedAt: display.reloadRequestedAt });
}
