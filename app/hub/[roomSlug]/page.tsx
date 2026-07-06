"use client";

import { use } from "react";
import { useHubStatus } from "@/lib/hub/useHubStatus";
import { RoomSection } from "@/components/hub/RoomSection";

export default function RoomPage({ params }: { params: Promise<{ roomSlug: string }> }) {
  const { roomSlug } = use(params);
  const status = useHubStatus();

  if (!status) return <p className="text-sm text-muted">Loading displays…</p>;

  const room = status.rooms.find((r) => r.slug === roomSlug);
  if (!room) return <p className="text-sm text-muted">Room not found.</p>;

  return (
    <div className="reveal">
      <RoomSection room={room} tileSize="large" />
    </div>
  );
}
