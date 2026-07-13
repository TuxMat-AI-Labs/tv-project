// Server-safe identity for a room's chosen rotation transition — shared by the
// synchronized room carousel and any single display's own multi-item playlist
// (both draw from the same per-room `Room.carouselTransition`).
export type CarouselTransition = "SLIDE" | "FADE";

export function coerceCarouselTransition(value: string | null | undefined): CarouselTransition {
  return value === "FADE" ? "FADE" : "SLIDE";
}
