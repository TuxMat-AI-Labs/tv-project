import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { canManageContent } from "@/lib/auth/roles";
import { createUploadUrl } from "@/lib/storage";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !canManageContent(session.user.role)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { filename, contentType } = (await req.json()) as { filename: string; contentType: string };
  const key = `${crypto.randomUUID()}-${filename}`;
  const { uploadUrl, publicUrl } = await createUploadUrl(key, contentType);

  return NextResponse.json({ uploadUrl, publicUrl });
}
