"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = { label: string; href: string };

export function HubNav({
  rooms,
  scopedRoomSlug = null,
}: {
  rooms: { name: string; slug: string }[];
  /** Set for a user confined to one room — see lib/auth/roles. */
  scopedRoomSlug?: string | null;
}) {
  const pathname = usePathname();

  // A scoped user can only reach their own manage view, so showing the rest
  // would be a row of links that each bounce straight back. One link is not
  // much of a nav, but it keeps the header honest about where they can go.
  const scopedRoom = scopedRoomSlug ? rooms.find((r) => r.slug === scopedRoomSlug) : null;
  const items: NavItem[] = scopedRoomSlug
    ? [{ label: scopedRoom?.name ?? "My screens", href: `/hub/manage/${scopedRoomSlug}` }]
    : [
        { label: "Dashboard", href: "/hub" },
        ...rooms.map((r) => ({ label: r.name, href: `/hub/${r.slug}` })),
        { label: "Customize", href: "/hub/customize" },
      ];

  return (
    <nav className="no-scrollbar flex items-center gap-1 overflow-x-auto">
      {items.map((item) => {
        const active = item.href === "/hub" ? pathname === "/hub" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`relative whitespace-nowrap rounded-md px-3 py-2.5 text-sm transition-colors ${
              active ? "text-gold" : "text-muted hover:text-foreground"
            }`}
          >
            {item.label}
            {active && <span className="absolute inset-x-3 -bottom-px h-px bg-gold" />}
          </Link>
        );
      })}
    </nav>
  );
}
