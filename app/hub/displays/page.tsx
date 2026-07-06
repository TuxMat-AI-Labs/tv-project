"use client";

import { useHubStatus } from "@/lib/hub/useHubStatus";
import { DisplayCarousel } from "@/components/hub/DisplayCarousel";

export default function AllDisplaysPage() {
  const status = useHubStatus();
  if (!status) return <p className="text-sm text-muted">Loading displays…</p>;

  const all = status.rooms.flatMap((r) => r.displays);

  return (
    <div className="reveal">
      <h1 className="text-2xl font-semibold tracking-wide text-foreground uppercase">All Displays</h1>
      <p className="mt-1 text-sm text-muted">
        {all.length} display{all.length === 1 ? "" : "s"} across {status.rooms.length} room
        {status.rooms.length === 1 ? "" : "s"}
      </p>
      <div className="mt-8">
        <DisplayCarousel displays={all} tileSize="large" emptyText="No displays yet." />
      </div>
    </div>
  );
}
