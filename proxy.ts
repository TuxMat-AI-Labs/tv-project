import { NextResponse } from "next/server";
import { auth } from "@/auth";

// Next.js 16 renamed `middleware.ts` -> `proxy.ts` (and the exported function to `proxy`).
const ADMIN_ONLY = [
  /^\/hub\/customize\/rooms/,
  /^\/hub\/customize\/displays/,
  /^\/hub\/pair/,
  /^\/api\/admin\/rooms/,
  // Everything under /api/admin/displays is admin-only EXCEPT setting what a
  // display is playing. Without that exception the marketing view's one action
  // — POST /api/admin/displays/<id>/assignments — is bounced by this rule
  // before it reaches the endpoint, so the portal would be broken for exactly
  // the three people it exists for. The endpoint does its own per-room
  // authorization (lib/auth/guard), so the narrower gate here loses nothing.
  /^\/api\/admin\/displays(?!\/[^/]+\/assignments(?:$|\/))/,
  /^\/api\/admin\/pair/,
  /^\/api\/admin\/devices/,
];

const MARKETING_OR_ADMIN = [
  /^\/hub\/customize\/library/,
  /^\/hub\/customize\/assignments/,
  /^\/api\/admin\/content-items/,
  /^\/api\/admin\/assignments/,
  /^\/api\/admin\/displays\/[^/]+\/assignments(?:$|\/)/,
];

export const proxy = auth((req) => {
  const { pathname } = req.nextUrl;
  const role = req.auth?.user?.role;
  const scopedRoomSlug = req.auth?.user?.scopedRoomSlug ?? null;

  if (!role) {
    return NextResponse.redirect(new URL(`/signin?callbackUrl=${encodeURIComponent(pathname)}`, req.nextUrl.origin));
  }

  if (ADMIN_ONLY.some((pattern) => pattern.test(pathname)) && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/hub", req.nextUrl.origin));
  }

  if (MARKETING_OR_ADMIN.some((pattern) => pattern.test(pathname)) && role === "VIEWER") {
    return NextResponse.redirect(new URL("/hub", req.nextUrl.origin));
  }

  // A room-scoped user (the marketing team, confined to the Showroom) gets the
  // simplified manage view as their whole world. Everything else in the hub is
  // either another room's business or an admin surface, so send them home
  // rather than showing a page whose every control would be rejected.
  //
  // This is convenience, NOT the security boundary — /api/admin/* mutations are
  // authorized per-display in lib/auth/guard, because a redirect only steers a
  // browser and says nothing about a direct POST.
  if (scopedRoomSlug) {
    const home = `/hub/manage/${scopedRoomSlug}`;
    const allowed =
      pathname === home ||
      pathname.startsWith(`${home}/`) ||
      pathname.startsWith("/api/") ||
      pathname === "/hub/settings";
    if (!allowed) {
      return NextResponse.redirect(new URL(home, req.nextUrl.origin));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/hub/:path*", "/api/admin/:path*"],
};
