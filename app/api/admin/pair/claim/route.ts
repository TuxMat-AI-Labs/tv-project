import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { normalizeCode } from "@/lib/device";

/**
 * Admin approves an unpaired TV: match its pairing code, then bind the device to
 * a Display (existing or newly created). Runs in the admin's signed-in session,
 * so no credential ever touches the TV.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}) as Record<string, unknown>);
  const code = typeof body.code === "string" ? normalizeCode(body.code) : "";
  if (!code) return NextResponse.json({ error: "Enter the code shown on the TV." }, { status: 400 });

  const device = await prisma.device.findUnique({ where: { pairingCode: code } });
  if (!device) {
    return NextResponse.json({ error: "That code wasn't found. Check the TV and try again." }, { status: 404 });
  }
  if (device.displayId) {
    return NextResponse.json({ error: "That screen is already paired." }, { status: 409 });
  }
  if (!device.codeExpiresAt || device.codeExpiresAt.getTime() < Date.now()) {
    return NextResponse.json({ error: "That code has expired — it refreshes on the TV shortly." }, { status: 410 });
  }

  // Resolve the target Display: an existing one, or a freshly created one.
  const newDisplay = body.newDisplay as { name?: unknown; roomId?: unknown; number?: unknown } | undefined;
  let displayId: string;
  if (newDisplay && typeof newDisplay.name === "string" && typeof newDisplay.roomId === "string") {
    const name = newDisplay.name.trim();
    if (!name) return NextResponse.json({ error: "Give the new display a name." }, { status: 400 });
    const room = await prisma.room.findUnique({ where: { id: newDisplay.roomId } });
    if (!room) return NextResponse.json({ error: "Pick a valid room." }, { status: 400 });
    const number = Number(newDisplay.number);
    const created = await prisma.display.create({
      data: { name, number: Number.isFinite(number) && number > 0 ? number : 1, roomId: room.id },
    });
    displayId = created.id;
  } else if (typeof body.displayId === "string") {
    const display = await prisma.display.findUnique({ where: { id: body.displayId } });
    if (!display) return NextResponse.json({ error: "Pick a valid display." }, { status: 400 });
    displayId = display.id;
  } else {
    return NextResponse.json({ error: "Choose a display to assign this screen to." }, { status: 400 });
  }

  // One device per Display: if the target already has a screen, unpair it so the
  // new TV takes over (e.g. swapping a dead panel). The old TV returns to pairing.
  await prisma.device.updateMany({
    where: { displayId, id: { not: device.id } },
    data: { displayId: null, pairedAt: null, pairingCode: null, codeExpiresAt: null },
  });

  const label = typeof body.label === "string" && body.label.trim() ? body.label.trim() : null;
  await prisma.device.update({
    where: { id: device.id },
    data: { displayId, pairedAt: new Date(), pairingCode: null, codeExpiresAt: null, label },
  });

  const display = await prisma.display.findUnique({ where: { id: displayId }, include: { room: true } });
  return NextResponse.json({ ok: true, display });
}
