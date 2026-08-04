const CACHE_VERSION = "spv-static-v2";
const OFFLINE_URL = "/offline";
const PRECACHE_URLS = [
  OFFLINE_URL,
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
  "/icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(PRECACHE_URLS))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("spv-") && key !== CACHE_VERSION)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const isStaticAsset =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/images/");

  if (isStaticAsset) {
    event.respondWith(
      caches.open(CACHE_VERSION).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;

        const response = await fetch(request);
        if (response.ok) await cache.put(request, response.clone());
        return response;
      })
    );
    return;
  }

  if (request.mode === "navigate" || request.headers.has("RSC") || url.pathname.startsWith("/dashboard")) {
    event.respondWith(
      fetch(request)
        .then(async (response) => {
          if (response.ok) {
            const cache = await caches.open(CACHE_VERSION);
            // Store RSC without exact search params so we can hit it offline regardless of build id
            const cacheRequest = request.mode === "navigate" 
              ? request 
              : new Request(url.pathname, { headers: request.headers });
            await cache.put(cacheRequest, response.clone());
          }
          return response;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE_VERSION);
          const cacheRequest = request.mode === "navigate" 
            ? request 
            : new Request(url.pathname, { headers: request.headers });
          
          let cached = await cache.match(cacheRequest);
          
          if (!cached && request.mode === "navigate") {
            if (url.pathname === "/login" || url.pathname === "/") {
              return Response.redirect("/dashboard", 302);
            }
            cached = await cache.match(OFFLINE_URL);
          }
          
          if (cached) return cached;
          return new Response("Offline", { status: 503 });
        })
    );
    return;
  }
});
