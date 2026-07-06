import type { HubStatusResponse } from "@/lib/hub/types";

export function StatusSummary({ status }: { status: HubStatusResponse }) {
  const displays = status.rooms.flatMap((r) => r.displays);
  const total = displays.length;
  const online = displays.filter((d) => d.online).length;
  const playing = displays.filter((d) => d.mode === "playlist").length;
  const screensaver = displays.filter((d) => d.mode === "screensaver").length;

  const stats = [
    { label: "Displays", value: total, sub: `${status.rooms.length} rooms` },
    { label: "Online now", value: online, sub: `${total - online} offline`, accent: online === total ? "good" : "warn" },
    { label: "Playing", value: playing, sub: "showing content" },
    { label: "Screensaver", value: screensaver, sub: "pixel care" },
  ] as const;

  return (
    <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
      {stats.map((s) => (
        <div key={s.label} className="brand-card px-5 py-4">
          <p className="text-[0.65rem] font-medium tracking-[0.18em] text-muted uppercase">{s.label}</p>
          <p className="mt-2 text-3xl font-semibold text-foreground">{s.value}</p>
          <p
            className={`mt-1 text-xs ${
              "accent" in s && s.accent === "warn"
                ? "text-amber-400/90"
                : "accent" in s && s.accent === "good"
                  ? "text-emerald-300/90"
                  : "text-muted"
            }`}
          >
            {s.sub}
          </p>
        </div>
      ))}
    </div>
  );
}
