"use client";

import { useEffect, useState } from "react";
import { CustomizeSubNav } from "@/components/hub/CustomizeSubNav";

type Room = { id: string; name: string; slug: string; sortOrder: number };

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [newSortOrder, setNewSortOrder] = useState(0);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editSortOrder, setEditSortOrder] = useState(0);
  const [savingEdit, setSavingEdit] = useState(false);

  const [deleteError, setDeleteError] = useState<string | null>(null);

  function refresh() {
    return fetch("/api/admin/rooms")
      .then((r) => r.json())
      .then((data) => {
        setRooms(data.rooms ?? []);
        setError(null);
      })
      .catch(() => setError("Failed to load rooms."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    refresh();
  }, []);

  async function createRoom() {
    if (!newName.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/admin/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), sortOrder: newSortOrder }),
      });
      if (!res.ok) throw new Error();
      setNewName("");
      setNewSortOrder(0);
      await refresh();
    } catch {
      setCreateError("Failed to create room.");
    } finally {
      setCreating(false);
    }
  }

  function startEdit(room: Room) {
    setEditingId(room.id);
    setEditName(room.name);
    setEditSortOrder(room.sortOrder);
  }

  async function saveEdit(id: string) {
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/admin/rooms/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim(), sortOrder: editSortOrder }),
      });
      if (!res.ok) throw new Error();
      setEditingId(null);
      await refresh();
    } catch {
      setError("Failed to save room.");
    } finally {
      setSavingEdit(false);
    }
  }

  async function deleteRoom(id: string) {
    if (!confirm("Delete this room? This cannot be undone.")) return;
    setDeleteError(null);
    try {
      const res = await fetch(`/api/admin/rooms/${id}`, { method: "DELETE" });
      if (!res.ok) {
        setDeleteError("Move or delete this room's displays first.");
        return;
      }
      await refresh();
    } catch {
      setDeleteError("Move or delete this room's displays first.");
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-foreground">Customize</h1>
      <CustomizeSubNav active="rooms" />

      <div className="mt-6 brand-card p-4">
        <h2 className="mb-3 text-sm font-semibold text-foreground">New room</h2>
        <div className="flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="text-xs text-muted">Name</span>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="mt-1 block rounded border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-white"
              placeholder="e.g. Lobby"
            />
          </label>
          <label className="block">
            <span className="text-xs text-muted">Sort order</span>
            <input
              type="number"
              value={newSortOrder}
              onChange={(e) => setNewSortOrder(Number(e.target.value))}
              className="mt-1 block w-24 rounded border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-white"
            />
          </label>
          <button
            onClick={createRoom}
            disabled={creating || !newName.trim()}
            className="rounded bg-gold px-4 py-1.5 text-sm font-medium text-black transition hover:bg-gold-light disabled:opacity-50"
          >
            {creating ? "Creating…" : "Create room"}
          </button>
        </div>
        {createError && <p className="mt-2 text-xs text-red-400">{createError}</p>}
      </div>

      {deleteError && (
        <p className="mt-4 rounded border border-red-900 bg-red-950/40 px-3 py-2 text-sm text-red-400">
          {deleteError}
        </p>
      )}

      <div className="mt-6 overflow-hidden brand-card">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b brand-hairline text-xs text-muted">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Sort order</th>
              <th className="px-4 py-3 font-medium">Slug</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td className="px-4 py-4 text-muted" colSpan={4}>
                  Loading…
                </td>
              </tr>
            )}
            {!loading && rooms.length === 0 && (
              <tr>
                <td className="px-4 py-4 text-muted" colSpan={4}>
                  No rooms yet.
                </td>
              </tr>
            )}
            {rooms.map((room) => (
              <tr key={room.id} className="border-b brand-hairline last:border-b-0">
                {editingId === room.id ? (
                  <>
                    <td className="px-4 py-2">
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-white"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        value={editSortOrder}
                        onChange={(e) => setEditSortOrder(Number(e.target.value))}
                        className="w-20 rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-white"
                      />
                    </td>
                    <td className="px-4 py-2 text-muted">{room.slug}</td>
                    <td className="px-4 py-2 text-right">
                      <button
                        onClick={() => saveEdit(room.id)}
                        disabled={savingEdit}
                        className="mr-3 text-zinc-200 hover:text-gold-light"
                      >
                        Save
                      </button>
                      <button onClick={() => setEditingId(null)} className="text-muted hover:text-zinc-300">
                        Cancel
                      </button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-3 text-foreground">{room.name}</td>
                    <td className="px-4 py-3 text-muted">{room.sortOrder}</td>
                    <td className="px-4 py-3 text-muted">{room.slug}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => startEdit(room)} className="mr-3 text-zinc-300 hover:text-gold-light">
                        Edit
                      </button>
                      <button onClick={() => deleteRoom(room.id)} className="text-red-400 hover:text-red-300">
                        Delete
                      </button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  );
}
