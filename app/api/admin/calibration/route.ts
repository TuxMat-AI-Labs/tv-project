import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { CALIBRATION_SETTING_KEY } from "@/lib/display/calibration";

/**
 * Turns the on-screen registration markers on or off across every display.
 *
 * Admin only, and under /api/admin so the middleware enforces that. It puts a
 * full-screen overlay on the whole wall, so it is not something a room-scoped
 * marketing user should be able to trigger.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { enabled } = (await req.json().catch(() => ({}))) as { enabled?: boolean };
  const value = enabled ? "1" : "0";

  await prisma.setting.upsert({
    where: { key: CALIBRATION_SETTING_KEY },
    create: { key: CALIBRATION_SETTING_KEY, value },
    update: { value },
  });

  // No reload needed: the TVs pick this up on their next content poll, within
  // about 15 seconds, so nobody has to touch a panel to run the test.
  return NextResponse.json({ ok: true, enabled: value === "1" });
}
