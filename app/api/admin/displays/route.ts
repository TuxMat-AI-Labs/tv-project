import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const displays = await prisma.display.findMany({
    include: { room: true },
    orderBy: [{ room: { sortOrder: "asc" } }, { number: "asc" }],
  });
  return NextResponse.json({ displays });
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { name: string; number: number; roomId: string };
  const display = await prisma.display.create({
    data: { name: body.name, number: body.number, roomId: body.roomId },
  });
  return NextResponse.json(display, { status: 201 });
}
