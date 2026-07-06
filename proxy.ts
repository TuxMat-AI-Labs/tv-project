import { NextResponse } from "next/server";
import { auth } from "@/auth";

// Next.js 16 renamed `middleware.ts` -> `proxy.ts` (and the exported function to `proxy`).
const ADMIN_ONLY = [/^\/hub\/customize\/rooms/, /^\/hub\/customize\/displays/, /^\/api\/admin\/rooms/, /^\/api\/admin\/displays/];

const MARKETING_OR_ADMIN = [
  /^\/hub\/customize\/library/,
  /^\/hub\/customize\/assignments/,
  /^\/api\/admin\/content-items/,
  /^\/api\/admin\/assignments/,
];

export const proxy = auth((req) => {
  const { pathname } = req.nextUrl;
  const role = req.auth?.user?.role;

  if (!role) {
    return NextResponse.redirect(new URL(`/signin?callbackUrl=${encodeURIComponent(pathname)}`, req.nextUrl.origin));
  }

  if (ADMIN_ONLY.some((pattern) => pattern.test(pathname)) && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/hub", req.nextUrl.origin));
  }

  if (MARKETING_OR_ADMIN.some((pattern) => pattern.test(pathname)) && role === "VIEWER") {
    return NextResponse.redirect(new URL("/hub", req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/hub/:path*", "/api/admin/:path*"],
};
