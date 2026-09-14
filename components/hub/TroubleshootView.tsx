"use client";

import { useState } from "react";
import { useHubStatus } from "@/lib/hub/useHubStatus";
import type { HubDisplayStatus } from "@/lib/hub/types";

type MdcPanel = {
  host: string;
  displayId: number;
  reachable: boolean;
  error?: string;
  results: Record<string, { ack: boolean; data: number[]; raw: string; interpreted?: Record<string, number | undefined> }>;
};
export type MdcReport = { takenAt: string; panels: MdcPanel[] } | null;

/**
 * Everything known about how the wall is actually rendering, in one place.
 *
 * The hub's other views answer "is this screen online and on the right
 * content?", and a panel can pass both while being visibly wrong — which is how
 * one display was chased for weeks. This page exists to make the raw evidence
 * comparable side by side, because the only reliable move so far has been
 * diffing a broken screen against a healthy one.
 *
 * It shows numbers, not verdicts. Every interpretation offered here has been
 * wrong at least once; the measurements have not.
 */
export function TroubleshootView({
  mdcReport,
  calibrationOn,
}: {
  mdcReport: MdcReport;
  calibrationOn: boolean;
}) {
  const status = useHubStatus();
  const [cal, setCal] = useState(calibrationOn);
  const [calBusy, setCalBusy] = useState(false);

  async function toggleCalibration() {
    setCalBusy(true);
    try {
      const res = await fetch("/api/admin/calibration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !cal }),
      });
      if (res.ok) setCal(!cal);
    } finally {
      setCalBusy(false);
    }
  }

  return (
    <div className="reveal">
      <h1 className="text-2xl font-semibold text-foreground">Troubleshoot</h1>
      <p className="mt-1 max-w-3xl text-sm text-muted">
        What each screen reports about itself. A display can be online, paired and on the right content and still
        render wrong — so compare a screen that looks wrong against one that looks right, and trust the difference
        rather than any single reading.
      </p>

      <div className="mt-6 brand-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">Calibration markers</p>
            <p className="mt-0.5 max-w-2xl text-xs text-muted">
              Puts a marked border, four labelled corners and edge ticks on <strong>every</strong> screen. If a panel is
              cropping what it is given — the one fault neither the browser nor MDC can see — the missing markers show
              it, and roughly by how much. Turn it on, walk the wall, compare a good screen against a bad one, turn it
              off. Screens pick it up within about 15 seconds; nothing needs touching at the TV.
            </p>
          </div>
          <button
            type="button"
            onClick={toggleCalibration}
            disabled={calBusy}
            className={`glass-btn shrink-0 rounded px-4 py-2 text-sm font-medium disabled:opacity-50 ${cal ? "" : "glass-btn--gold"}`}
          >
            {calBusy ? "Saving…" : cal ? "Turn markers off" : "Turn markers on"}
          </button>
        </div>
        {cal && (
          <p className="mt-2 text-xs font-medium text-red-600">
            Markers are live on the wall right now — remember to turn them off.
          </p>
        )}
      </div>

      <h2 className="mt-8 text-sm font-semibold tracking-wide text-foreground uppercase">Browser-reported viewport</h2>
      <p className="mt-1 text-xs text-muted">
        Measured in the TV&apos;s own browser and sent with each heartbeat. <strong>Zoom is shown, not judged</strong> —
        these panels run at 125% natively and content sized in viewport units renders identically either way.
      </p>
      <p className="mt-1 max-w-3xl text-xs text-muted">
        <strong>Fit %</strong> is underscan compensation for a panel that magnifies what it is handed and crops its own
        edges — something that happens after the browser has finished drawing, so nothing here can detect it. 100 means
        fill the screen and is correct for every healthy panel. Turn the markers on above and nudge a cropping screen
        down until all four corner blocks are just fully visible.
      </p>

      {!status ? (
        <p className="mt-4 text-sm text-muted">Loading…</p>
      ) : (
        <div className="mt-3 overflow-x-auto brand-card">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead className="text-xs tracking-wide text-muted uppercase">
              <tr>
                <th className="px-4 py-3">Display</th>
                <th className="px-4 py-3">Online</th>
                <th className="px-4 py-3">Showing</th>
                <th className="px-4 py-3">Viewport</th>
                <th className="px-4 py-3">Panel</th>
                <th className="px-4 py-3">DPR</th>
                <th className="px-4 py-3">Zoom</th>
                <th className="px-4 py-3">Chrome</th>
                <th className="px-4 py-3">Fit %</th>
              </tr>
            </thead>
            <tbody>
              {status.rooms.flatMap((room) =>
                room.displays.map((d) => <Row key={d.id} room={room.name} d={d} />)
              )}
            </tbody>
          </table>
        </div>
      )}

      <h2 className="mt-10 text-sm font-semibold tracking-wide text-foreground uppercase">Panel configuration (MDC)</h2>
      <p className="mt-1 max-w-3xl text-xs text-muted">
        The panel&apos;s own settings, which the browser cannot see — this is the only view that can catch a display
        scaling its output below the web layer. Collected from the office LAN with{" "}
        <code className="rounded bg-surface-2 px-1">npx tsx scripts/mdc.ts --hosts &lt;ip&gt;,… --post &lt;url&gt; --token &lt;token&gt;</code>
        , since the deployed app has no route to the panels.
      </p>

      {!mdcReport ? (
        <p className="mt-3 rounded border border-black/10 bg-surface-2 px-3 py-2 text-sm text-muted">
          No MDC report yet. Run the script above from a machine on the office network.
        </p>
      ) : (
        <>
          <p className="mt-2 text-xs text-muted">Taken {new Date(mdcReport.takenAt).toLocaleString()}</p>
          <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
            {mdcReport.panels.map((p) => (
              <div key={p.host} className="brand-card p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-foreground">{p.host}</p>
                  <span className={`text-xs ${p.reachable ? "text-emerald-600" : "text-red-600"}`}>
                    {p.reachable ? `answered (id ${p.displayId})` : `no answer — ${p.error ?? "unknown"}`}
                  </span>
                </div>
                {Object.entries(p.results).map(([name, r]) => (
                  <div key={name} className="mt-2 border-t border-black/5 pt-2">
                    <p className="text-xs font-medium text-foreground">
                      {name} <span className="text-muted">ack={r.ack ? "A" : "N"}</span>
                    </p>
                    <p className="font-mono text-[11px] break-all text-muted">
                      data=[{r.data.map((b) => b.toString(16).padStart(2, "0")).join(" ") || "—"}] raw={r.raw}
                    </p>
                    {r.interpreted && (
                      <p className="text-[11px] text-muted">
                        tentative: {JSON.stringify(r.interpreted)} — byte layout unconfirmed for the QMC series
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Underscan compensation for one panel.
 *
 * Steps of 1% rather than a free-text box: this is dialled in by eye against
 * the calibration markers — nudge down until all four corner blocks are fully
 * on the glass — and a number typed from a calculation has never once been the
 * right answer here.
 */
function ScaleControl({ displayId, initial }: { displayId: string; initial: number }) {
  const [value, setValue] = useState(initial);
  const [saving, setSaving] = useState(false);

  async function save(next: number) {
    const clamped = Math.min(100, Math.max(50, next));
    setValue(clamped);
    setSaving(true);
    try {
      await fetch(`/api/admin/displays/${displayId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentScale: clamped }),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-1">
      <button
        type="button"
        onClick={() => save(value - 1)}
        disabled={saving || value <= 50}
        className="rounded border border-black/10 px-1.5 py-0.5 text-xs disabled:opacity-40"
      >
        −
      </button>
      <span className={`w-10 text-center font-mono text-xs ${value < 100 ? "font-semibold text-gold" : ""}`}>
        {value}%
      </span>
      <button
        type="button"
        onClick={() => save(value + 1)}
        disabled={saving || value >= 100}
        className="rounded border border-black/10 px-1.5 py-0.5 text-xs disabled:opacity-40"
      >
        +
      </button>
    </span>
  );
}

function Row({ room, d }: { room: string; d: HubDisplayStatus }) {
  const vp = d.viewport;
  // Recomputed here rather than reusing the fault rule: this page is for
  // looking at the numbers, including the ones the rule deliberately ignores.
  const across = vp?.screenWidth && vp?.screenHeight
    ? (vp.width ?? 0) > (vp.height ?? 0)
      ? Math.max(vp.screenWidth, vp.screenHeight)
      : Math.min(vp.screenWidth, vp.screenHeight)
    : null;
  const down = vp?.screenWidth && vp?.screenHeight
    ? (vp.width ?? 0) > (vp.height ?? 0)
      ? Math.min(vp.screenWidth, vp.screenHeight)
      : Math.max(vp.screenWidth, vp.screenHeight)
    : null;
  const zoom = across && vp?.width ? across / vp.width : null;
  const chrome = zoom && down && vp?.height ? Math.round(down - vp.height * zoom) : null;

  return (
    <tr className="border-t border-black/5">
      <td className="px-4 py-2.5">
        <span className="text-muted">{room}</span> <span className="font-medium text-foreground">{d.name}</span>
      </td>
      <td className="px-4 py-2.5">
        <span className={d.online ? "text-emerald-600" : "text-muted"}>{d.online ? "yes" : "no"}</span>
      </td>
      <td className="max-w-[200px] truncate px-4 py-2.5 text-muted">
        {d.currentContent ? `${d.currentContent.type} · ${d.currentContent.title}` : "—"}
      </td>
      <td className="px-4 py-2.5 font-mono text-xs">{vp ? `${vp.width}×${vp.height}` : "—"}</td>
      <td className="px-4 py-2.5 font-mono text-xs">{vp ? `${vp.screenWidth}×${vp.screenHeight}` : "—"}</td>
      <td className="px-4 py-2.5 font-mono text-xs">{vp?.pixelRatio ?? "—"}</td>
      <td className="px-4 py-2.5 font-mono text-xs">{zoom ? `${Math.round(zoom * 100)}%` : "—"}</td>
      <td className={`px-4 py-2.5 font-mono text-xs ${chrome && chrome > 32 ? "text-red-600" : ""}`}>
        {chrome === null ? "—" : `${chrome}px`}
      </td>
      <td className="px-4 py-2.5">
        <ScaleControl displayId={d.id} initial={d.contentScale ?? 100} />
      </td>
    </tr>
  );
}
