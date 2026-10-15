import type { Role } from "@prisma/client";

const ADMIN_GROUP_ID = process.env.ENTRA_ADMIN_GROUP_ID;
const MARKETING_GROUP_ID = process.env.ENTRA_MARKETING_GROUP_ID;

const MARKETING_ROOMS = ["showroom", "multi-purpose-room"] as const;

/**
 * Named admins. EVERYONE ELSE who signs in gets the marketing view.
 *
 * This is the inverse of how it started, and the inversion is the point. Listing
 * the marketing team by email meant anyone not on the list fell through to full
 * admin, so a single address not matching the form Entra actually returns
 * silently handed someone the whole hub. That is exactly what happened: a
 * marketing user arrived as an admin, with Customize and Troubleshoot in his
 * header, because his address did not match the entry written for him.
 *
 * Listing admins instead fails the safe way round. A marketing address that
 * does not match loses nothing, because marketing is already the default; only
 * an ADMIN whose address does not match is affected, and that is both visible
 * immediately and recoverable without a deploy, via ADMIN_EMAILS below.
 *
 * Still superseded by a real AD group whenever one is configured.
 */
const DEFAULT_ADMIN_EMAILS = ["colin.diaz@tuxmat.ca", "ken.schick@tuxmat.ca"];

/**
 * The admin list, overridable by the ADMIN_EMAILS environment variable as a
 * comma-separated list.
 *
 * The override exists as the escape hatch for the one failure this design can
 * still have: if an admin's real address does not match the compiled list they
 * arrive as marketing, and fixing that in the repo needs a deploy. Setting
 * ADMIN_EMAILS in the host restores access in about a minute instead, and
 * REPLACES the list rather than adding to it, so it can also be used to remove
 * someone quickly.
 */
function adminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS;
  const list = raw ? raw.split(",") : DEFAULT_ADMIN_EMAILS;
  return list.map(normalizeEmail).filter(Boolean);
}

/**
 * True when this address is a named admin.
 *
 * Matches the full address, and failing that the part before the @. Entra does
 * not always hand back the address people use: the same account can arrive on
 * the tenant's onmicrosoft.com domain rather than tuxmat.ca. Comparing the
 * local part survives that, and in a single tenant two different people cannot
 * share one, so it costs nothing.
 */
function isAdminEmail(email: string | null | undefined): boolean {
  const e = normalizeEmail(email);
  if (!e) return false;
  const admins = adminEmails();
  if (admins.includes(e)) return true;
  const local = e.split("@")[0];
  return !!local && admins.some((a) => a.split("@")[0] === local);
}

/**
 * Who currently has room-scoped marketing access, for display in the hub.
 *
 * Exported so an admin can see the live roster on the Marketing tab rather than
 * having to read this file or guess. It is the same object the sign-in check
 * uses, so what the hub shows can never drift from what actually grants access.
 */
/** The named admins, for display in the hub so the list is never a mystery. */
export function adminRoster(): string[] {
  return adminEmails();
}

/** The rooms the marketing view covers, for the admin's Marketing tab. */
export function allMarketingRoomSlugs(): string[] {
  return [...MARKETING_ROOMS];
}

function normalizeEmail(email: string | null | undefined): string {
  return (email ?? "").trim().toLowerCase();
}

/**
 * The rooms this person may manage, or null for no restriction.
 *
 * Null means "not room-scoped" — the answer for an ADMIN and for anyone who
 * reached MARKETING through an AD group — and is emphatically NOT the same as
 * an empty list, which would mean "scoped to nothing". Only a scoped user is
 * confined, and they may hold several rooms.
 */
export function scopedRoomSlugsFor(email: string | null | undefined, role: Role): string[] | null {
  // Unrestricted: admins, and read-only viewers who cannot change anything
  // anyway. Everyone else is marketing, and marketing means these rooms.
  if (role === "ADMIN" || role === "VIEWER") return null;
  return [...MARKETING_ROOMS];
}

export function resolveRole(entraGroupIds: string[], email?: string | null): Role {
  // A real AD group always wins, so switching the group on later supersedes the
  // email map without anyone having to remember it is here.
  if (ADMIN_GROUP_ID && entraGroupIds.includes(ADMIN_GROUP_ID)) return "ADMIN";
  if (MARKETING_GROUP_ID && entraGroupIds.includes(MARKETING_GROUP_ID)) return "MARKETING";

  if (isAdminEmail(email)) return "ADMIN";

  // No AD groups configured: everyone else who signs in gets the marketing
  // view. This used to return ADMIN, which meant any employee signing in held
  // the whole hub, including the ability to delete rooms and displays.
  if (!ADMIN_GROUP_ID && !MARKETING_GROUP_ID) return "MARKETING";

  // Groups ARE configured and this person is in neither: read-only.
  return "VIEWER";
}

export function canManageDisplays(role: Role): boolean {
  return role === "ADMIN";
}

export function canManageContent(role: Role): boolean {
  return role === "ADMIN" || role === "MARKETING";
}

/**
 * May this session change what plays in `roomSlug`?
 *
 * `scopedRoomSlugs` null = unrestricted (admin, or marketing via an AD group).
 * An EMPTY array is not the same thing and denies everything — a scoped user
 * whose room list is somehow empty must not fall through to full access.
 *
 * Enforced server-side on every mutation, not just hidden in the UI — a scoped
 * user can otherwise POST another room's display id directly.
 */
export function canManageRoom(
  role: Role,
  scopedRoomSlugs: string[] | null | undefined,
  roomSlug: string | null | undefined
): boolean {
  if (!canManageContent(role)) return false;
  if (scopedRoomSlugs == null) return true;
  return !!roomSlug && scopedRoomSlugs.includes(roomSlug);
}
