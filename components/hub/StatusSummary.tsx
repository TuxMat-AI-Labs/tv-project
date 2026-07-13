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
    <div className="reveal mb-10 grid grid-cols-3 gap-2 sm:gap-4">
      {cards.map((c) => (
        <Link
          key={c.label}
          href={c.href}
          className="stat-card group px-3 py-4 transition-shadow duration-300 hover:shadow-[0_22px_48px_-16px_rgba(32,28,22,0.32)] sm:px-5 sm:py-5"
        >
          <p className="text-[0.6rem] font-medium tracking-[0.12em] text-muted uppercase transition-colors group-hover:text-gold sm:text-[0.65rem] sm:tracking-[0.2em]">
            {c.label}
          </p>
          <p className="tabular mt-2 text-2xl font-semibold text-foreground sm:mt-3 sm:text-4xl">{c.value}</p>
        </Link>
      ))}
    </div>
  );
}
