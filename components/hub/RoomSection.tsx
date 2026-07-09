import { ActivateCarouselButton } from "@/components/hub/ActivateCarouselButton";
import { DisplayCarousel } from "@/components/hub/DisplayCarousel";
import type { HubRoomStatus } from "@/lib/hub/types";

export function RoomSection({ room, tileSize = "default" }: { room: HubRoomStatus; tileSize?: "default" | "large" }) {
  const allOnline = room.displays.length > 0 && room.displays.every((d) => d.online);

  return (
    <section className="border-t brand-hairline py-8 first:border-t-0 first:pt-0">
      <DisplayCarousel
        title={room.name}
        online={allOnline}
        displays={room.displays}
        tileSize={tileSize}
        emptyText="No displays in this room yet."
        titleAction={<ActivateCarouselButton roomId={room.id} />}
      />
    </section>
  );
}
