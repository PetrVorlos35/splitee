const CACHE = "splitee-v1";
const OFFLINE_FALLBACK = "/";
// horní mez záznamů v cache, aby při jednom nasazení neustále nerostla o každý nový content-hashed asset
const MAX_STATIC_ENTRIES = 60;

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.add(OFFLINE_FALLBACK)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

/** FIFO ořez: cache.keys() vrací záznamy v pořadí vložení, takže nejstarší je vždy na začátku. */
async function trimCache(cache) {
  const keys = await cache.keys();
  const excess = keys.length - MAX_STATIC_ENTRIES;
  for (let i = 0; i < excess; i++) {
    await cache.delete(keys[i]);
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // Convex nikdy necachujeme

  // statické buildy Nextu jsou neměnné -> cache first
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ??
          fetch(request)
            .then((res) => {
              const copy = res.clone();
              caches
                .open(CACHE)
                .then((c) => c.put(request, copy).then(() => trimCache(c)));
              return res;
            })
            .catch(() => Response.error()),
      ),
    );
    return;
  }

  // navigace -> síť, cache jen když je uživatel offline
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(OFFLINE_FALLBACK, copy));
          return res;
        })
        .catch(() => caches.match(OFFLINE_FALLBACK).then((hit) => hit ?? Response.error())),
    );
  }
});
