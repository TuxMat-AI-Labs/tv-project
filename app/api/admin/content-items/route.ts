import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { canManageContent } from "@/lib/auth/roles";

export async function GET() {
  const items = await prisma.contentItem.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, type: true, thumbnailUrl: true, fileUrl: true },
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
    type: "IMAGE" | "VIDEO";
    fileUrl: string;
    thumbnailUrl?: string;
    durationSec?: number;
  };

  const item = await prisma.contentItem.create({
    data: {
      title: body.title,
      type: body.type,
      fileUrl: body.fileUrl,
      thumbnailUrl: body.thumbnailUrl ?? (body.type === "IMAGE" ? body.fileUrl : null),
      durationSec: body.durationSec,
      uploadedById: session.user.id,
    },
  });

  return NextResponse.json(item, { status: 201 });
}
