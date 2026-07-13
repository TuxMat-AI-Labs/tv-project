"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CustomizeSubNav } from "@/components/hub/CustomizeSubNav";

type Room = { id: string; name: string; slug: string; sortOrder: number };
type Display = {
  id: string;
  slug: string;
  name: string;
  number: number;
  roomId: string;
  room: Room;
  active: boolean;
  screensaverOverride: boolean | null;
  contentFit: "COVER" | "CONTAIN" | "FILL";
  orientation: "PORTRAIT" | "LANDSCAPE";
};

export default function DisplaysPage() {
  const [displays, setDisplays] = useState<Display[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [refreshedId, setRefreshedId] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [newNumber, setNewNumber] = useState(1);
  const [newRoomId, setNewRoomId] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  function refresh() {
    return Promise.all([
      fetch("/api/admin/displays").then((r) => r.json()),
      fetch("/api/admin/rooms").then((r) => r.json()),
    ])
      .then(([displaysData, roomsData]) => {
        setDisplays(displaysData.displays ?? []);
        setRooms(roomsData.rooms ?? []);
        setError(null);
        if (!newRoomId && roomsData.rooms?.length) setNewRoomId(roomsData.rooms[0].id);
      })
      .catch(() => setError("Failed to load displays."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createDisplay() {
    if (!newName.trim() || !newRoomId) return;
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/admin/displays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), number: newNumber, roomId: newRoomId }),
      });
      if (!res.ok) throw new Error();
      setNewName("");
      setNewNumber(1);
      await refresh();
    } catch {
      setCreateError("Failed to create display.");
    } finally {
      setCreating(false);
    }
  }

  async function toggleActive(display: Display) {
    await fetch(`/api/admin/displays/${display.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !display.active }),
    });
    await refresh();
  }

  async function changeRoom(display: Display, roomId: string) {
    if (roomId === display.roomId) return;
    // Optimistically move the row so the table re-groups immediately.
    setDisplays((cur) =>
      [...cur.map((d) => (d.id === display.id ? { ...d, roomId, room: rooms.find((r) => r.id === roomId) ?? d.room } : d))].sort(
        (a, b) => a.room.sortOrder - b.room.sortOrder || a.number - b.number
      )
    );
    await fetch(`/api/admin/displays/${display.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId }),
    });
    await refresh();
  }

  async function changeOrientation(display: Display, orientation: Display["orientation"]) {
    if (orientation === display.orientation) return;
    // Optimistic — the hub tile + preview re-render in the new aspect at once.
    setDisplays((cur) => cur.map((d) => (d.id === display.id ? { ...d, orientation } : d)));
    await fetch(`/api/admin/displays/${display.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orientation }),
    });
    await refresh();
  }

  async function deleteDisplay(id: string) {
    if (!confirm("Delete this display? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/admin/displays/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      await refresh();
    } catch {
      setError("Failed to delete display.");
    }
  }

  function copyUrl(display: Display) {
    const url = `${window.location.origin}/display/${display.slug}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(display.id);
      setTimeout(() => setCopiedId((cur) => (cur === display.id ? null : cur)), 1500);
    });
  }

  async function refreshTv(display: Display) {
    setRefreshedId(display.id);
    await fetch(`/api/admin/displays/${display.id}/reload`, { method: "POST" });
    setTimeout(() => setRefreshedId((cur) => (cur === display.id ? null : cur)), 1800);
  }

  return (
    <div className="reveal">
      <h1 className="text-2xl font-semibold text-foreground">Customize</h1>
      <CustomizeSubNav active="displays" />

      <div className="mt-6 brand-card p-4">
        <h2 className="mb-3 text-sm font-semibold text-foreground">New display</h2>
        <div className="flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="text-xs text-muted">Name</span>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="mt-1 block rounded border border-black/10 bg-white px-2 py-1.5 text-sm text-foreground"
              placeholder="e.g. Lobby TV"
            />
          </label>
          <label className="block">
            <span className="text-xs text-muted">Number</span>
            <input
              type="number"
              value={newNumber}
              onChange={(e) => setNewNumber(Number(e.target.value))}
              className="mt-1 block w-20 rounded border border-black/10 bg-white px-2 py-1.5 text-sm text-foreground"
            />
          </label>
          <label className="block">
            <span className="text-xs text-muted">Room</span>
            <select
              value={newRoomId}
              onChange={(e) => setNewRoomId(e.target.value)}
              className="mt-1 block rounded border border-black/10 bg-white px-2 py-1.5 text-sm text-foreground"
            >
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name}
                </option>
              ))}
            </select>
          </label>
          <button
            onClick={createDisplay}
            disabled={creating || !newName.trim() || !newRoomId}
            className="glass-btn glass-btn--gold rounded px-4 py-1.5 text-sm font-medium"
          >
            {creating ? "Creating…" : "Create display"}
          </button>
        </div>
        {createError && <p className="mt-2 text-xs text-red-600">{createError}</p>}
        {rooms.length === 0 && !loading && (
          <p className="mt-2 text-xs text-muted">Create a room first before adding displays.</p>
        )}
      </div>

      <div className="mt-6 overflow-hidden brand-card">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b brand-hairline text-xs text-muted">
              <th className="px-4 py-3 font-medium">Room</th>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">#</th>
              <th className="px-4 py-3 font-medium">Active</th>
              <th className="px-4 py-3 font-medium">Screensaver</th>
              <th className="px-4 py-3 font-medium">Fit</th>
              <th className="px-4 py-3 font-medium">Orientation</th>
              <th className="px-4 py-3 font-medium">URL</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td className="px-4 py-4 text-muted" colSpan={9}>
                  Loading…
                </td>
              </tr>
            )}
            {!loading && displays.length === 0 && (
              <tr>
                <td className="px-4 py-4 text-muted" colSpan={9}>
                  No displays yet.
                </td>
              </tr>
            )}
            {displays.map((display) => (
              <tr key={display.id} className="border-b brand-hairline last:border-b-0">
                <td className="px-4 py-3">
                  <select
                    value={display.roomId}
                    onChange={(e) => changeRoom(display, e.target.value)}
                    className="rounded border border-black/10 bg-white px-2 py-1 text-sm text-foreground"
                    aria-label={`Room for ${display.name}`}
                  >
                    {rooms.map((room) => (
                      <option key={room.id} value={room.id}>
                        {room.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3 text-foreground">{display.name}</td>
                <td className="px-4 py-3 text-muted">{display.number}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleActive(display)}
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      display.active
                        ? "bg-emerald-950 text-emerald-300 hover:bg-emerald-900"
                        : "bg-surface-2 text-muted hover:bg-black/5"
                    }`}
                  >
                    {display.active ? "Active" : "Inactive"}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-muted">
                    {display.screensaverOverride === null
                      ? "Auto"
                      : display.screensaverOverride
                        ? "Forced on"
                        : "Forced off"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-muted capitalize">
                    {display.contentFit.toLowerCase()}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <select
                    value={display.orientation}
                    onChange={(e) => changeOrientation(display, e.target.value as Display["orientation"])}
                    className="rounded border border-black/10 bg-white px-2 py-1 text-sm text-foreground"
                    aria-label={`Orientation for ${display.name}`}
                  >
                    <option value="PORTRAIT">Portrait</option>
                    <option value="LANDSCAPE">Landscape</option>
                  </select>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => copyUrl(display)}
                    className="text-xs text-muted hover:text-gold"
                    title={`/display/${display.slug}`}
                  >
                    {copiedId === display.id ? "Copied!" : "Copy URL"}
                  </button>
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <button
                    onClick={() => refreshTv(display)}
                    className="mr-3 text-muted hover:text-gold"
                    title="Reload this TV's page"
                  >
                    {refreshedId === display.id ? "Requested!" : "Refresh TV"}
                  </button>
                  <Link href={`/hub/displays/${display.id}`} className="mr-3 text-foreground hover:text-gold">
                    Open
                  </Link>
                  <button onClick={() => deleteDisplay(display.id)} className="text-red-600 hover:text-red-700">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
