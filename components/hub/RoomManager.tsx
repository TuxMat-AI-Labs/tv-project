"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { TVFrame } from "@/components/hub/TVFrame";
import { StatusCircle } from "@/components/hub/StatusDot";
import { WebpagePreview } from "@/components/hub/WebpagePreview";
import { useHubStatus } from "@/lib/hub/useHubStatus";
import { downscaleImageForDisplay } from "@/lib/hub/downscaleImage";
import type { HubDisplayStatus } from "@/lib/hub/types";

type LibraryItem = {
  id: string;
  title: string;
  type: "IMAGE" | "VIDEO" | "WEBPAGE";
  thumbnailUrl: string | null;
  fileUrl: string;
  orientation: "PORTRAIT" | "LANDSCAPE";
};

const DEFAULT_IMAGE_SECONDS = 10;

/**
 * "Change what's on this screen", in one step.
 *
 * The existing route to this is two pages and six fields: upload on
 * Customize → Library (file, title, duration, orientation), then find the
 * display on Customize → Assignments and pair the two. Every one of those
 * fields can be inferred or defaulted, and none of them is the thing the person
 * actually came to do — which is "put this picture on that screen".
 *
 * So: pick a screen, give it a file, done. Title comes from the filename,
 * orientation from the image's real pixel dimensions, duration from a default.
 * All three stay editable afterwards in the full Library view; this is the fast
 * path, not a replacement for it.
 */
