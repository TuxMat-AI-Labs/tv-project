"use client";

import { useEffect, useState } from "react";
import { CustomizeSubNav } from "@/components/hub/CustomizeSubNav";

type ContentItemLite = {
  id: string;
  title: string;
  type: "IMAGE" | "VIDEO";
  thumbnailUrl: string | null;
  orientation: "PORTRAIT" | "LANDSCAPE";
};
type DisplayLite = {
  id: string;
  name: string;
  number: number;
  orientation: "PORTRAIT" | "LANDSCAPE";
  room: { name: string };
};
type Assignment = {
  id: string;
  sortOrder: number;
  startsAt: string | null;
  endsAt: string | null;
  daypartStart: string | null;
  daypartEnd: string | null;
  contentItem: ContentItemLite;
  display: DisplayLite;
};

function formatDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

export default function AssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [displays, setDisplays] = useState<DisplayLite[]>([]);
  const [items, setItems] = useState<ContentItemLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [displayId, setDisplayId] = useState("");
  const [contentItemId, setContentItemId] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [daypartStart, setDaypartStart] = useState("");
  const [daypartEnd, setDaypartEnd] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  function refresh() {
    return Promise.all([
      fetch("/api/admin/assignments").then((r) => r.json()),
      fetch("/api/admin/displays").then((r) => r.json()),
      fetch("/api/admin/content-items").then((r) => r.json()),
    ])
      .then(([assignmentsData, displaysData, itemsData]) => {
        setAssignments(assignmentsData.assignments ?? []);
        const displayList: DisplayLite[] = displaysData.displays ?? [];
        const itemList: ContentItemLite[] = itemsData.items ?? [];
        setDisplays(displayList);
        setItems(itemList);
        setError(null);
        setDisplayId((cur) => cur || displayList[0]?.id || "");
        setContentItemId((cur) => cur || itemList[0]?.id || "");
      })
      .catch(() => setError("Failed to load assignments."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    refresh();
  }, []);

  async function createAssignment() {
    if (!displayId || !contentItemId) return;
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/admin/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayId,
          contentItemId,
          sortOrder,
          startsAt: startsAt ? new Date(startsAt).toISOString() : null,
          endsAt: endsAt ? new Date(endsAt).toISOString() : null,
          daypartStart: daypartStart || null,
          daypartEnd: daypartEnd || null,
        }),
      });
      if (!res.ok) throw new Error();
      setSortOrder(0);
      setStartsAt("");
      setEndsAt("");
      setDaypartStart("");
      setDaypartEnd("");
      await refresh();
    } catch {
      setCreateError("Failed to create assignment.");
    } finally {
      setCreating(false);
    }
  }

  async function deleteAssignment(id: string) {
    if (!confirm("Remove this assignment?")) return;
    try {
      const res = await fetch(`/api/admin/assignments/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      await refresh();
    } catch {
      setError("Failed to delete assignment.");
    }
  }

  return (
    <div className="reveal">
      <h1 className="text-2xl font-semibold text-foreground">Customize</h1>
      <CustomizeSubNav active="assignments" />

      <div className="mt-6 brand-card p-4">
        <h2 className="mb-3 text-sm font-semibold text-foreground">New assignment</h2>
        <div className="flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="text-xs text-muted">Display</span>
            <select
              value={displayId}
              onChange={(e) => setDisplayId(e.target.value)}
              className="mt-1 block rounded border border-black/10 bg-white px-2 py-1.5 text-sm text-foreground"
            >
              {displays.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.room.name} · {d.name} ({d.orientation === "LANDSCAPE" ? "Landscape" : "Portrait"})
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs text-muted">Content</span>
            <select
              value={contentItemId}
              onChange={(e) => setContentItemId(e.target.value)}
              className="mt-1 block rounded border border-black/10 bg-white px-2 py-1.5 text-sm text-foreground"
            >
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title} ({item.orientation === "LANDSCAPE" ? "Landscape" : "Portrait"})
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs text-muted">Sort order</span>
            <input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(Number(e.target.value))}
              className="mt-1 block w-20 rounded border border-black/10 bg-white px-2 py-1.5 text-sm text-foreground"
            />
          </label>
          <label className="block">
            <span className="text-xs text-muted">Starts at</span>
            <input
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              className="mt-1 block rounded border border-black/10 bg-white px-2 py-1.5 text-sm text-foreground"
            />
          </label>
          <label className="block">
            <span className="text-xs text-muted">Ends at</span>
            <input
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              className="mt-1 block rounded border border-black/10 bg-white px-2 py-1.5 text-sm text-foreground"
            />
          </label>
          <label className="block">
            <span className="text-xs text-muted">Daypart start</span>
            <input
              type="time"
              value={daypartStart}
              onChange={(e) => setDaypartStart(e.target.value)}
              className="mt-1 block rounded border border-black/10 bg-white px-2 py-1.5 text-sm text-foreground"
            />
          </label>
          <label className="block">
            <span className="text-xs text-muted">Daypart end</span>
            <input
              type="time"
              value={daypartEnd}
              onChange={(e) => setDaypartEnd(e.target.value)}
              className="mt-1 block rounded border border-black/10 bg-white px-2 py-1.5 text-sm text-foreground"
            />
          </label>
          <button
            onClick={createAssignment}
            disabled={creating || !displayId || !contentItemId}
            className="glass-btn glass-btn--gold rounded px-4 py-1.5 text-sm font-medium"
          >
            {creating ? "Creating…" : "Create assignment"}
          </button>
        </div>
        {createError && <p className="mt-2 text-xs text-red-600">{createError}</p>}
        {(displays.length === 0 || items.length === 0) && !loading && (
          <p className="mt-2 text-xs text-muted">
            You need at least one display and one content item before creating an assignment.
          </p>
        )}
      </div>

      {loading && <p className="mt-6 text-sm text-muted">Loading…</p>}
      {!loading && assignments.length === 0 && <p className="mt-6 text-sm text-muted">No assignments yet.</p>}

      {/* Mobile: one card per assignment, big tap target for Delete. Table (below) takes over at sm+. */}
      {!loading && assignments.length > 0 && (
        <div className="mt-6 space-y-3 sm:hidden">
          {assignments.map((a) => (
            <div key={a.id} className="brand-card flex items-start gap-3 p-4">
              <div className="h-12 w-9 flex-shrink-0 overflow-hidden rounded bg-surface-2">
                {a.contentItem.thumbnailUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.contentItem.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-foreground">{a.contentItem.title}</p>
                <p className="mt-0.5 truncate text-xs text-muted">
                  {a.display.room.name} &middot; {a.display.name} &middot; order {a.sortOrder}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {a.startsAt || a.endsAt ? (
                    <>
                      {formatDate(a.startsAt) ?? "…"} &rarr; {formatDate(a.endsAt) ?? "…"}
                    </>
                  ) : (
                    "Always"
                  )}
                  {" · "}
                  {a.daypartStart || a.daypartEnd ? (
                    <>
                      {a.daypartStart ?? "00:00"}&ndash;{a.daypartEnd ?? "23:59"}
                    </>
                  ) : (
                    "All day"
                  )}
                </p>
              </div>
              <button
                onClick={() => deleteAssignment(a.id)}
                className="shrink-0 rounded px-3 py-2 text-xs font-medium text-red-600"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 hidden overflow-x-auto brand-card sm:block">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b brand-hairline text-xs text-muted">
              <th className="px-4 py-3 font-medium">Display</th>
              <th className="px-4 py-3 font-medium">Content</th>
              <th className="px-4 py-3 font-medium">Order</th>
              <th className="px-4 py-3 font-medium">Date range</th>
              <th className="px-4 py-3 font-medium">Daypart</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td className="px-4 py-4 text-muted" colSpan={6}>
                  Loading…
                </td>
              </tr>
            )}
            {!loading && assignments.length === 0 && (
              <tr>
                <td className="px-4 py-4 text-muted" colSpan={6}>
                  No assignments yet.
                </td>
              </tr>
            )}
            {assignments.map((a) => (
              <tr key={a.id} className="border-b brand-hairline last:border-b-0">
                <td className="px-4 py-3 text-foreground">
                  {a.display.room.name} · {a.display.name}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-6 flex-shrink-0 overflow-hidden rounded bg-surface-2">
                      {a.contentItem.thumbnailUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={a.contentItem.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                      )}
                    </div>
                    <span className="text-foreground">{a.contentItem.title}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted">{a.sortOrder}</td>
                <td className="px-4 py-3 text-muted">
                  {a.startsAt || a.endsAt ? (
                    <span>
                      {formatDate(a.startsAt) ?? "…"} &rarr; {formatDate(a.endsAt) ?? "…"}
                    </span>
                  ) : (
                    <span className="text-muted">Always</span>
                  )}
                </td>
                <td className="px-4 py-3 text-muted">
                  {a.daypartStart || a.daypartEnd ? (
                    <span>
                      {a.daypartStart ?? "00:00"} &ndash; {a.daypartEnd ?? "23:59"}
                    </span>
                  ) : (
                    <span className="text-muted">All day</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => deleteAssignment(a.id)} className="text-red-600 hover:text-red-700">
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
