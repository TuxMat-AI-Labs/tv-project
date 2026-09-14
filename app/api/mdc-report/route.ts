import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MDC_REPORT_KEY } from "@/lib/mdc/protocol";

/**
 * Receives an MDC panel dump from scripts/mdc.ts so it can be read on
 * /hub/troubleshoot alongside each screen's browser-side telemetry.
 *
 * Deliberately NOT under /api/admin: that prefix is gated by the middleware on
 * a *session* role, and this is posted by a CLI on the office LAN which has no
 * browser session. A shared token is the right shape of credential here.
 *
 * MDC_REPORT_TOKEN must be set for this to accept anything. There is no
 * default and no "open when unconfigured" fallback — an unset secret failing
 * open is how an internal endpoint quietly becomes a public one, which this
 * codebase has already been bitten by once (/api/hub/status).
 */
export async function POST(req: NextRequest) {
  const expected = process.env.MDC_REPORT_TOKEN;
  if (!expected) {
    return NextResponse.json({ error: "MDC_REPORT_TOKEN is not configured" }, { status: 503 });
  }
  if (req.headers.get("x-mdc-token") !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || !Array.isArray((body as { panels?: unknown }).panels)) {
    return NextResponse.json({ error: "expected { takenAt, panels: [...] }" }, { status: 400 });
  }

  // Stored whole, as sent. The point of the dump is the RAW bytes — the moment
  // this starts keeping only an interpretation, it loses the thing a person
  // needs when the interpretation turns out to be wrong.
  const value = JSON.stringify(body);
  if (value.length > 512_000) {
    return NextResponse.json({ error: "report too large" }, { status: 413 });
  }

  await prisma.setting.upsert({
    where: { key: MDC_REPORT_KEY },
    create: { key: MDC_REPORT_KEY, value },
    update: { value },
  });

  return NextResponse.json({ ok: true, panels: (body as { panels: unknown[] }).panels.length });
}
