"use client";

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
export function TroubleshootView({ mdcReport }: { mdcReport: MdcReport }) {
  const status = useHubStatus();

  return (
    <div className="reveal">
      <h1 className="text-2xl font-semibold text-foreground">Troubleshoot</h1>
      <p className="mt-1 max-w-3xl text-sm text-muted">
        What each screen reports about itself. A display can be online, paired and on the right content and still
        render wrong — so compare a screen that looks wrong against one that looks right, and trust the difference
        rather than any single reading.
      </p>

      <h2 className="mt-8 text-sm font-semibold tracking-wide text-foreground uppercase">Browser-reported viewport</h2>
      <p className="mt-1 text-xs text-muted">
        Measured in the TV&apos;s own browser and sent with each heartbeat. <strong>Zoom is shown, not judged</strong> —
        these panels run at 125% natively and content sized in viewport units renders identically either way.
      </p>

      {!status ? (
        <p className="mt-4 text-sm text-muted">Loading…</p>
      ) : (
        <div className="mt-3 overflow-x-auto brand-card">
          <table className="w-full min-w-[820px] text-left text-sm">
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
    </tr>
  );
}
