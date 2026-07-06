"use client";

import { useEffect, useRef, useState } from "react";
import { CustomizeSubNav } from "@/components/hub/CustomizeSubNav";

type ContentItem = {
  id: string;
  title: string;
  type: "IMAGE" | "VIDEO";
  thumbnailUrl: string | null;
  fileUrl: string;
};

export default function LibraryPage() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [durationSec, setDurationSec] = useState(10);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const mediaType: "IMAGE" | "VIDEO" | null = file
    ? file.type.startsWith("video/")
      ? "VIDEO"
      : "IMAGE"
    : null;

  function refresh() {
    return fetch("/api/admin/content-items")
      .then((r) => r.json())
      .then((data) => {
        setItems(data.items ?? []);
        setError(null);
      })
      .catch(() => setError("Failed to load library."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    refresh();
  }, []);

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
        }),
      });
      if (!createRes.ok) throw new Error("Could not save the content item.");

      setFile(null);
      setTitle("");
      setDurationSec(10);
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
          <button
            onClick={upload}
            disabled={uploading || !file || !title.trim()}
            className="rounded bg-gold px-4 py-1.5 text-sm font-medium text-black transition hover:bg-gold-light disabled:opacity-50"
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
              <span className="mt-1 inline-block rounded-full bg-surface-2 px-2 py-0.5 text-[10px] text-muted uppercase">
                {item.type}
              </span>
            </div>
          </div>
        ))}
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
