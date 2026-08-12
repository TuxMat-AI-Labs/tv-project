export type HubDisplayStatus = {
  id: string;
  slug: string;
  name: string;
  number: number;
  active: boolean;
  orientation: "PORTRAIT" | "LANDSCAPE";
  mode: "playlist" | "screensaver" | "inactive" | "carousel" | "black";
  // `fileUrl` is carried so a WEBPAGE tile can render the live page itself —
  // a webpage has no thumbnail, and without this the dashboard could only show
  // the word "Playing" over black (no way to tell the screens apart at a
  // glance). For IMAGE/VIDEO the tile still prefers `thumbnailUrl`.
  currentContent: {
    id: string;
    type: "IMAGE" | "VIDEO" | "WEBPAGE";
    thumbnailUrl: string | null;
    fileUrl: string;
    title: string;
  } | null;
  online: boolean;
  lastSeenAt: string | null;
};

export type HubRoomStatus = {
  id: string;
  name: string;
  slug: string;
  carouselActive: boolean;
  carouselTransition: "SLIDE" | "FADE";
  displays: HubDisplayStatus[];
};

export type HubStatusResponse = {
  rooms: HubRoomStatus[];
  /**
   * The server's deploy id. The hub watches this for a change and reloads, the
   * same way a TV does — an installed PWA is a long-lived app that may sit open
   * for days, and a normal deploy changes the JS chunks without changing sw.js,
   * so the service worker alone would never notice it.
   */
  buildId: string;
};
