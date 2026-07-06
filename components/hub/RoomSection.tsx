import { DisplayTile } from "@/components/hub/DisplayTile";
import type { HubRoomStatus } from "@/lib/hub/types";

export function RoomSection({ room, tileSize = "default" }: { room: HubRoomStatus; tileSize?: "default" | "large" }) {
  const onlineCount = room.displays.filter((d) => d.online).length;

  return (
    <section className="border-t brand-hairline py-8 first:border-t-0 first:pt-0">
      <div className="mb-5 flex items-baseline justify-between">
        <h2 className="text-lg font-semibold tracking-wide text-foreground">
          {room.name}
        </h2>
        <span className="text-xs tracking-wide text-muted uppercase">
          {onlineCount}/{room.displays.length} online
        </span>
      </div>
      <div
        className={`grid gap-6 ${
          tileSize === "large"
            ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"
            : "grid-cols-2 sm:grid-cols-4 lg:grid-cols-6"
        }`}
      >
        {room.displays.map((display) => (
          <DisplayTile key={display.id} display={display} roomName={room.name} />
        ))}
        {room.displays.length === 0 && (
          <p className="col-span-full text-sm text-muted">No displays in this room yet.</p>
        )}
      </div>
    </section>
  );
}
