import { NextResponse } from "next/server";
import { auth } from "@/auth";

// Next.js 16 renamed `middleware.ts` -> `proxy.ts` (and the exported function to `proxy`).
const ADMIN_ONLY = [
  /^\/hub\/customize\/rooms/,
  /^\/hub\/customize\/displays/,
  /^\/hub\/pair/,
  /^\/hub\/troubleshoot/,
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
  const scopedRoomSlugs = req.auth?.user?.scopedRoomSlugs ?? null;

  // An API request must be refused with JSON, never steered to a page.
  //
  // Redirecting /api/* sent the browser's fetch to the HTML sign-in page; the
  // caller then ran .json() on HTML, threw, and showed its generic failure
  // message. That is how an expired session surfaced as "Failed to load
  // library" with nothing pointing at the real cause. A 401 or 403 with a
  // reason lets the caller say something true instead.
  const isApi = pathname.startsWith("/api/");
  const deny = (status: number, error: string) =>
    isApi
      ? NextResponse.json({ error }, { status })
      : NextResponse.redirect(
          new URL(
            status === 401 ? `/signin?callbackUrl=${encodeURIComponent(pathname)}` : "/hub",
            req.nextUrl.origin
          )
        );

  if (!role) return deny(401, "not signed in");

  if (ADMIN_ONLY.some((pattern) => pattern.test(pathname)) && role !== "ADMIN") {
    return deny(403, "admin only");
  }

  if (MARKETING_OR_ADMIN.some((pattern) => pattern.test(pathname)) && role === "VIEWER") {
    return deny(403, "read-only account");
  }

  // A room-scoped user (the marketing team) gets the simplified manage view as
  // their whole world. Everything else in the hub is either a room they do not
  // hold or an admin surface, so send them home rather than showing a page
  // whose every control would be rejected.
  //
  // This is convenience, NOT the security boundary — /api/admin/* mutations are
  // authorized per-display in lib/auth/guard, because a redirect only steers a
  // browser and says nothing about a direct POST.
  if (scopedRoomSlugs) {
    const home = "/hub/manage";
    // Their own rooms' single-room pages are fine; anyone else's are not, so
    // this cannot just allow /hub/manage/* wholesale.
    const ownRoomPage = scopedRoomSlugs.some(
      (slug) => pathname === `${home}/${slug}` || pathname.startsWith(`${home}/${slug}/`)
    );
    const allowed =
      pathname === home || ownRoomPage || pathname.startsWith("/api/") || pathname === "/hub/settings";
    if (!allowed) {
      return NextResponse.redirect(new URL(home, req.nextUrl.origin));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/hub/:path*", "/api/admin/:path*"],
};
