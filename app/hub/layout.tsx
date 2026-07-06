import { prisma } from "@/lib/prisma";
import { auth, signOut } from "@/auth";
import { Wordmark } from "@/components/brand/Wordmark";
import { HubNav } from "@/components/hub/HubNav";

export default async function HubLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  const [rooms, session] = await Promise.all([
    prisma.room.findMany({ orderBy: { sortOrder: "asc" }, select: { name: true, slug: true } }),
    auth(),
  ]);

  async function handleSignOut() {
    "use server";
    await signOut({ redirectTo: "/hub" });
  }

  const initials = (session?.user?.name ?? session?.user?.email ?? "?")
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");

  return (
    <div className="min-h-screen text-foreground">
      <header className="sticky top-0 z-40 border-b brand-hairline bg-black/60 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 pt-5 pb-3">
          <Wordmark subtitle="Display Hub" />
          <div className="flex items-center gap-4">
            <span className="hidden text-xs text-muted sm:inline">
              {session?.user?.email} · <span className="text-gold-light">{session?.user?.role}</span>
            </span>
            <form action={handleSignOut}>
              <button
                type="submit"
                className="rounded-md border brand-hairline px-3 py-1.5 text-xs text-muted transition-colors hover:border-gold hover:text-gold"
              >
                Sign out
              </button>
            </form>
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-gold/40 bg-gold/10 text-xs font-semibold text-gold-light">
              {initials}
            </span>
          </div>
        </div>
        <div className="mx-auto max-w-7xl px-6">
          <HubNav rooms={rooms} />
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
      {modal}
    </div>
  );
}
