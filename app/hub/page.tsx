"use client";

import { useHubStatus } from "@/lib/hub/useHubStatus";
import { RoomSection } from "@/components/hub/RoomSection";
import { StatusSummary } from "@/components/hub/StatusSummary";

export default function HubDashboardPage() {
  const status = useHubStatus();

  if (!status) return <p className="text-sm text-muted">Loading displays…</p>;

  return (
    <div>
      <StatusSummary status={status} />
      {status.rooms.map((room) => (
        <RoomSection key={room.id} room={room} />
      ))}
    </div>
  );
}
