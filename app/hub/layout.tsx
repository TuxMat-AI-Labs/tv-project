import type { Viewport } from "next";
import { prisma } from "@/lib/prisma";
import { auth, signOut } from "@/auth";
import { Wordmark } from "@/components/brand/Wordmark";
import { HubNav } from "@/components/hub/HubNav";
import { ContactMenu } from "@/components/hub/ContactMenu";
import { RegisterServiceWorker } from "@/components/hub/RegisterServiceWorker";

// Overrides the root layout's zoom-locked viewport (that lock exists for the
// TV-facing routes' pixel-perfect full-bleed rendering — see app/layout.tsx).
// The admin hub is a normal, zoomable web app; locking pinch-zoom here would
// only hurt usability on a phone (e.g. zooming into a dense table).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

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
    <div className="flex h-dvh flex-col overflow-hidden text-foreground">
      <RegisterServiceWorker />
      <header
        // relative z-40 keeps the header (and the account dropdown that
        // overflows out of it) stacked ABOVE the scrollable <main> below.
        // Without it, <main>'s cards paint over the open dropdown — the header
        // no longer gets this for free now that it's a plain flex row rather
        // than the old `sticky top-0 z-40`.
        className="relative z-40 shrink-0 border-b brand-hairline bg-white/70 backdrop-blur-xl"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 pt-5 pb-3">
          <Wordmark subtitle="Display Hub" />
          <ContactMenu
            initials={initials}
            name={session?.user?.name}
            email={session?.user?.email}
            role={session?.user?.role}
            signOutAction={handleSignOut}
          />
        </div>
        <div className="mx-auto max-w-7xl px-6">
          <HubNav rooms={rooms} />
        </div>
      </header>
      <main className="no-scrollbar mx-auto w-full max-w-7xl flex-1 overflow-y-auto overscroll-contain px-6 py-8">
        {children}
      </main>
      {modal}
    </div>
  );
}
