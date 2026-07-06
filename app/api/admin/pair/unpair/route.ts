import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

/**
 * Unpair a device from its Display. The device keeps its identity (cookie/token)
 * but drops back to the pairing screen — its next poll mints a fresh code. Use
 * this to reassign or retire a screen from the hub.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}) as { deviceId?: string });
  const deviceId = typeof body.deviceId === "string" ? body.deviceId : "";
  if (!deviceId) return NextResponse.json({ error: "Missing deviceId." }, { status: 400 });

  const device = await prisma.device.findUnique({ where: { id: deviceId } });
  if (!device) return NextResponse.json({ error: "Device not found." }, { status: 404 });

  await prisma.device.update({
    where: { id: deviceId },
    data: { displayId: null, pairedAt: null, pairingCode: null, codeExpiresAt: null },
  });

  return NextResponse.json({ ok: true });
}
