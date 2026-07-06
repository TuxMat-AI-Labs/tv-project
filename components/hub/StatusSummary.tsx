import Link from "next/link";
import type { HubStatusResponse } from "@/lib/hub/types";

export function StatusSummary({ status }: { status: HubStatusResponse }) {
  const displays = status.rooms.flatMap((r) => r.displays);
  const total = displays.length;
  const online = displays.filter((d) => d.online).length;
  const screensaver = displays.filter((d) => d.mode === "screensaver").length;

  const cards = [
    { label: "Displays", value: total, href: "/hub/displays" },
    { label: "Online", value: online, href: "/hub/online" },
    { label: "Screensaver", value: screensaver, href: "/hub/screensaver" },
  ];

  return (
    <div className="reveal mb-10 grid grid-cols-3 gap-4">
      {cards.map((c) => (
        <Link
          key={c.label}
          href={c.href}
          className="stat-card group px-5 py-5 transition-shadow duration-300 hover:shadow-[0_22px_48px_-16px_rgba(32,28,22,0.32)]"
        >
          <p className="text-[0.65rem] font-medium tracking-[0.2em] text-muted uppercase transition-colors group-hover:text-gold">
            {c.label}
          </p>
          <p className="tabular mt-3 text-4xl font-semibold text-foreground">{c.value}</p>
        </Link>
      ))}
    </div>
  );
}
