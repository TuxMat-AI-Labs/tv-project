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
  /**
   * What the TV last reported about how it is rendering itself, and the faults
   * that follow from it — see lib/display/viewportHealth.
   *
   * Separate from `online` on purpose: a zoomed screen or one that has dropped
   * out of kiosk mode is still online, still on the right content, and still
   * wrong on the wall. Online was the only health the hub had, and it is exactly
   * the health that stays green while this goes bad.
   *
   * Null when the TV has not reported yet — an old bundle, or a screen that has
   * not beaten since it was deployed.
   */
  viewport: {
    width: number | null;
    height: number | null;
    screenWidth: number | null;
    screenHeight: number | null;
    pixelRatio: number | null;
  } | null;
  /**
   * `detail` is the full sentence for someone deciding whether to walk over.
   * `short` is the terse form, used where the hub overlays the fault on a small
   * display preview and a sentence would not fit — same line the panel shows.
   */
  viewportFaults: { kind: string; short: string; detail: string }[];
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
