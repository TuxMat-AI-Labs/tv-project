"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { TVFrame } from "@/components/hub/TVFrame";
import { LavaLamp } from "@/components/screensaver/LavaLamp";
import { PencilIcon, SwapIcon, HealthIcon, AdjustIcon } from "@/components/hub/icons";
import { Wordmark } from "@/components/brand/Wordmark";

type ContentItemLite = { id: string; title: string; type: "IMAGE" | "VIDEO"; thumbnailUrl: string | null };
type RoomLite = { id: string; name: string; slug: string };
type DisplayDetail = {
  id: string;
  slug: string;
  name: string;
  number: number;
  roomId: string;
  room: RoomLite;
  active: boolean;
  screensaverOverride: boolean | null;
  contentFit: "COVER" | "CONTAIN" | "FILL";
  assignments: { id: string; contentItem: ContentItemLite }[];
  mode: "playlist" | "screensaver" | "inactive";
  online: boolean;
  lastSeenAt: string | null;
};

type PanelKey = "edit" | "change" | "health" | "adjust" | null;

export function DisplayDetailView({
  displayId,
  isModal,
  onClose,
}: {
  displayId: string;
  isModal: boolean;
  onClose: () => void;
}) {
  const [display, setDisplay] = useState<DisplayDetail | null>(null);
  const [panel, setPanel] = useState<PanelKey>(null);

  const refresh = () =>
    fetch(`/api/admin/displays/${displayId}`)
      .then((r) => r.json())
      .then(setDisplay);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayId]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={isModal ? "fixed inset-0 z-50 overflow-hidden" : "fixed inset-0"}
      style={{ backgroundColor: "#0a0a0b" }}
    >
      {/* Soft ambient glow so the mounted TV reads as sitting in a dark room. */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(60% 55% at 50% 44%, rgba(46,51,57,0.4) 0%, rgba(0,0,0,0) 70%)" }}
      />

      <button onClick={onClose} className="fixed top-6 left-6 z-30 opacity-90 transition hover:opacity-100" title="Back to hub">
        <Wordmark size="sm" tone="light" />
      </button>

      {display && (
        <div className="fixed top-7 left-1/2 z-30 -translate-x-1/2 text-center">
          <p className="text-sm font-semibold tracking-wide text-white/90 uppercase">
            {display.room.name} <span className="text-gold-light">{display.number}</span>
          </p>
        </div>
      )}

      {/* The clicked tile morphs into this centered TV via the shared layoutId. */}
      <div className="absolute inset-0 flex items-center justify-center px-4">
        <motion.div
          layoutId={`display-frame-${displayId}`}
          className="relative"
          style={{ height: "86vh", maxWidth: "94vw", aspectRatio: "824 / 1412" }}
        >
          <TVFrame>{display && <LivePreview display={display} />}</TVFrame>
        </motion.div>
      </div>

      {display && (
        <>
          <ActionCluster panel={panel} setPanel={setPanel} />
          {panel === "edit" && <EditPanel display={display} onSaved={refresh} onClose={() => setPanel(null)} />}
          {panel === "change" && <ChangePanel display={display} onSaved={refresh} onClose={() => setPanel(null)} />}
          {panel === "health" && <HealthPanel display={display} onSaved={refresh} onClose={() => setPanel(null)} />}
          {panel === "adjust" && <AdjustPanel display={display} onSaved={refresh} onClose={() => setPanel(null)} />}
        </>
      )}
    </motion.div>
  );
}

/**
 * The content shown inside the framed TV. This is a *management* preview, so it
 * shows the display's ASSIGNED content directly — it deliberately ignores the
 * time-of-day screensaver schedule (that only governs the live TV), so picking a
 * wallpaper always shows it here, even after business hours. A forced-on
 * screensaver override still previews as the screensaver. Updates instantly when
 * `display` refreshes after a change (no polling, no remount flicker).
 */
