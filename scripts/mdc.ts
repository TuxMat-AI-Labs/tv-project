/**
 * Probe the office panels over MDC and report what they say about themselves.
 *
 *   npx tsx scripts/mdc.ts --hosts 10.0.1.41,10.0.1.42
 *   npx tsx scripts/mdc.ts --hosts 10.0.1.41 --id 1
 *   npx tsx scripts/mdc.ts --hosts 10.0.1.41 --cmd 0x00        # one raw command
 *   npx tsx scripts/mdc.ts --hosts … --out report.json          # save
 *   npx tsx scripts/mdc.ts --hosts … --post https://tuxdisplay.tuxmat.ai --token …
 *
 * READ-ONLY. Nothing here sets anything on a panel: every command it sends has
 * an empty payload, which in MDC is a GET. Writing to a wall of displays from a
 * script is a good way to take the whole wall down at once, so a write path
 * should be added deliberately, per-setting, and not before a dump has shown
 * what actually differs between a broken panel and a healthy one.
 *
 * Must run from a machine on the office LAN. The deployed app has no route to
 * these panels, which is why this is a CLI and not a server feature.
 */

import net from "node:net";
import { writeFileSync } from "node:fs";
import {
  BROADCAST_ID,
  CMD,
  MDC_PORT,
  buildPacket,
  interpretStatus,
  parseResponse,
  type MdcResponse,
} from "../lib/mdc/protocol";

const CONNECT_TIMEOUT_MS = 4_000;
const REPLY_TIMEOUT_MS = 3_000;

type Probe = { name: string; command: number };

const DEFAULT_PROBES: Probe[] = [
  { name: "status", command: CMD.STATUS },
  { name: "power", command: CMD.POWER },
  { name: "inputSource", command: CMD.INPUT_SOURCE },
  { name: "screenSize", command: CMD.SCREEN_SIZE },
];

type PanelReport = {
  host: string;
  displayId: number;
  reachable: boolean;
  error?: string;
  results: Record<string, { ack: boolean; data: number[]; raw: string; interpreted?: Record<string, number | undefined> }>;
};

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

/** One request, one reply, on its own short-lived connection. */
function ask(host: string, displayId: number, command: number): Promise<MdcResponse> {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    let settled = false;
    const done = (fn: () => void) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      fn();
    };

    socket.setTimeout(CONNECT_TIMEOUT_MS);
    socket.once("timeout", () => done(() => reject(new Error("timed out"))));
    socket.once("error", (e) => done(() => reject(e)));

    socket.connect(MDC_PORT, host, () => {
      socket.setTimeout(REPLY_TIMEOUT_MS);
      socket.write(buildPacket(command, displayId));
    });

    // Panels answer in a single frame in practice, but accumulate rather than
    // assume: a split reply would otherwise fail its checksum and look like a
    // protocol error when it is only TCP being TCP.
    let buf = Buffer.alloc(0);
    socket.on("data", (chunk) => {
      buf = Buffer.concat([buf, chunk]);
      if (buf.length < 7) return;
      const expected = 4 + buf[3] + 1;
      if (buf.length < expected) return;
      try {
        const parsed = parseResponse(buf);
        done(() => resolve(parsed));
      } catch (e) {
        done(() => reject(e));
      }
    });
  });
}

async function probePanel(host: string, displayId: number, probes: Probe[]): Promise<PanelReport> {
  const report: PanelReport = { host, displayId, reachable: false, results: {} };
  for (const p of probes) {
    try {
      const res = await ask(host, displayId, p.command);
      report.reachable = true;
      report.results[p.name] = {
        ack: res.ack,
        data: res.data,
        raw: res.raw,
        ...(p.command === CMD.STATUS ? { interpreted: interpretStatus(res.data) } : {}),
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // A refusal is still contact — only record a whole-panel error when
      // nothing has answered, so one unsupported command does not read as
      // "panel unreachable".
      if (!report.reachable) report.error = msg;
      report.results[p.name] = { ack: false, data: [], raw: `error: ${msg}` };
    }
  }
  return report;
}

async function main() {
  const hosts = (arg("hosts") ?? "").split(",").map((h) => h.trim()).filter(Boolean);
  if (!hosts.length) {
    console.error("Usage: npx tsx scripts/mdc.ts --hosts <ip>[,<ip>…] [--id N] [--cmd 0xNN] [--out f.json] [--post URL --token T]");
    console.error("\nPanel IPs: on each display, Menu → Network → Network Status.");
    console.error("MDC must be enabled: Menu → System → (Remote/Network) Control.");
    process.exit(1);
  }

  const displayId = arg("id") ? Number(arg("id")) : BROADCAST_ID;
  const rawCmd = arg("cmd");
  const probes: Probe[] = rawCmd
    ? [{ name: `cmd_${rawCmd}`, command: Number(rawCmd) }]
    : DEFAULT_PROBES;

  console.log(`Probing ${hosts.length} panel(s) on port ${MDC_PORT}, display id ${displayId} (0xfe = broadcast)\n`);

  const reports: PanelReport[] = [];
  for (const host of hosts) {
    const r = await probePanel(host, displayId, probes);
    reports.push(r);
    console.log(`── ${host} ${r.reachable ? "" : `UNREACHABLE (${r.error})`}`);
    for (const [name, res] of Object.entries(r.results)) {
      const bytes = res.data.length ? res.data.map((b) => b.toString(16).padStart(2, "0")).join(" ") : "—";
      console.log(`   ${name.padEnd(12)} ack=${res.ack ? "A" : "N"}  data=[${bytes}]  raw=${res.raw}`);
      if (res.interpreted) {
        console.log(`   ${"".padEnd(12)} (tentative: ${JSON.stringify(res.interpreted)} — layout unconfirmed for QMC)`);
      }
    }
    console.log();
  }

  const payload = { takenAt: new Date().toISOString(), panels: reports };

  const out = arg("out");
  if (out) {
    writeFileSync(out, JSON.stringify(payload, null, 2));
    console.log(`Saved ${out}`);
  }

  const post = arg("post");
  if (post) {
    const token = arg("token");
    if (!token) {
      console.error("--post needs --token (must match MDC_REPORT_TOKEN on the server)");
      process.exit(1);
    }
    const res = await fetch(`${post.replace(/\/$/, "")}/api/admin/troubleshoot/mdc`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-mdc-token": token },
      body: JSON.stringify(payload),
    });
    console.log(res.ok ? `Posted to ${post} — visible on /hub/troubleshoot` : `Post failed: HTTP ${res.status}`);
  }

  const reachable = reports.filter((r) => r.reachable).length;
  console.log(`\n${reachable}/${reports.length} panel(s) answered.`);
  if (reachable && reports.length > 1) {
    console.log("Diff a broken panel against a healthy one — the difference is what to change.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
