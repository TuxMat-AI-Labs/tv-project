// Minimal service worker — exists only so the hub is installable as a PWA
// (Chrome/Android require an active SW with a fetch handler for the install
// prompt). It intentionally does NOT cache anything dynamic: this app is a
// live display-status dashboard, and serving a stale /api/* response or a
// stale hub page would be actively misleading (e.g. showing a display as
// online when it isn't, or an old rotation state). The only thing cached is
// a handful of static, content-hashed icon assets, purely so the installed
// app has something to draw immediately before the network responds — every
// navigation and every /api/* call always goes to the network.
const CACHE_NAME = "tuxdisplay-shell-v1";
const SHELL_ASSETS = [
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-192.png",
  "/icons/icon-maskable-512.png",
];

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
  const isShellAsset = event.request.method === "GET" && SHELL_ASSETS.includes(url.pathname);
  if (!isShellAsset) return; // let every other request (pages, /api/*, everything) hit the network untouched

  event.respondWith(
    caches.match(event.request).then((cached) => cached ?? fetch(event.request))
  );
});
