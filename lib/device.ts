import { randomBytes } from "node:crypto";

/**
 * Device identity helpers for TV pairing. A physical TV holds a long-lived
 * httpOnly cookie (`DEVICE_COOKIE`) carrying a random `token` — that token is
 * the durable identity. While unpaired the TV also shows a short `pairingCode`
 * (e.g. TUX-4F9K) that an admin approves from the hub.
 */
export const DEVICE_COOKIE = "tuxdisplay_device";
// ~2 years — the cookie is the permanent identity, so it should outlive reboots.
export const DEVICE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365 * 2;
// A pairing code is only valid for a short window before it's regenerated.
export const CODE_TTL_MS = 10 * 60 * 1000;

export function generateToken(): string {
  return randomBytes(32).toString("hex");
}

// Unambiguous alphabet (no 0/O/1/I/L) so a code is easy to read off a TV screen.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export function generatePairingCode(): string {
  const bytes = randomBytes(4);
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return `TUX-${s}`;
}

export function normalizeCode(input: string): string {
  return input.trim().toUpperCase();
}
