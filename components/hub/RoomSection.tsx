import { DisplayCarousel } from "@/components/hub/DisplayCarousel";
import type { HubRoomStatus } from "@/lib/hub/types";

// The synchronized video-wall carousel is disabled for now (see the
// CAROUSEL_ENABLED kill switch in app/api/displays/[slug]/content/route.ts).
// The activate button is hidden until it's re-enabled — re-add `titleAction`
// with <ActivateCarouselButton roomId={room.id} initialActive={room.carouselActive} />.
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
      />
    </section>
  );
}