export function RoomManager({ roomSlug }: { roomSlug: string }) {
  const status = useHubStatus();
  const [library, setLibrary] = useState<LibraryItem[]>([]);
  const [openDisplayId, setOpenDisplayId] = useState<string | null>(null);
  const [busyDisplayId, setBusyDisplayId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const loadLibrary = useCallback(() => {
    fetch("/api/admin/content-items")
      .then((r) => r.json())
      .then((d) => setLibrary(d.items ?? []))
      .catch(() => {});
  }, []);

  useEffect(loadLibrary, [loadLibrary]);

  const room = status?.rooms.find((r) => r.slug === roomSlug);

  async function assign(displayId: string, contentItemId: string) {
    const res = await fetch(`/api/admin/displays/${displayId}/assignments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentItemId }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? "Could not put that on the screen.");
    }
  }

  /** Upload a fresh file and put it straight on the screen. */
  async function uploadAndAssign(display: HubDisplayStatus, file: File) {
    setBusyDisplayId(display.id);
    setError(null);
    setNote(null);
    try {
      const isVideo = file.type.startsWith("video/");
      const type: LibraryItem["type"] = isVideo ? "VIDEO" : "IMAGE";

      // Images are capped to the panels' native size before upload — an
      // over-large file renders zoomed and mispositioned on these TVs. The
      // same call reports the original dimensions, which is what makes
      // orientation something we can infer instead of ask.
      const processed = isVideo ? null : await downscaleImageForDisplay(file);
      const toUpload = processed?.file ?? file;
      const orientation: LibraryItem["orientation"] =
        processed && processed.from.w > processed.from.h ? "LANDSCAPE" : "PORTRAIT";

      const urlRes = await fetch("/api/admin/content-items/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: toUpload.name, contentType: toUpload.type }),
      });
      if (!urlRes.ok) throw new Error("Could not get an upload URL.");
      const { uploadUrl, publicUrl } = (await urlRes.json()) as { uploadUrl: string; publicUrl: string };

      const put = await fetch(uploadUrl, {
        method: "PUT",
        body: toUpload,
        headers: { "Content-Type": toUpload.type },
      });
      if (!put.ok) throw new Error("Upload to storage failed.");

      const created = await fetch("/api/admin/content-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: file.name.replace(/\.[^/.]+$/, ""),
          type,
          fileUrl: publicUrl,
          thumbnailUrl: type === "IMAGE" ? publicUrl : undefined,
          durationSec: type === "IMAGE" ? DEFAULT_IMAGE_SECONDS : undefined,
          orientation,
        }),
      });
      if (!created.ok) throw new Error("Could not save it to the library.");
      const item = (await created.json()) as { id: string };

      await assign(display.id, item.id);
      setOpenDisplayId(null);
      setNote(
        processed?.resized
          ? `On ${display.name}. Resized from ${processed.from.w}×${processed.from.h} to fit the panel.`
          : `On ${display.name}.`
      );
      loadLibrary();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusyDisplayId(null);
    }
  }

  async function pickExisting(display: HubDisplayStatus, item: LibraryItem) {
    setBusyDisplayId(display.id);
    setError(null);
    setNote(null);
    try {
      await assign(display.id, item.id);
      setOpenDisplayId(null);
      setNote(`“${item.title}” is on ${display.name}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusyDisplayId(null);
    }
  }

  if (!status) return <p className="text-sm text-muted">Loading screens…</p>;
  if (!room) return <p className="text-sm text-muted">Room not found.</p>;

  return (
    <div className="reveal">
      <h1 className="text-2xl font-semibold text-foreground">{room.name}</h1>
      <p className="mt-1 text-sm text-muted">
        Pick a screen, then drop in a picture or choose one you have used before. It goes up straight away.
      </p>

      {error && (
        <p className="mt-4 rounded border border-red-500/30 bg-red-500/5 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
      {note && (
        <p className="mt-4 rounded border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-sm text-emerald-700">
          {note}
        </p>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {room.displays.map((display) => (
          <DisplayCard
            key={display.id}
            display={display}
            library={library}
            busy={busyDisplayId === display.id}
            open={openDisplayId === display.id}
            onToggle={() => setOpenDisplayId((cur) => (cur === display.id ? null : display.id))}
            onFile={(f) => uploadAndAssign(display, f)}
            onPick={(item) => pickExisting(display, item)}
          />
        ))}
      </div>
    </div>
  );
}

function DisplayCard({
  display,
  library,
  busy,
  open,
  onToggle,
  onFile,
  onPick,
}: {
  display: HubDisplayStatus;
  library: LibraryItem[];
  busy: boolean;
  open: boolean;
  onToggle: () => void;
  onFile: (file: File) => void;
  onPick: (item: LibraryItem) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);

  // Only offer library items shaped for this panel. Handing a portrait picture
  // to a landscape screen is the single easiest mistake to make here, and it is
  // avoidable by simply not showing it.
  const usable = library.filter((i) => i.type !== "WEBPAGE" && i.orientation === display.orientation);

  return (
    <div className="brand-card overflow-hidden">
      <div className="relative">
        <TVFrame orientation={display.orientation}>
          <div className="absolute inset-0 bg-black">
            {display.currentContent?.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={display.currentContent.thumbnailUrl} alt="" className="h-full w-full object-cover" />
            ) : display.currentContent?.type === "WEBPAGE" ? (
              <WebpagePreview
                src={display.currentContent.fileUrl}
                orientation={display.orientation}
                title={display.currentContent.title}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[10px] tracking-[0.25em] text-white/60 uppercase">
                Nothing assigned
              </div>
            )}
          </div>
        </TVFrame>
        {busy && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 text-xs tracking-wide text-white uppercase">
            Putting it up…
          </div>
        )}
      </div>

      <div className="p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-medium text-foreground">{display.name}</p>
          <StatusCircle online={display.online} />
        </div>
        <p className="mt-0.5 truncate text-xs text-muted">
          {display.currentContent?.title ?? "Nothing assigned"}
        </p>

        {/* Surfaced here as well as on the panel: someone standing in this view
            is the person most likely to act on it, and a screen rendering wrong
            still reads as perfectly online. */}
        {display.viewportFaults?.length > 0 && (
          <p className="mt-2 rounded bg-red-500/10 px-2 py-1 text-[11px] text-red-700">
            {display.viewportFaults[0].detail}
          </p>
        )}

        <button
          type="button"
          onClick={onToggle}
          disabled={busy}
          className="glass-btn glass-btn--gold mt-3 w-full rounded px-3 py-2 text-sm font-medium disabled:opacity-50"
        >
          {open ? "Close" : "Change what's on this screen"}
        </button>

        {open && (
          <div className="mt-3">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                const f = e.dataTransfer.files?.[0];
                if (f) onFile(f);
              }}
              onClick={() => inputRef.current?.click()}
              className={`cursor-pointer rounded border border-dashed px-3 py-6 text-center text-xs transition-colors ${
                dragging ? "border-gold bg-gold/10 text-foreground" : "border-black/15 text-muted hover:bg-black/[0.03]"
              }`}
            >
              <p className="font-medium text-foreground">Drop a picture or video here</p>
              <p className="mt-0.5">or tap to choose one — it goes up right away</p>
              <input
                ref={inputRef}
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onFile(f);
                  e.target.value = "";
                }}
              />
            </div>

            {usable.length > 0 && (
              <>
                <p className="mt-3 text-[11px] tracking-wide text-muted uppercase">Or reuse</p>
                <div className="no-scrollbar mt-1.5 flex gap-2 overflow-x-auto pb-1">
                  {usable.slice(0, 24).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      title={item.title}
                      onClick={() => onPick(item)}
                      className="group shrink-0 overflow-hidden rounded border border-black/10 transition hover:border-gold"
                    >
                      <span className="block h-16 w-12 bg-surface-2">
                        {item.thumbnailUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center text-[8px] text-muted uppercase">
                            {item.type}
                          </span>
                        )}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
