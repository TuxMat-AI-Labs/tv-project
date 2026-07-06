import type { Role } from "@prisma/client";

const ADMIN_GROUP_ID = process.env.ENTRA_ADMIN_GROUP_ID;
const MARKETING_GROUP_ID = process.env.ENTRA_MARKETING_GROUP_ID;

export function resolveRole(entraGroupIds: string[]): Role {
  // No AD groups configured: this is an internal tool behind SSO, so every
  // authenticated employee gets full access. Set the two group-ID env vars to
  // switch on admin/marketing separation (members of neither group then become
  // read-only VIEWERs).
  if (!ADMIN_GROUP_ID && !MARKETING_GROUP_ID) return "ADMIN";
  if (ADMIN_GROUP_ID && entraGroupIds.includes(ADMIN_GROUP_ID)) return "ADMIN";
  if (MARKETING_GROUP_ID && entraGroupIds.includes(MARKETING_GROUP_ID)) return "MARKETING";
  return "VIEWER";
}

export function canManageDisplays(role: Role): boolean {
  return role === "ADMIN";
}

export function canManageContent(role: Role): boolean {
  return role === "ADMIN" || role === "MARKETING";
}
