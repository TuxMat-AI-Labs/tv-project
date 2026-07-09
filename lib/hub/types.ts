export type HubDisplayStatus = {
  id: string;
  slug: string;
  name: string;
  number: number;
  active: boolean;
  mode: "playlist" | "screensaver" | "inactive";
  currentContent: { id: string; type: "IMAGE" | "VIDEO"; thumbnailUrl: string | null; title: string } | null;
  online: boolean;
  lastSeenAt: string | null;
};

export type HubRoomStatus = {
  id: string;
  name: string;
  slug: string;
  carouselActive: boolean;
  displays: HubDisplayStatus[];
};

export type HubStatusResponse = {
  rooms: HubRoomStatus[];
};