function LivePreview({ display }: { display: DisplayDetail }) {
  if (display.screensaverOverride === true) {
    return <LavaLamp colors={["#e5c770", "#5ed6d6", "#aa8dec", "#f0a6c8"]} blur={30} />;
  }

  const item = display.assignments[0]?.contentItem;
  if (!item?.thumbnailUrl) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/tuxmat-monogram.png" alt="TuxMat" className="w-1/4 opacity-30" />
        <p className="text-[0.6rem] tracking-[0.3em] text-zinc-600 uppercase">No content assigned</p>
      </div>
    );
  }

  const fit =
    display.contentFit === "CONTAIN" ? "object-contain" : display.contentFit === "FILL" ? "object-fill" : "object-cover";
  return (
    <div className="absolute inset-0 bg-black">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={item.thumbnailUrl} alt={item.title} className={`h-full w-full ${fit}`} />
    </div>
  );
}

function ActionCluster({ panel, setPanel }: { panel: PanelKey; setPanel: (p: PanelKey) => void }) {
  const items: { key: PanelKey; label: string; icon: React.ReactNode }[] = [
    { key: "edit", label: "Edit", icon: <PencilIcon /> },
    { key: "change", label: "Change", icon: <SwapIcon /> },
    { key: "health", label: "Pixel Health", icon: <HealthIcon /> },
    { key: "adjust", label: "Adjust", icon: <AdjustIcon /> },
  ];
  return (
    <div className="fixed right-5 bottom-5 z-20 flex flex-col gap-2">
      {items.map((item) => (
        <button
          key={item.key}
          title={item.label}
          onClick={() => setPanel(panel === item.key ? null : item.key)}
          className={`glass-btn glass-btn--dark rounded-full p-3 ${panel === item.key ? "is-active" : ""}`}
        >
          {item.icon}
        </button>
      ))}
    </div>
  );
}

function PanelShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed right-5 bottom-24 z-20 w-80 rounded-xl border border-zinc-700 bg-zinc-900/95 p-4 shadow-2xl backdrop-blur">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <button onClick={onClose} className="text-zinc-500 hover:text-white">
          ✕
        </button>
      </div>
      {children}
    </div>
  );
}

function EditPanel({
  display,
  onSaved,
  onClose,
}: {
  display: DisplayDetail;
  onSaved: () => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(display.name);
  const [number, setNumber] = useState(display.number);
  const [active, setActive] = useState(display.active);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await fetch(`/api/admin/displays/${display.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, number, active }),
    });
    setSaving(false);
    onSaved();
  }

  async function regenerateSlug() {
    if (!confirm("Regenerate this display's URL? The TV will need to be re-pointed at the new address.")) return;
    await fetch(`/api/admin/displays/${display.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ regenerateSlug: true }),
    });
    onSaved();
  }

  return (
    <PanelShell title="Edit" onClose={onClose}>
      <div className="space-y-3 text-sm">
        <label className="block">
          <span className="text-zinc-400">Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-white"
          />
        </label>
        <label className="block">
          <span className="text-zinc-400">Number</span>
          <input
            type="number"
            value={number}
            onChange={(e) => setNumber(Number(e.target.value))}
            className="mt-1 w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-white"
          />
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          <span className="text-zinc-400">Active</span>
        </label>
        <button
          onClick={save}
          disabled={saving}
          className="glass-btn glass-btn--gold w-full rounded-md py-1.5 font-medium"
        >
          Save
        </button>
        <button onClick={regenerateSlug} className="w-full text-left text-xs text-zinc-500 hover:text-zinc-300">
          Regenerate URL…
        </button>
      </div>
    </PanelShell>
  );
}

