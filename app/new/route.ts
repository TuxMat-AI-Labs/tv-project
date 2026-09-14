import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DEVICE_COOKIE } from "@/lib/device";

export const dynamic = "force-dynamic";

/**
 * "Forget this screen and start over." Type `…/new` on a panel and it drops its
 * identity, then lands on a fresh pairing QR.
 *
 * A new URL alone could never do this. Which display a panel *is* lives in its
 * device cookie, not in the address, so pointing an already-paired screen at
 * /screen or /tv just resumes playing whatever that display shows — which is
 * exactly what happened. This clears the cookie, so the next poll mints a brand
 * new device and the screen shows a code that can be claimed against any
 * display record.
 *
 * It is also the fix for a panel bound to the WRONG record. Re-pair each screen
 * while standing in front of it and the physical wall and the hub agree again,
 * with no guessing about which slug is which panel.
 *
 * Unauthenticated, because a TV cannot sign in — but it only ever affects the
 * device whose cookie is presented. Without that cookie it does nothing, so
 * nobody can unpair someone else's screen by loading this URL.
 */
export async function GET(req: NextRequest) {
  const token = req.cookies.get(DEVICE_COOKIE)?.value;

  if (token) {
    // Released rather than deleted: the row carries pairing history, and
    // orphaning it costs nothing while deleting throws away the record of what
    // this panel used to be.
    await prisma.device
      .updateMany({
        where: { token },
        data: { displayId: null, pairedAt: null, pairingCode: null, codeExpiresAt: null },
      })
      .catch(() => {});
  }

  const res = NextResponse.redirect(new URL("/screen", req.nextUrl.origin));
  // Expire the cookie on the panel itself, so the next request arrives with no
  // identity at all and /api/tv/register mints a fresh device.
  res.cookies.set(DEVICE_COOKIE, "", { path: "/", maxAge: 0 });
  // The redirect target must not come from a cache either, or the panel could
  // land back on a stored copy of the page it was already showing.
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  return res;
}
