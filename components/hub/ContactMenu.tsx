"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

/**
 * The header avatar doubles as the account button. Clicking it opens a dropdown
 * with the signed-in user's details (relocated out of the header bar), a link to
 * Settings, and Sign out. `signOutAction` is the layout's `handleSignOut` server
 * action, passed down so the form can invoke it from this client component.
 */
export function ContactMenu({
  initials,
  name,
  email,
  role,
  signOutAction,
}: {
  initials: string;
  name?: string | null;
  email?: string | null;
  role?: string | null;
  signOutAction: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="glass-btn flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold"
        style={{ color: "var(--gold)" }}
      >
        {initials}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] shadow-[0_24px_48px_-24px_rgba(32,28,22,0.35)]"
        >
          <div className="border-b border-[color:var(--border)] px-4 py-3">
            {name && <p className="truncate text-sm font-medium text-foreground">{name}</p>}
            {email && <p className="truncate text-xs text-muted">{email}</p>}
            {role && (
              <p className="mt-1.5 inline-block rounded-full bg-gold/10 px-2 py-0.5 text-[0.65rem] font-medium tracking-wide text-gold uppercase">
                {role}
              </p>
            )}
          </div>
          <Link
            href="/hub/settings"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block px-4 py-2.5 text-sm text-foreground transition-colors hover:bg-surface-2 hover:text-gold"
          >
            Settings
          </Link>
          <form action={signOutAction} className="border-t border-[color:var(--border)]">
            <button
              type="submit"
              role="menuitem"
              className="block w-full px-4 py-2.5 text-left text-sm text-muted transition-colors hover:bg-surface-2 hover:text-gold"
            >
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
