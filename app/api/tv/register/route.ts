import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import {
  DEVICE_COOKIE,
  DEVICE_COOKIE_MAX_AGE,
  CODE_TTL_MS,
  generateToken,
  generatePairingCode,
} from "@/lib/device";

export const dynamic = "force-dynamic";

// Canonical public origin — set in production (AUTH_URL), falls back to the
// request origin locally. Used to build the pairing deep link encoded in the QR.
function baseUrl(req: NextRequest): string {
  return process.env.AUTH_URL ?? req.nextUrl.origin;
}

// Create a Device with a unique token + pairing code, retrying on the (rare)
// unique-constraint collision.
async function createDevice() {
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      return await prisma.device.create({
        data: {
          token: generateToken(),
          pairingCode: generatePairingCode(),
          codeExpiresAt: new Date(Date.now() + CODE_TTL_MS),
        },
      });
    } catch {
      // token/code collision — try again with fresh values
    }
  }
  throw new Error("could not allocate a device");
}

// Ensure the device has a fresh, unexpired pairing code; regenerate if needed.
async function ensureCode(deviceId: string, current: string | null, expiresAt: Date | null) {
  if (current && expiresAt && expiresAt.getTime() > Date.now()) return current;
  for (let attempt = 0; attempt < 6; attempt++) {
    const pairingCode = generatePairingCode();
    try {
      await prisma.device.update({
        where: { id: deviceId },
        data: { pairingCode, codeExpiresAt: new Date(Date.now() + CODE_TTL_MS) },
      });
      return pairingCode;
    } catch {
      // code collision — retry
    }
  }
  throw new Error("could not allocate a pairing code");
}

/**
 * Called on a loop by the `/tv` screen. Identifies the TV via its httpOnly
 * device cookie (minting one on first contact), stamps presence, and returns
 * either the paired Display's slug or a fresh pairing code + QR deep link.
 */
export async function POST(req: NextRequest) {
  const token = req.cookies.get(DEVICE_COOKIE)?.value;

  let existing = token ? await prisma.device.findUnique({ where: { token } }) : null;
  let mintedToken: string | null = null;
  if (!existing) {
    existing = await createDevice();
    mintedToken = existing.token;
  }

  // Stamp presence and reload with the linked Display in one round-trip.
  const device = await prisma.device.update({
    where: { id: existing.id },
    data: { lastSeenAt: new Date() },
    include: { display: true },
  });

  let payload:
    | { status: "paired"; slug: string }
    | { status: "unpaired"; code: string; pairUrl: string; qrDataUrl: string };

  if (device.displayId && device.display) {
    payload = { status: "paired", slug: device.display.slug };
  } else {
    const code = await ensureCode(device.id, device.pairingCode, device.codeExpiresAt);
    const pairUrl = `${baseUrl(req)}/hub/pair?code=${encodeURIComponent(code)}`;
    const qrDataUrl = await QRCode.toDataURL(pairUrl, {
      margin: 1,
      width: 512,
      color: { dark: "#141414", light: "#ffffff" },
    });
    payload = { status: "unpaired", code, pairUrl, qrDataUrl };
  }

  const res = NextResponse.json(payload);
  if (mintedToken) {
    res.cookies.set(DEVICE_COOKIE, mintedToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: DEVICE_COOKIE_MAX_AGE,
      path: "/",
    });
  }
  return res;
}
