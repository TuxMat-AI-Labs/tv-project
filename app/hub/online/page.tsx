"use client";

import { useHubStatus } from "@/lib/hub/useHubStatus";
import { DisplayCarousel } from "@/components/hub/DisplayCarousel";

export default function OnlineDisplaysPage() {
  const status = useHubStatus();
  if (!status) return <p className="text-sm text-muted">Loading displays…</p>;

  const onlineDisplays = status.rooms.flatMap((r) => r.displays).filter((d) => d.online);

  return (
    <div className="reveal">
      <h1 className="text-2xl font-semibold tracking-wide text-foreground uppercase">Online</h1>
      <p className="mt-1 text-sm text-muted">
        {onlineDisplays.length} display{onlineDisplays.length === 1 ? "" : "s"} live right now
      </p>
      <div className="mt-8">
        <DisplayCarousel displays={onlineDisplays} tileSize="large" emptyText="No displays are online right now." />
      </div>
    </div>
  );
}
