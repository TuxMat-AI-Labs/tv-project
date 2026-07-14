"use client";

import { useEffect, useRef, useState } from "react";
import { CustomizeSubNav } from "@/components/hub/CustomizeSubNav";

type ContentItem = {
  id: string;
  title: string;
  type: "IMAGE" | "VIDEO";
  thumbnailUrl: string | null;
  fileUrl: string;
  orientation: "PORTRAIT" | "LANDSCAPE";
  rotationRoomId: string | null;
};

type RoomLite = { id: string; name: string };

export default function LibraryPage() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [rooms, setRooms] = useState<RoomLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [durationSec, setDurationSec] = useState(10);
  const [orientation, setOrientation] = useState<"PORTRAIT" | "LANDSCAPE">("PORTRAIT");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const mediaType: "IMAGE" | "VIDEO" | null = file
    ? file.type.startsWith("video/")
      ? "VIDEO"
      : "IMAGE"
    : null;

  function refresh() {
    return Promise.all([
      fetch("/api/admin/content-items").then((r) => r.json()),
      fetch("/api/admin/rooms").then((r) => r.json()),
    ])
      .then(([itemsData, roomsData]) => {
        setItems(itemsData.items ?? []);
        setRooms(roomsData.rooms ?? []);
        setError(null);
      })
      .catch(() => setError("Failed to load library."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    refresh();
  }, []);

  async function setItemOrientation(id: string, next: "PORTRAIT" | "LANDSCAPE") {
    const prev = items;
    // A rotation assignment (`rotationRoomId`) is independent of orientation —
    // flipping orientation just moves the item into the other orientation's
    // pool within the same room, it doesn't evict it from the rotation.
    setItems((cur) => cur.map((it) => (it.id === id ? { ...it, orientation: next } : it)));
    try {
      const res = await fetch(`/api/admin/content-items/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orientation: next }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setItems(prev);
      setError("Failed to update orientation.");
    }
  }

  async function setItemRotation(id: string, roomId: string | null) {
    const prev = items;
    setItems((cur) => cur.map((it) => (it.id === id ? { ...it, rotationRoomId: roomId } : it)));
    try {
      const res = await fetch(`/api/admin/content-items/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rotationRoomId: roomId }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setItems(prev);
      setError("Failed to update rotation.");
    }
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
    if (selected && !title) {
      setTitle(selected.name.replace(/\.[^/.]+$/, ""));
    }
  }

  async function upload() {
    if (!file || !title.trim() || !mediaType) return;
    setUploading(true);
    setUploadError(null);
    try {
      const urlRes = await fetch("/api/admin/content-items/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, contentType: file.type }),
      });
      if (!urlRes.ok) throw new Error("Could not get an upload URL.");
      const { uploadUrl, publicUrl } = (await urlRes.json()) as { uploadUrl: string; publicUrl: string };

      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      if (!putRes.ok) throw new Error("Upload to storage failed.");

      const createRes = await fetch("/api/admin/content-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          type: mediaType,
          fileUrl: publicUrl,
          thumbnailUrl: mediaType === "IMAGE" ? publicUrl : undefined,
          durationSec: mediaType === "IMAGE" ? durationSec : undefined,
          orientation,
        }),
      });
      if (!createRes.ok) throw new Error("Could not save the content item.");

      setFile(null);
      setTitle("");
      setDurationSec(10);
      setOrientation("PORTRAIT");
      if (fileInputRef.current) fileInputRef.current.value = "";
      await refresh();
    } catch (err) {
      setUploadError(
        err instanceof Error
          ? err.message
          : "Upload failed. Storage may not be configured in this environment yet."
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="reveal">
      <h1 className="text-2xl font-semibold text-foreground">Customize</h1>
      <CustomizeSubNav active="library" />

      <div className="mt-6 brand-card p-4">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Upload content</h2>
        <div className="flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="text-xs text-muted">File</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              onChange={onFileChange}
              className="mt-1 block text-sm text-foreground file:mr-3 file:rounded file:border-0 file:bg-surface-2 file:px-3 file:py-1.5 file:text-sm file:text-foreground hover:file:bg-black/5"
            />
          </label>
          <label className="block">
            <span className="text-xs text-muted">Title</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 block rounded border border-black/10 bg-white px-2 py-1.5 text-sm text-foreground"
              placeholder="e.g. Summer promo"
            />
          </label>
          <label className="block">
            <span className="text-xs text-muted">Duration (sec)</span>
            <input
              type="number"
              min={1}
              value={durationSec}
              onChange={(e) => setDurationSec(Number(e.target.value))}
              disabled={mediaType === "VIDEO"}
              className="mt-1 block w-24 rounded border border-black/10 bg-white px-2 py-1.5 text-sm text-foreground disabled:opacity-40"
            />
            {mediaType === "VIDEO" && <p className="mt-1 text-[10px] text-muted">Uses the video&apos;s own length</p>}
          </label>
          <label className="block">
            <span className="text-xs text-muted">Orientation</span>
            <select
              value={orientation}
              onChange={(e) => setOrientation(e.target.value as "PORTRAIT" | "LANDSCAPE")}
              className="mt-1 block rounded border border-black/10 bg-white px-2 py-1.5 text-sm text-foreground"
            >
              <option value="PORTRAIT">Portrait</option>
              <option value="LANDSCAPE">Landscape</option>
            </select>
          </label>
          <button
            onClick={upload}
            disabled={uploading || !file || !title.trim()}
            className="glass-btn glass-btn--gold rounded px-4 py-1.5 text-sm font-medium"
          >
            {uploading ? "Uploading…" : "Upload"}
          </button>
        </div>
        {uploadError && <p className="mt-2 text-xs text-red-600">{uploadError}</p>}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {loading && <p className="col-span-full text-sm text-muted">Loading…</p>}
        {!loading && items.length === 0 && (
          <p className="col-span-full text-sm text-muted">No content in the library yet.</p>
        )}
        {items.map((item) => (
          <div key={item.id} className="overflow-hidden brand-card">
            <div className="flex aspect-video items-center justify-center bg-surface-2">
              {item.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.thumbnailUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-xs text-muted uppercase">{item.type}</span>
              )}
            </div>
            <div className="p-2">
              <p className="truncate text-xs font-medium text-foreground">{item.title}</p>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <span className="inline-block rounded-full bg-surface-2 px-2 py-0.5 text-[10px] text-muted uppercase">
                  {item.type}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setItemOrientation(item.id, item.orientation === "LANDSCAPE" ? "PORTRAIT" : "LANDSCAPE")
                  }
                  title="Click to toggle orientation"
                  className={`inline-block min-h-[32px] rounded-full px-2.5 py-1.5 text-[10px] uppercase transition-colors ${
                    item.orientation === "LANDSCAPE"
                      ? "bg-gold text-white"
                      : "bg-surface-2 text-muted hover:text-foreground"
                  }`}
                >
                  {item.orientation === "LANDSCAPE" ? "Landscape" : "Portrait"}
                </button>
              </div>
              {item.type === "IMAGE" && (
                <label className="mt-1.5 block">
                  <span className="text-[10px] text-muted uppercase">Rotation</span>
                  <select
                    value={item.rotationRoomId ?? ""}
                    onChange={(e) => setItemRotation(item.id, e.target.value || null)}
                    className={`mt-0.5 block w-full rounded border px-1.5 py-2 text-[11px] ${
                      item.rotationRoomId
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700"
                        : "border-black/10 bg-white text-foreground"
                    }`}
                  >
                    <option value="">Off</option>
                    {rooms.map((room) => (
                      <option key={room.id} value={room.id}>
                        {room.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          </div>
        ))}
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
