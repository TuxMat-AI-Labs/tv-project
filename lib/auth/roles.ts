import type { Role } from "@prisma/client";

const ADMIN_GROUP_ID = process.env.ENTRA_ADMIN_GROUP_ID;
const MARKETING_GROUP_ID = process.env.ENTRA_MARKETING_GROUP_ID;

/**
 * People recognised by email at sign-in, and the one room each may manage.
 *
 * Roles normally come from Entra AD group membership. These three are the
 * marketing team who look after the Showroom wall, and they are named here so
 * they are recognised the moment they sign in, with no AD group to create or
 * IT ticket to wait on.
 *
 * The trade-off, stated plainly: membership now lives in the repo and changing
 * it needs a deploy. When an AD marketing group does exist, set
 * ENTRA_MARKETING_GROUP_ID and delete the corresponding entries here — a real
 * group membership already wins over this map (see resolveRole).
 */
const MARKETING_ROOMS = ["showroom", "multi-purpose-room"] as const;

const ROOM_SCOPED_MARKETING: Record<string, readonly string[]> = {
  "ken.schick@tuxmat.ca": MARKETING_ROOMS,
  "marco.adamo@tuxmat.ca": MARKETING_ROOMS,
  "evelyn.kam@tuxmat.ca": MARKETING_ROOMS,
};

/**
 * Who currently has room-scoped marketing access, for display in the hub.
 *
 * Exported so an admin can see the live roster on the Marketing tab rather than
 * having to read this file or guess. It is the same object the sign-in check
 * uses, so what the hub shows can never drift from what actually grants access.
 */
export function roomScopedMarketingRoster(): { email: string; roomSlugs: string[] }[] {
  return Object.entries(ROOM_SCOPED_MARKETING).map(([email, roomSlugs]) => ({
    email,
    roomSlugs: [...roomSlugs],
  }));
}

/** Every room any scoped user can manage, for the admin's Marketing tab. */
export function allMarketingRoomSlugs(): string[] {
  return [...new Set(Object.values(ROOM_SCOPED_MARKETING).flat())];
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
  if (role === "ADMIN") return null;
  const rooms = ROOM_SCOPED_MARKETING[normalizeEmail(email)];
  return rooms ? [...rooms] : null;
}

export function resolveRole(entraGroupIds: string[], email?: string | null): Role {
  // A real AD group always wins, so switching the group on later supersedes the
  // email map without anyone having to remember it is here.
  if (ADMIN_GROUP_ID && entraGroupIds.includes(ADMIN_GROUP_ID)) return "ADMIN";
  if (MARKETING_GROUP_ID && entraGroupIds.includes(MARKETING_GROUP_ID)) return "MARKETING";

  // Checked BEFORE the no-groups-configured fallback below, which would
  // otherwise hand these three ADMIN and silently discard their room scope.
  if (ROOM_SCOPED_MARKETING[normalizeEmail(email)]) return "MARKETING";

  // No AD groups configured: this is an internal tool behind SSO, so every
  // other authenticated employee gets full access. Set the two group-ID env
  // vars to switch on admin/marketing separation (members of neither group
  // then become read-only VIEWERs).
  if (!ADMIN_GROUP_ID && !MARKETING_GROUP_ID) return "ADMIN";
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