function ChangePanel({
  display,
  onSaved,
  onClose,
}: {
  display: DisplayDetail;
  onSaved: () => void;
  onClose: () => void;
}) {
  const [items, setItems] = useState<ContentItemLite[]>([]);
  const currentId = display.assignments[0]?.contentItem.id;

  useEffect(() => {
    fetch("/api/admin/content-items")
      .then((r) => r.json())
      .then((data) => setItems(data.items ?? []));
  }, []);

  async function choose(contentItemId: string) {
    await fetch(`/api/admin/displays/${display.id}/assignments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentItemId }),
    });
    onSaved();
    onClose();
  }

  return (
    <PanelShell title="Change content" onClose={onClose}>
      <div className="max-h-72 space-y-2 overflow-y-auto text-sm">
        {items.length === 0 && <p className="text-zinc-500">No content in the library yet.</p>}
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => choose(item.id)}
            className={`flex w-full items-center gap-2 rounded p-1.5 text-left hover:bg-zinc-800 ${
              item.id === currentId ? "ring-1 ring-gold/60" : ""
            }`}
          >
            <div className="h-10 w-7 flex-shrink-0 overflow-hidden rounded bg-zinc-800">
              {item.thumbnailUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.thumbnailUrl} alt="" className="h-full w-full object-cover" />
              )}
            </div>
            <span className="truncate text-zinc-200">{item.title}</span>
          </button>
        ))}
      </div>
    </PanelShell>
  );
}

function HealthPanel({
  display,
  onSaved,
  onClose,
}: {
  display: DisplayDetail;
  onSaved: () => void;
  onClose: () => void;
}) {
  async function setOverride(value: boolean | null) {
    await fetch(`/api/admin/displays/${display.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ screensaverOverride: value }),
    });
    onSaved();
  }

  const current = display.screensaverOverride;

  return (
    <PanelShell title="Pixel health" onClose={onClose}>
      <div className="space-y-3 text-sm">
        <div className="flex items-center justify-between text-zinc-300">
          <span>Status</span>
          <span className={display.online ? "text-emerald-400" : "text-zinc-500"}>
            {display.online ? "Online" : "Offline"}
          </span>
        </div>
        <div className="flex items-center justify-between text-zinc-300">
          <span>Last seen</span>
          <span className="text-zinc-500">
            {display.lastSeenAt ? new Date(display.lastSeenAt).toLocaleTimeString() : "never"}
          </span>
        </div>
        <div className="flex items-center justify-between text-zinc-300">
          <span>Currently</span>
          <span className="text-zinc-500 capitalize">{display.mode}</span>
        </div>
        <div className="border-t border-zinc-800 pt-3">
          <p className="mb-2 text-zinc-400">Screensaver override</p>
          {[
            { value: null, label: "Auto (schedule)" },
            { value: true, label: "Force on" },
            { value: false, label: "Force off" },
          ].map((opt) => (
            <button
              key={String(opt.value)}
              onClick={() => setOverride(opt.value)}
              className={`mb-1 block w-full rounded px-2 py-1 text-left ${
                current === opt.value ? "bg-gold text-black" : "text-zinc-300 hover:bg-zinc-800"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </PanelShell>
  );
}

function AdjustPanel({
  display,
  onSaved,
  onClose,
}: {
  display: DisplayDetail;
  onSaved: () => void;
  onClose: () => void;
}) {
  async function setFit(fit: "COVER" | "CONTAIN" | "FILL") {
    await fetch(`/api/admin/displays/${display.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentFit: fit }),
    });
    onSaved();
  }

  return (
    <PanelShell title="Adjust framing" onClose={onClose}>
      <div className="space-y-1 text-sm">
        {(["COVER", "CONTAIN", "FILL"] as const).map((fit) => (
          <button
            key={fit}
            onClick={() => setFit(fit)}
            className={`block w-full rounded px-2 py-1 text-left capitalize ${
              display.contentFit === fit ? "bg-gold text-black" : "text-zinc-300 hover:bg-zinc-800"
            }`}
          >
            {fit.toLowerCase()}
          </button>
        ))}
      </div>
    </PanelShell>
  );
}
