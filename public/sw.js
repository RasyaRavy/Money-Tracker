// Minimal online-only service worker to enable PWA installation without offline caching.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // Pass through directly to network as specified by online-only PWA requirement.
});
