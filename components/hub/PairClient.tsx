"use client";

import { useCallback, useEffect, useState } from "react";
import { StatusCircle } from "@/components/hub/StatusDot";

type Room = { id: string; name: string };
type Display = { id: string; name: string; number: number; room: { name: string } };
type Device = {
  id: string;
  label: string | null;
  paired: boolean;
  pairedAt: string | null;
  lastSeenAt: string | null;
  display: { id: string; name: string; number: number; room: { name: string } } | null;
};

// A TV counts as online if it has polled within the last ~90s.
const ONLINE_WINDOW_MS = 90_000;
function isOnline(lastSeenAt: string | null) {
  return Boolean(lastSeenAt && Date.now() - new Date(lastSeenAt).getTime() < ONLINE_WINDOW_MS);
}

export function PairClient({ initialCode }: { initialCode: string }) {
  const [code, setCode] = useState(initialCode);
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [displays, setDisplays] = useState<Display[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);

  const [displayId, setDisplayId] = useState("");
  const [newName, setNewName] = useState("");
  const [newNumber, setNewNumber] = useState(1);
  const [newRoomId, setNewRoomId] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadDevices = useCallback(() => {
    fetch("/api/admin/devices")
      .then((r) => r.json())
      .then((d) => setDevices(d.devices ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/displays").then((r) => r.json()),
      fetch("/api/admin/rooms").then((r) => r.json()),
    ])
      .then(([displaysData, roomsData]) => {
        const ds: Display[] = displaysData.displays ?? [];
        const rs: Room[] = roomsData.rooms ?? [];
        setDisplays(ds);
        setRooms(rs);
        if (ds.length) setDisplayId((cur) => cur || ds[0].id);
        else setMode("new");
        if (rs.length) setNewRoomId((cur) => cur || rs[0].id);
      })
      .catch(() => setError("Failed to load displays."));
    loadDevices();
  }, [loadDevices]);

  // Keep presence fresh while the page is open.
  useEffect(() => {
    const t = setInterval(loadDevices, 15_000);
    return () => clearInterval(t);
  }, [loadDevices]);

  async function approve() {
    setError(null);
    setSuccess(null);
    if (!code.trim()) {
      setError("Enter the code shown on the TV.");
      return;
    }
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = { code };
      if (mode === "new") payload.newDisplay = { name: newName.trim(), roomId: newRoomId, number: newNumber };
      else payload.displayId = displayId;

      const res = await fetch("/api/admin/pair/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not pair that screen.");
        return;
      }
      const d = data.display;
      setSuccess(`Paired to ${d.room.name} ${d.number}. The TV will switch to its content shortly.`);
      setCode("");
      setNewName("");
      loadDevices();
    } catch {
      setError("Could not pair that screen.");
    } finally {
      setSubmitting(false);
    }
  }

  async function unpair(deviceId: string) {
    if (!confirm("Unpair this screen? It will return to the pairing screen.")) return;
    await fetch("/api/admin/pair/unpair", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId }),
    });
    loadDevices();
  }

  const pairedDevices = devices.filter((d) => d.paired);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Approve form */}
      <div className="brand-card p-6">
        <h2 className="text-sm font-semibold text-foreground">Approve a screen</h2>

        <label className="mt-4 block">
          <span className="text-xs text-muted">Code from the TV</span>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="TUX-XXXX"
            className="mt-1 block w-full rounded border border-black/10 bg-white px-3 py-2 font-mono text-lg tracking-widest text-foreground uppercase"
          />
        </label>

        <div className="mt-5">
          <span className="text-xs text-muted">Assign to</span>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => setMode("existing")}
              disabled={displays.length === 0}
              className={`glass-btn rounded-lg px-3 py-1.5 text-sm ${mode === "existing" ? "glass-btn--gold" : ""}`}
            >
              Existing display
            </button>
            <button
              type="button"
              onClick={() => setMode("new")}
              className={`glass-btn rounded-lg px-3 py-1.5 text-sm ${mode === "new" ? "glass-btn--gold" : ""}`}
            >
              New display
            </button>
          </div>
        </div>

        {mode === "existing" ? (
          <label className="mt-4 block">
            <span className="text-xs text-muted">Display</span>
            <select
              value={displayId}
              onChange={(e) => setDisplayId(e.target.value)}
              className="mt-1 block w-full rounded border border-black/10 bg-white px-3 py-2 text-sm text-foreground"
            >
              {displays.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.room.name} — {d.name} (#{d.number})
                </option>
              ))}
            </select>
          </label>
        ) : (
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <label className="block">
              <span className="text-xs text-muted">Name</span>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Lobby TV"
                className="mt-1 block rounded border border-black/10 bg-white px-3 py-2 text-sm text-foreground"
              />
            </label>
            <label className="block">
              <span className="text-xs text-muted">Number</span>
              <input
                type="number"
                value={newNumber}
                onChange={(e) => setNewNumber(Number(e.target.value))}
                className="mt-1 block w-20 rounded border border-black/10 bg-white px-3 py-2 text-sm text-foreground"
              />
            </label>
            <label className="block">
              <span className="text-xs text-muted">Room</span>
              <select
                value={newRoomId}
                onChange={(e) => setNewRoomId(e.target.value)}
                className="mt-1 block rounded border border-black/10 bg-white px-3 py-2 text-sm text-foreground"
              >
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}

        <button
          onClick={approve}
          disabled={submitting || !code.trim() || (mode === "new" && !newName.trim())}
          className="glass-btn glass-btn--gold mt-6 w-full rounded-md py-2.5 text-sm font-semibold"
        >
          {submitting ? "Pairing…" : "Approve & pair"}
        </button>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        {success && (
          <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {success}
          </p>
        )}
      </div>

      {/* Paired screens */}
      <div className="brand-card p-6">
        <h2 className="text-sm font-semibold text-foreground">Paired screens</h2>
        {pairedDevices.length === 0 ? (
          <p className="mt-4 text-sm text-muted">No screens paired yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-black/5">
            {pairedDevices.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 truncate text-sm font-medium text-foreground">
                    <StatusCircle online={isOnline(d.lastSeenAt)} />
                    {d.display ? `${d.display.room.name} ${d.display.number}` : "—"}
                  </p>
                  <p className="text-xs text-muted">
                    {d.display?.name}
                    {d.lastSeenAt ? ` · seen ${new Date(d.lastSeenAt).toLocaleTimeString()}` : " · never seen"}
                  </p>
                </div>
                <button
                  onClick={() => unpair(d.id)}
                  className="glass-btn rounded-lg px-3 py-1.5 text-xs font-medium"
                >
                  Unpair
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
