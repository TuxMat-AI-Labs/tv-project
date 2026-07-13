import { DisplayCarousel } from "@/components/hub/DisplayCarousel";
import { ActivateCarouselButton } from "@/components/hub/ActivateCarouselButton";
import { CarouselTransitionToggle } from "@/components/hub/CarouselTransitionToggle";
import type { HubRoomStatus } from "@/lib/hub/types";

// The activate button starts/stops the room's synchronized landscape
// carousel (only the room's LANDSCAPE-oriented displays participate — see
// app/api/displays/[slug]/content/route.ts). The Slide/Fade toggle sets this
// room's rotation transition, which also governs any display's own
// multi-item playlist here, carousel on or off.
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
          <div className="flex items-center gap-2">
            <CarouselTransitionToggle roomId={room.id} transition={room.carouselTransition} />
            <ActivateCarouselButton roomId={room.id} serverActive={room.carouselActive} />
          </div>
        }
      />
    </section>
  );
}
