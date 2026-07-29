import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { canManageContent } from "@/lib/auth/roles";

export async function GET() {
  const items = await prisma.contentItem.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      type: true,
      thumbnailUrl: true,
      fileUrl: true,
      orientation: true,
      rotationRoomId: true,
    },
  });
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || !canManageContent(session.user.role)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as {
    title: string;
    type: "IMAGE" | "VIDEO" | "WEBPAGE";
    fileUrl: string;
    thumbnailUrl?: string;
    durationSec?: number;
    orientation?: "PORTRAIT" | "LANDSCAPE";
  };

  if (body.type !== "IMAGE" && body.type !== "VIDEO" && body.type !== "WEBPAGE") {
    return NextResponse.json({ error: "type must be IMAGE, VIDEO or WEBPAGE" }, { status: 400 });
  }

  // A WEBPAGE's fileUrl is a page address rather than an uploaded asset, so it
  // is the one type whose URL arrives straight from a human and has to be
  // checked. https only: a TV loading the hub over https cannot embed an http
  // frame, and it would fail silently to a blank panel on the wall.
  if (body.type === "WEBPAGE") {
    let parsed: URL;
    try {
      parsed = new URL(body.fileUrl);
    } catch {
      return NextResponse.json({ error: "enter a full URL, e.g. https://okr.tuxmat.ai/display/abc" }, { status: 400 });
    }
    if (parsed.protocol !== "https:") {
      return NextResponse.json({ error: "a webpage must be https" }, { status: 400 });
    }
  }

  const item = await prisma.contentItem.create({
    data: {
      title: body.title,
      type: body.type,
      fileUrl: body.fileUrl,
      thumbnailUrl: body.thumbnailUrl ?? (body.type === "IMAGE" ? body.fileUrl : null),
      // A webpage has no natural end, so it needs a dwell time like an image
      // does; without one the player would hold it forever and the rest of the
      // playlist would never come round.
      durationSec: body.durationSec ?? (body.type === "WEBPAGE" ? 30 : undefined),
      orientation: body.orientation ?? "PORTRAIT",
      uploadedById: session.user.id,
    },
  });

  return NextResponse.json(item, { status: 201 });
}
