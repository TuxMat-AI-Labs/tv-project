// Serves two unrelated jobs from one file (both need to live at the
// origin root to control "/"):
//
// 1. Hub PWA installability — Chrome/Android require an active SW with a
//    fetch handler for the install prompt. This app is a live
//    display-status dashboard, so hub navigations and every /api/* call
//    always go straight to the network — serving a stale response there
//    would be actively misleading (e.g. showing a display as online when
//    it isn't). Only a handful of static, content-hashed icon assets are
//    cached, purely so the installed app has something to draw immediately.
//
// 2. TV self-healing — an always-on TV that loses the network mid-navigation
//    (a Render restart, a DNS blip, a weekend outage) gets stuck on the
//    browser's own native "Server not found" page forever, because no page
//    JS ever loaded to retry. Nobody's there to press refresh. For /display
//    and /tv navigations only, fall back to a cached, self-retrying offline
//    screen (tv-offline.html) instead of the browser's dead-end error page —
//    it keeps reloading on a loop until the real page comes back.
// Bump this on any change to what is cached. `activate` deletes every cache
// whose name doesn't match, so bumping is what actually evicts the old shell
// from an already-installed PWA.
const CACHE_NAME = "tuxdisplay-shell-v3";
const OFFLINE_URL = "/tv-offline.html";
const SHELL_ASSETS = [
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-192.png",
  "/icons/icon-maskable-512.png",
  OFFLINE_URL,
];

function isTvRoute(pathname) {
  return pathname === "/tv" || pathname.startsWith("/tv/") || pathname.startsWith("/display/");
}

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (event.request.mode === "navigate" && isTvRoute(url.pathname)) {
    // Network-first, always — never mask a real response. Only a hard
    // network failure (server unreachable) falls through to the offline
    // screen; an HTTP error status still resolves normally and is left alone.
    event.respondWith(fetch(event.request).catch(() => caches.match(OFFLINE_URL)));
    return;
  }

  const isShellAsset = event.request.method === "GET" && SHELL_ASSETS.includes(url.pathname);
  if (!isShellAsset) return; // let every other request (pages, /api/*, everything) hit the network untouched

  event.respondWith(
    caches.match(event.request).then((cached) => cached ?? fetch(event.request))
  );
});
