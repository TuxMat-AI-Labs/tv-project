import { DisplayCarousel } from "@/components/hub/DisplayCarousel";
import { RoomCarouselControls } from "@/components/hub/RoomCarouselControls";
import type { HubRoomStatus } from "@/lib/hub/types";

// Each room heading carries a Slide/Fade transition choice + an ON/OFF switch
// that starts/stops the room's rotation (LANDSCAPE and PORTRAIT displays each
// rotate within their own same-orientation pool — see
// lib/display/landscapeCarousel.ts). The transition also governs any
// display's own multi-item playlist here, rotation on or off.
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
        titleAction={
          <RoomCarouselControls
            roomId={room.id}
            transition={room.carouselTransition}
            active={room.carouselActive}
          />
        }
      />
    </section>
  );
}
