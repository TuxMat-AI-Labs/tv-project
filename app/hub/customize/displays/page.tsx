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
};

export default function DisplaysPage() {
  const [displays, setDisplays] = useState<Display[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  return (
    <div>
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
              className="mt-1 block rounded border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-white"
              placeholder="e.g. Lobby TV"
            />
          </label>
          <label className="block">
            <span className="text-xs text-muted">Number</span>
            <input
              type="number"
              value={newNumber}
              onChange={(e) => setNewNumber(Number(e.target.value))}
              className="mt-1 block w-20 rounded border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-white"
            />
          </label>
          <label className="block">
            <span className="text-xs text-muted">Room</span>
            <select
              value={newRoomId}
              onChange={(e) => setNewRoomId(e.target.value)}
              className="mt-1 block rounded border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-white"
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
            className="rounded bg-gold px-4 py-1.5 text-sm font-medium text-black transition hover:bg-gold-light disabled:opacity-50"
          >
            {creating ? "Creating…" : "Create display"}
          </button>
        </div>
        {createError && <p className="mt-2 text-xs text-red-400">{createError}</p>}
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
              <th className="px-4 py-3 font-medium">URL</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td className="px-4 py-4 text-muted" colSpan={8}>
                  Loading…
                </td>
              </tr>
            )}
            {!loading && displays.length === 0 && (
              <tr>
                <td className="px-4 py-4 text-muted" colSpan={8}>
                  No displays yet.
                </td>
              </tr>
            )}
            {displays.map((display) => (
              <tr key={display.id} className="border-b brand-hairline last:border-b-0">
                <td className="px-4 py-3 text-muted">{display.room.name}</td>
                <td className="px-4 py-3 text-foreground">{display.name}</td>
                <td className="px-4 py-3 text-muted">{display.number}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleActive(display)}
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      display.active
                        ? "bg-emerald-950 text-emerald-300 hover:bg-emerald-900"
                        : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                    }`}
                  >
                    {display.active ? "Active" : "Inactive"}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
                    {display.screensaverOverride === null
                      ? "Auto"
                      : display.screensaverOverride
                        ? "Forced on"
                        : "Forced off"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400 capitalize">
                    {display.contentFit.toLowerCase()}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => copyUrl(display)}
                    className="text-xs text-muted hover:text-gold-light"
                    title={`/display/${display.slug}`}
                  >
                    {copiedId === display.id ? "Copied!" : "Copy URL"}
                  </button>
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <Link href={`/hub/displays/${display.id}`} className="mr-3 text-zinc-300 hover:text-gold-light">
                    Open
                  </Link>
                  <button onClick={() => deleteDisplay(display.id)} className="text-red-400 hover:text-red-300">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  );
}
