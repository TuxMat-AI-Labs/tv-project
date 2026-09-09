import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActor, authorizeDisplay } from "@/lib/auth/guard";

/** Replaces this display's active assignment with a single content item — the "Change" fast path. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Room-scoped users (the marketing team, confined to the Showroom) must not
  // be able to reach another room's display by posting its id here.
  const gate = await requireActor();
  if ("error" in gate) return gate.error;
  const allowed = await authorizeDisplay(gate.actor, id);
  if ("error" in allowed) return allowed.error;

  const { contentItemId } = (await req.json()) as { contentItemId: string };
  if (!contentItemId) {
    return NextResponse.json({ error: "contentItemId is required" }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.assignment.deleteMany({ where: { displayId: id } }),
    prisma.assignment.create({
      data: { displayId: id, contentItemId, sortOrder: 0, createdById: gate.actor.id },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
