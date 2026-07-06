import Link from "next/link";
import { auth } from "@/auth";

export default async function SettingsPage() {
  const session = await auth();

  return (
    <div className="reveal">
      <h1 className="text-2xl font-semibold tracking-wide text-foreground">Settings</h1>
      <p className="mt-2 text-sm text-muted">Your account and hub configuration.</p>

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <div className="brand-card p-6">
          <h2 className="text-sm font-medium tracking-wide text-foreground uppercase">Account</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted">Name</dt>
              <dd className="truncate text-foreground">{session?.user?.name ?? "—"}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted">Email</dt>
              <dd className="truncate text-foreground">{session?.user?.email ?? "—"}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted">Role</dt>
              <dd className="text-foreground">{session?.user?.role ?? "—"}</dd>
            </div>
          </dl>
        </div>

        <div className="brand-card p-6">
          <h2 className="text-sm font-medium tracking-wide text-foreground uppercase">Hub</h2>
          <p className="mt-4 text-sm leading-relaxed text-muted">
            Manage rooms, displays, media library, and content assignments from the
            Customize workspace.
          </p>
          <Link
            href="/hub/customize"
            className="mt-6 inline-block rounded-md bg-gold px-4 py-2 text-sm font-semibold text-black transition hover:bg-gold-light"
          >
            Open Customize
          </Link>
        </div>
      </div>
    </div>
  );
}
