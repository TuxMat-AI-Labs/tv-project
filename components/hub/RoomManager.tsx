"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { TVFrame } from "@/components/hub/TVFrame";
import { DisplayCarousel } from "@/components/hub/DisplayCarousel";
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
export function RoomManager({
  roomSlugs,
  isAdmin = false,
  marketingRoster = [],
}: {
  /** One or more rooms, rendered as stacked sections like the dashboard. */
  roomSlugs: string[];
  /** Viewer is an admin previewing this view rather than living in it. */
  isAdmin?: boolean;
  marketingRoster?: { email: string; roomSlugs: string[] }[];
}) {
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

  // Preserve the order given, so the nav and the page agree.
  const shownRooms = roomSlugs
    .map((slug) => status?.rooms.find((r) => r.slug === slug))
    .filter((r): r is NonNullable<typeof r> => Boolean(r));

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
  if (!shownRooms.length) return <p className="text-sm text-muted">Room not found.</p>;

  const heading = shownRooms.length === 1 ? shownRooms[0].name : "Your screens";

  return (
    <div className="reveal">
      <h1 className="text-2xl font-semibold text-foreground">{heading}</h1>
      <p className="mt-1 text-sm text-muted">
        Pick a screen, then drop in a picture or choose one you have used before. It goes up straight away.
      </p>

      {/* Admins only. The marketing team sees this page as their entire hub, so
          showing them a panel about their own permissions would be noise — and
          listing colleagues' access to people who cannot change it is worse
          than useless. For an admin it answers the two questions that actually
          come up: who can get in, and what link do I send them. */}
      {isAdmin && (
        <div className="mt-5 brand-card p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">
                This is the Marketing view
              </p>
              <p className="mt-1 max-w-2xl text-xs text-muted">
                You are seeing it as an admin, so your header still has every other tab. The people
                below see <strong>only this page</strong> — every other hub URL sends them back here, and
                the API refuses any room outside {shownRooms.map((r) => r.name).join(" and ")} even if
                they go at it directly.
              </p>
            </div>
          </div>

          <div className="mt-3 border-t border-black/5 pt-3">
            <p className="text-[11px] font-medium tracking-wide text-muted uppercase">
              Who has access ({marketingRoster.length})
            </p>
            {marketingRoster.length === 0 ? (
              <p className="mt-1 text-xs text-muted">
                Nobody is scoped to these rooms yet.
              </p>
            ) : (
              <ul className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
                {marketingRoster.map((m) => (
                  <li key={m.email} className="font-mono text-xs text-foreground">
                    {m.email}
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-xs text-muted">
              To add or remove someone, the list lives in{" "}
              <code className="rounded bg-surface-2 px-1">lib/auth/roles.ts</code> and needs a deploy —
              it is deliberately in the repo rather than editable here, so access changes are reviewed.
            </p>
          </div>

          <div className="mt-3 border-t border-black/5 pt-3">
            <p className="text-[11px] font-medium tracking-wide text-muted uppercase">Link to share</p>
            <p className="mt-1 font-mono text-xs break-all text-foreground">
              https://tuxdisplay.tuxmat.ai/hub
            </p>
            <p className="mt-1 text-xs text-muted">
              Send the plain hub link, not this page&apos;s URL. They sign in with their TuxMat account and
              land here automatically — no code to remember, and it still works if the room is ever renamed.
            </p>
          </div>
        </div>
      )}

      {error && (
        <p className="mt-4 rounded border border-red-500/30 bg-red-500/5 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
      {note && (
        <p className="mt-4 rounded border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-sm text-emerald-700">
          {note}
        </p>
      )}

      {/* One carousel per room, exactly as the dashboard presents a room.
          Mixed portrait/landscape panels only line up because that component
          gives every tile a shared height — a plain grid left the landscape
          cards with a column of dead space beside the tall portrait one. */}
      {shownRooms.map((r) => {
        const openHere = r.displays.find((d) => d.id === openDisplayId) ?? null;
        return (
          <section key={r.id} className="mt-2">
            <DisplayCarousel
              title={r.name}
              displays={r.displays}
              tileSize="large"
              titleAction={
                <span className="text-sm font-normal tracking-normal text-muted normal-case">
                  {r.displays.length} screens
                </span>
              }
              renderTile={(display) => (
                <DisplayCard
                  display={display}
                  busy={busyDisplayId === display.id}
                  selected={openDisplayId === display.id}
                  onToggle={() => setOpenDisplayId((cur) => (cur === display.id ? null : display.id))}
                />
              )}
            />

            {/* The editor lives UNDER the row, not inside a cell. In a cell it
                would either be crushed into a tile's width or stretch the row,
                and the whole point of this layout is that the row stays even. */}
            {openHere && (
              <Editor
                display={openHere}
                library={library}
                busy={busyDisplayId === openHere.id}
                onClose={() => setOpenDisplayId(null)}
                onFile={(f) => uploadAndAssign(openHere, f)}
                onPick={(item) => pickExisting(openHere, item)}
              />
            )}
          </section>
        );
      })}
    </div>
  );
}

/**
 * One screen in the row: the panel as it looks now, its name, and the way in.
 *
 * Kept to the same silhouette as the dashboard's tile — framed panel, name,
 * status dot — so the two views read as the same wall. The only addition is the
 * button, and it selects rather than expands: what it opens is rendered beneath
 * the whole row.
 */
function DisplayCard({
  display,
  busy,
  selected,
  onToggle,
}: {
  display: HubDisplayStatus;
  busy: boolean;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <div>
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

            {/* On the screen rather than under it, so a fault costs no layout
                and every tile in the row stays the same height. */}
            {display.viewportFaults?.length > 0 && (
              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 p-1.5">
                {display.viewportFaults.map((f) => (
                  <p
                    key={f.kind}
                    title={f.detail}
                    className="pointer-events-auto mt-1 rounded px-1.5 py-1 text-[10px] leading-tight font-medium text-white"
                    style={{ background: "rgba(140,22,22,0.94)" }}
                  >
                    {f.short}
                  </p>
                ))}
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

      <div className="mt-3">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-medium text-foreground">{display.name}</p>
          <StatusCircle online={display.online} />
        </div>
        <p className="mt-0.5 truncate text-xs text-muted">
          {display.currentContent?.title ?? "Nothing assigned"}
        </p>
        <button
          type="button"
          onClick={onToggle}
          disabled={busy}
          className={`glass-btn mt-2.5 w-full rounded px-3 py-2 text-sm font-medium disabled:opacity-50 ${
            selected ? "" : "glass-btn--gold"
          }`}
        >
          {selected ? "Close" : "Change"}
        </button>
      </div>
    </div>
  );
}

/**
 * The change panel for whichever screen is selected, shown below the row.
 *
 * Full width because it can be: a drop target the size of a tile is a poor
 * target, and the reuse strip needs room to show more than two thumbnails.
 */
function Editor({
  display,
  library,
  busy,
  onClose,
  onFile,
  onPick,
}: {
  display: HubDisplayStatus;
  library: LibraryItem[];
  busy: boolean;
  onClose: () => void;
  onFile: (file: File) => void;
  onPick: (item: LibraryItem) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);

  // Only what fits this panel. Handing a portrait picture to a landscape screen
  // is the easiest mistake available here, and not offering it is simpler than
  // explaining it afterwards.
  const usable = library.filter((i) => i.type !== "WEBPAGE" && i.orientation === display.orientation);

  return (
    <div className="brand-card -mt-4 mb-2 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">
          Change what&apos;s on <span className="text-gold">{display.name}</span>
        </p>
        <button type="button" onClick={onClose} className="text-xs text-muted hover:text-foreground">
          Cancel
        </button>
      </div>

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
        onClick={() => !busy && inputRef.current?.click()}
        className={`mt-3 cursor-pointer rounded border border-dashed px-4 py-8 text-center text-xs transition-colors ${
          dragging ? "border-gold bg-gold/10 text-foreground" : "border-black/15 text-muted hover:bg-black/[0.03]"
        } ${busy ? "pointer-events-none opacity-50" : ""}`}
      >
        <p className="text-sm font-medium text-foreground">Drop a picture or video here</p>
        <p className="mt-0.5">or click to choose one — it goes up right away</p>
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
          <p className="mt-4 text-[11px] tracking-wide text-muted uppercase">
            Or reuse something ({display.orientation === "LANDSCAPE" ? "landscape" : "portrait"})
          </p>
          <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto pb-1">
            {usable.slice(0, 40).map((item) => (
              <button
                key={item.id}
                type="button"
                title={item.title}
                disabled={busy}
                onClick={() => onPick(item)}
                className="group shrink-0 overflow-hidden rounded border border-black/10 transition hover:border-gold disabled:opacity-50"
              >
                <span
                  className={`block bg-surface-2 ${
                    display.orientation === "LANDSCAPE" ? "h-14 w-24" : "h-20 w-12"
                  }`}
                >
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
  );
}
