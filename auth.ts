import NextAuth, { type DefaultSession } from "next-auth";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import Credentials from "next-auth/providers/credentials";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { resolveRole, scopedRoomSlugFor } from "@/lib/auth/roles";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      /**
       * The only room this person may manage, or null for no restriction.
       * Null is the normal case (admins, and marketing via an AD group) — see
       * lib/auth/roles.
       */
      scopedRoomSlug: string | null;
    } & DefaultSession["user"];
  }
}

/**
 * Entra does not reliably put the address in `email` — a work account often
 * carries it as `preferred_username`, and `upn` on some tenants. Roles are
 * matched by email for the room-scoped marketing users, so falling back matters:
 * missing the address would silently demote them rather than fail loudly.
 */
function emailFromProfile(profile: Record<string, unknown>): string {
  const candidates = [profile.email, profile.preferred_username, profile.upn];
  for (const c of candidates) {
    if (typeof c === "string" && c.includes("@")) return c;
  }
  return "";
}

// Uses TuxMat's standard Azure env-var convention (AZURE_CLIENT_ID /
// AZURE_CLIENT_SECRET / AZURE_TENANT_ID), the same trio every other TuxMat app
// uses. The OIDC issuer is derived from the tenant ID, so no issuer URL needs
// to be set by hand.
export const entraConfigured = Boolean(process.env.AZURE_CLIENT_ID);

// Local-only stand-in for Entra SSO so the Hub can be built/tested before the
// Azure credentials exist. Automatically disabled the moment AZURE_CLIENT_ID is
// set (i.e. in production on Render).
const devBypassProvider = Credentials({
  id: "dev-bypass",
  name: "Dev sign-in (no Entra configured)",
  credentials: {},
  async authorize() {
    if (entraConfigured || process.env.NODE_ENV === "production") return null;
    return {
      id: "dev-seed-admin",
      email: "dev-admin@tuxmat.local",
      name: "Dev Admin",
    };
  },
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: entraConfigured
    ? [
        MicrosoftEntraID({
          clientId: process.env.AZURE_CLIENT_ID,
          clientSecret: process.env.AZURE_CLIENT_SECRET,
          issuer: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/v2.0`,
        }),
      ]
    : [devBypassProvider],
  pages: { signIn: "/signin" },
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, profile, account, user }) {
      if (account?.provider === "dev-bypass" && user) {
        const dbUser = await prisma.user.upsert({
          where: { entraObjectId: "dev-seed-admin" },
          create: { entraObjectId: "dev-seed-admin", email: user.email ?? "", name: user.name, role: "ADMIN" },
          update: {},
        });
        token.userId = dbUser.id;
        token.role = dbUser.role;
        token.scopedRoomSlug = null;
        return token;
      }

      if (account?.provider === "microsoft-entra-id" && profile) {
        const groupIds = Array.isArray((profile as { groups?: unknown }).groups)
          ? ((profile as { groups?: string[] }).groups ?? [])
          : [];
        const email = emailFromProfile(profile as Record<string, unknown>);
        const role = resolveRole(groupIds, email);

        const dbUser = await prisma.user.upsert({
          where: { entraObjectId: profile.sub as string },
          create: {
            entraObjectId: profile.sub as string,
            email,
            name: (profile.name as string) ?? null,
            role,
          },
          update: {
            email: email || undefined,
            name: (profile.name as string) ?? undefined,
            role,
          },
        });

        token.userId = dbUser.id;
        token.role = dbUser.role;
        // Derived from the email map rather than stored on the User row, so
        // editing the map takes effect on next sign-in with no migration and no
        // stale copy in the database to reconcile.
        token.scopedRoomSlug = scopedRoomSlugFor(dbUser.email, dbUser.role);
      }

      return token;
    },
    async session({ session, token }) {
      session.user.id = token.userId as string;
      session.user.role = token.role as Role;
      session.user.scopedRoomSlug = (token.scopedRoomSlug as string | null) ?? null;
      return session;
    },
  },
});
