"use client";

import { useHubStatus } from "@/lib/hub/useHubStatus";
import { RoomSection } from "@/components/hub/RoomSection";
import { StatusSummary } from "@/components/hub/StatusSummary";
import { EmptyState } from "@/components/hub/EmptyState";

export default function HubDashboardPage() {
  const status = useHubStatus();

  if (!status) return <p className="text-sm text-muted">Loading displays…</p>;

  const hasDisplays = status.rooms.some((r) => r.displays.length > 0);

  return (
    <div>
      <StatusSummary status={status} />
      {hasDisplays ? (
        status.rooms
          .filter((r) => r.displays.length > 0)
          .map((room) => <RoomSection key={room.id} room={room} />)
      ) : (
        <EmptyState
          title="No displays yet"
          body="Add a room and its displays to start the wall. Each display gets its own URL to point a TV browser at."
          cta={{ label: "Set up displays", href: "/hub/customize/rooms" }}
        />
      )}
    </div>
  );
}
