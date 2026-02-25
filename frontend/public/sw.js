// Arvix AI Service Worker — v1
const CACHE_NAME = "arvix-ai-v1";
const STATIC_ASSETS = [
    "/",
    "/manifest.json",
];

// Install: cache static assets
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
    );
    self.skipWaiting();
});

// Activate: remove old caches
self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
        )
    );
    self.clients.claim();
});

// Fetch: network-first strategy (always try network, fall back to cache)
self.addEventListener("fetch", (event) => {
    // Skip API calls entirely — always go to network
    if (event.request.url.includes("/api/")) return;

    event.respondWith(
        fetch(event.request)
            .then((res) => {
                // Cache successful GET responses for static assets
                if (res.ok && event.request.method === "GET") {
                    const clone = res.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                }
                return res;
            })
            .catch(() => caches.match(event.request))
    );
});
