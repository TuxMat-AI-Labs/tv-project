import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

/** List paired/known TV devices for the hub pairing UI. */
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const devices = await prisma.device.findMany({
    orderBy: [{ pairedAt: "desc" }, { createdAt: "desc" }],
    include: { display: { include: { room: true } } },
  });

  return NextResponse.json({
    devices: devices.map((d) => ({
      id: d.id,
      label: d.label,
      paired: Boolean(d.displayId),
      pairedAt: d.pairedAt?.toISOString() ?? null,
      lastSeenAt: d.lastSeenAt?.toISOString() ?? null,
      display: d.display
        ? { id: d.display.id, name: d.display.name, number: d.display.number, room: { name: d.display.room.name } }
        : null,
    })),
  });
}
