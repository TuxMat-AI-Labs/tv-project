"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = { label: string; href: string };

export function HubNav({
  rooms,
  scopedRoomSlugs = null,
  hasMarketingRooms = false,
}: {
  rooms: { name: string; slug: string }[];
  /** Set for a user confined to particular rooms — see lib/auth/roles. */
  scopedRoomSlugs?: string[] | null;
  /** Whether anyone is room-scoped, so an admin gets the preview tab. */
  hasMarketingRooms?: boolean;
}) {
  const pathname = usePathname();

  // A scoped user can only reach their own rooms, so showing the rest would be
  // a row of links that each bounce straight back. All their rooms live on one
  // page, with a link per room for jumping straight to one — mirroring how the
  // dashboard stacks rooms for an admin.
  const items: NavItem[] = scopedRoomSlugs
    ? [
        { label: "My screens", href: "/hub/manage" },
        ...scopedRoomSlugs.map((slug) => ({
          label: rooms.find((r) => r.slug === slug)?.name ?? slug,
          href: `/hub/manage/${slug}`,
        })),
      ]
    : [
        { label: "Dashboard", href: "/hub" },
        ...rooms.map((r) => ({ label: r.name, href: `/hub/${r.slug}` })),
        { label: "Customize", href: "/hub/customize" },
        // Opens the same page the marketing team lands on, so "what do they
        // actually see?" is one click rather than a guess or a test account.
        ...(hasMarketingRooms ? [{ label: "Marketing", href: "/hub/manage" }] : []),
        { label: "Troubleshoot", href: "/hub/troubleshoot" },
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
