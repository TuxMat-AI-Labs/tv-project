import type { HubStatusResponse } from "@/lib/hub/types";

export function StatusSummary({ status }: { status: HubStatusResponse }) {
  const displays = status.rooms.flatMap((r) => r.displays);
  const total = displays.length;
  const online = displays.filter((d) => d.online).length;
  const playing = displays.filter((d) => d.mode === "playlist").length;
  const screensaver = displays.filter((d) => d.mode === "screensaver").length;

  const stats = [
    { label: "Displays", value: total, sub: `across ${status.rooms.length} room${status.rooms.length === 1 ? "" : "s"}`, tone: "neutral" as const },
    {
      label: "Online now",
      value: online,
      sub: total > 0 && online === total ? "all connected" : `${total - online} offline`,
      tone: total > 0 && online === total ? ("good" as const) : ("warn" as const),
    },
    { label: "Playing", value: playing, sub: "showing content", tone: "neutral" as const },
    { label: "Screensaver", value: screensaver, sub: "pixel care", tone: "neutral" as const },
  ];

  return (
    <div className="mb-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
      {stats.map((s) => (
        <div key={s.label} className="stat-card px-5 py-5">
          <p className="text-[0.65rem] font-medium tracking-[0.2em] text-muted uppercase">{s.label}</p>
          <p className="tabular mt-3 text-4xl font-semibold text-foreground">{s.value}</p>
          <p
            className={`mt-1.5 flex items-center gap-1.5 text-xs ${
              s.tone === "warn" ? "text-amber-400/90" : s.tone === "good" ? "text-emerald-300/90" : "text-muted"
            }`}
          >
            {s.tone !== "neutral" && (
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  s.tone === "good" ? "bg-emerald-400" : "bg-amber-400"
                }`}
              />
            )}
            {s.sub}
          </p>
        </div>
      ))}
    </div>
  );
}
