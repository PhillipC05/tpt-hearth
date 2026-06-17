const CACHE_NAME = "tpt-hearth-shell-v2";
const APP_SHELL = [
  "/",
  "/manifest.webmanifest",
  "/icon.svg",
  "/icon-192.png",
  "/icon-512.png",
  "/offline"
];

/** Safe navigation routes that can be cached for offline browsing */
const NAVIGATION_CACHE_ROUTES = [
  "/",
  "/rituals",
  "/letters",
  "/grove",
  "/embers",
  "/chronicles",
  "/porch"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin GET requests
  if (request.method !== "GET" || url.origin !== self.location.origin) {
    return;
  }

  // Never cache API routes, WebSocket, or Next.js internal data routes
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/_next/webpack-hmr") ||
    url.pathname.startsWith("/__nextjs") ||
    url.pathname.match(/^\/_next\/static\/chunks\/.*hot-updater/)
  ) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        // Return cached, then update in background for app shell & static assets
        if (
          url.pathname.startsWith("/_next/static/") ||
          url.pathname === "/manifest.webmanifest" ||
          url.pathname === "/icon.svg" ||
          url.pathname === "/icon-192.png" ||
          url.pathname === "/icon-512.png"
        ) {
          fetchAndUpdateCache(request);
        }
        return cached;
      }

      return fetch(request)
        .then((response) => {
          if (!response || response.status !== 200) {
            return response;
          }

          const clone = response.clone();

          // Cache static Next.js assets and manifest/icons
          if (
            url.pathname.startsWith("/_next/static/") ||
            url.pathname === "/manifest.webmanifest" ||
            url.pathname === "/icon.svg" ||
            url.pathname === "/icon-192.png" ||
            url.pathname === "/icon-512.png"
          ) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, clone);
            });
          }

          // Cache navigation responses for previously visited safe routes
          if (request.mode === "navigate") {
            const path = url.pathname;
            const isSafeRoute = NAVIGATION_CACHE_ROUTES.some(
              (route) => path === route || path.startsWith(route + "/")
            );
            if (isSafeRoute) {
              caches.open(CACHE_NAME).then((cache) => {
                // Only cache the HTML, not the full response (avoid caching API data embedded in pages)
                cache.put(request, clone);
              });
            }
          }

          return response;
        })
        .catch(() => {
          // Offline fallback
          if (request.mode === "navigate") {
            return caches.match("/");
          }
          // For other resources, return a lightweight empty response
          return new Response("", { status: 204 });
        });
    })
  );
});

/** Fetch a resource and update the cache if successful, without blocking the response */
function fetchAndUpdateCache(request) {
  caches.open(CACHE_NAME).then((cache) => {
    fetch(request).then((response) => {
      if (response && response.status === 200) {
        cache.put(request, response);
      }
    }).catch(() => {});
  });
}