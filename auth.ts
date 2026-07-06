import NextAuth, { type DefaultSession } from "next-auth";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import Credentials from "next-auth/providers/credentials";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { resolveRole } from "@/lib/auth/roles";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
    } & DefaultSession["user"];
  }
}

export const entraConfigured = Boolean(process.env.AUTH_MICROSOFT_ENTRA_ID_ID);

// Local-only stand-in for Entra SSO so the Hub can be built/tested before the
// real tenant/app-registration/group IDs exist. Automatically disabled the
// moment AUTH_MICROSOFT_ENTRA_ID_ID is set (i.e. in production on Render).
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
          clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID,
          clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
          issuer: process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER,
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
        return token;
      }

      if (account?.provider === "microsoft-entra-id" && profile) {
        const groupIds = Array.isArray((profile as { groups?: unknown }).groups)
          ? ((profile as { groups?: string[] }).groups ?? [])
          : [];
        const role = resolveRole(groupIds);

        const dbUser = await prisma.user.upsert({
          where: { entraObjectId: profile.sub as string },
          create: {
            entraObjectId: profile.sub as string,
            email: (profile.email as string) ?? "",
            name: (profile.name as string) ?? null,
            role,
          },
          update: {
            email: (profile.email as string) ?? undefined,
            name: (profile.name as string) ?? undefined,
            role,
          },
        });

        token.userId = dbUser.id;
        token.role = dbUser.role;
      }

      return token;
    },
    async session({ session, token }) {
      session.user.id = token.userId as string;
      session.user.role = token.role as Role;
      return session;
    },
  },
});
