import type { Role } from "@prisma/client";

const ADMIN_GROUP_ID = process.env.ENTRA_ADMIN_GROUP_ID;
const MARKETING_GROUP_ID = process.env.ENTRA_MARKETING_GROUP_ID;

export function resolveRole(entraGroupIds: string[]): Role {
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
