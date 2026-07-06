import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function GET() {
  const rooms = await prisma.room.findMany({ orderBy: { sortOrder: "asc" } });
  return NextResponse.json({ rooms });
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { name: string; sortOrder?: number };
  const room = await prisma.room.create({
    data: { name: body.name, slug: slugify(body.name), sortOrder: body.sortOrder ?? 0 },
  });
  return NextResponse.json(room, { status: 201 });
}
