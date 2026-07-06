import Link from "next/link";

const TABS = [
  { href: "/hub/customize/rooms", key: "rooms", label: "Rooms" },
  { href: "/hub/customize/displays", key: "displays", label: "Displays" },
  { href: "/hub/customize/library", key: "library", label: "Library" },
  { href: "/hub/customize/assignments", key: "assignments", label: "Assignments" },
] as const;

export function CustomizeSubNav({ active }: { active: (typeof TABS)[number]["key"] }) {
  return (
    <nav className="mt-4 flex flex-wrap gap-2 border-b brand-hairline pb-4">
      {TABS.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
            tab.key === active
              ? "border-gold bg-gold text-black"
              : "border-white/10 bg-surface text-zinc-200 hover:border-gold/50 hover:text-gold-light"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
