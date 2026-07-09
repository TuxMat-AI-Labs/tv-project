import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SCREENSAVER_STYLE_SETTING_KEY, coerceScreensaverVariant } from "@/lib/screensaver";

export const dynamic = "force-dynamic";

// The globally-selected screensaver style. Admin-authed via proxy.ts middleware
// (like the other /api/admin routes). GET reads it, PUT sets it; the value is a
// single app-wide Setting row that the content route serves to every TV.

export async function GET() {
  const row = await prisma.setting.findUnique({ where: { key: SCREENSAVER_STYLE_SETTING_KEY } });
  return NextResponse.json({ style: coerceScreensaverVariant(row?.value) });
}

export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const style = coerceScreensaverVariant((body as { style?: unknown })?.style);
  await prisma.setting.upsert({
    where: { key: SCREENSAVER_STYLE_SETTING_KEY },
    update: { value: style },
    create: { key: SCREENSAVER_STYLE_SETTING_KEY, value: style },
  });
  return NextResponse.json({ ok: true, style });
}
