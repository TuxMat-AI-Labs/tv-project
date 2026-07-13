import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { canManageContent } from "@/lib/auth/roles";

/** Currently only supports re-tagging a library item's orientation. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id || !canManageContent(session.user.role)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = (await req.json().catch(() => null)) as { orientation?: string } | null;
  if (body?.orientation !== "PORTRAIT" && body?.orientation !== "LANDSCAPE") {
    return NextResponse.json({ error: "orientation must be PORTRAIT or LANDSCAPE" }, { status: 400 });
  }

  const item = await prisma.contentItem.update({
    where: { id },
    data: { orientation: body.orientation },
  });

  return NextResponse.json(item);
}
