import Link from "next/link";

const SECTIONS = [
  {
    href: "/hub/pair",
    label: "Pair a screen",
    description: "Enroll a new TV by scanning its QR or entering the code it shows — no login on the TV.",
  },
  {
    href: "/hub/customize/rooms",
    label: "Rooms",
    description: "Create and organize the rooms that group displays together.",
  },
  {
    href: "/hub/customize/displays",
    label: "Displays",
    description: "Manage TVs, their room assignment, active status, and each display's URL.",
  },
  {
    href: "/hub/customize/library",
    label: "Library",
    description: "Upload and manage the images and videos available to show on displays.",
  },
  {
    href: "/hub/customize/assignments",
    label: "Assignments",
    description: "Schedule content on displays with rotation order, date ranges, and daypart windows.",
  },
];

export default function CustomizePage() {
  return (
    <div className="reveal">
      <h1 className="text-2xl font-semibold text-foreground">Customize</h1>
      <p className="mt-1 text-sm text-muted">Manage rooms, displays, media, and scheduling.</p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {SECTIONS.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="brand-card group p-5 transition hover:border-gold/40"
          >
            <h2 className="text-sm font-semibold text-foreground transition group-hover:text-gold">
              {section.label}
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-muted">{section.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
