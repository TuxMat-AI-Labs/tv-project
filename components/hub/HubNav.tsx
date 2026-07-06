"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = { label: string; href: string };

export function HubNav({ rooms }: { rooms: { name: string; slug: string }[] }) {
  const pathname = usePathname();

  const items: NavItem[] = [
    { label: "Dashboard", href: "/hub" },
    ...rooms.map((r) => ({ label: r.name, href: `/hub/${r.slug}` })),
    { label: "Customize", href: "/hub/customize" },
  ];

  return (
    <nav className="flex items-center gap-1 overflow-x-auto">
      {items.map((item) => {
        const active = item.href === "/hub" ? pathname === "/hub" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`relative whitespace-nowrap rounded-md px-3 py-1.5 text-sm transition-colors ${
              active ? "text-gold" : "text-muted hover:text-white"
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
