const CACHE_VERSION = "gamelist-cache-v36";
const STATIC_CACHE = `${CACHE_VERSION}:static`;
const MEDIA_CACHE = `${CACHE_VERSION}:media`;
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/styles.css",
  "/app.js",
  "/assets/Icon.png",
  "/assets/app-Icon.png",
  "/assets/fonts/CascadiaCode.woff2",
  "/assets/platforms/playstation.png",
  "/assets/platforms/steam.png",
  "/assets/platforms/switch.png",
  "/assets/platforms/xbox.png",
  "/assets/stores/amazon.ico",
  "/assets/stores/game.ico",
  "/assets/stores/playasia.ico",
  "/assets/stores/xtralife.ico",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys
        .filter((key) => key.startsWith("gamelist-cache-") && !key.startsWith(CACHE_VERSION))
        .map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin === location.origin && url.pathname.startsWith("/api/")) return;

  if (shouldCacheMedia(request, url)) {
    event.respondWith(cacheFirst(request, MEDIA_CACHE));
    return;
  }

  if (url.origin === location.origin && shouldCacheStatic(url)) {
    event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, STATIC_CACHE));
  }
});

function shouldCacheMedia(request, url) {
  if (url.origin === location.origin && (request.destination === "image" || request.destination === "font")) return true;
  return [
    "howlongtobeat.com",
    "images.igdb.com",
    "cdn.cloudflare.steamstatic.com",
    "www.amazon.es",
    "www.xtralife.com",
    "www.game.es",
  ].some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`));
}

function shouldCacheStatic(url) {
  return /\.(?:css|js|json|png|ico|webp|woff2?)$/i.test(url.pathname)
    || url.pathname === "/"
    || url.pathname === "/index.html";
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  await safePut(cache, request, response.clone());
  return response;
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const fresh = fetch(request)
    .then(async (response) => {
      await safePut(cache, request, response.clone());
      return response;
    })
    .catch(() => cached);
  return cached || fresh;
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    await safePut(cache, request, response.clone());
    return response;
  } catch {
    return (await cache.match(request)) || cache.match("/index.html");
  }
}

async function safePut(cache, request, response) {
  if (!response || (response.status !== 0 && !response.ok)) return;
  try {
    await cache.put(request, response);
  } catch {
    // Some opaque or redirected responses may be refused by Cache Storage.
  }
}
