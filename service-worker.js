const CACHE_VERSION = "gamelist-cache-v176";
const STATIC_CACHE = `${CACHE_VERSION}:static`;
const MEDIA_CACHE = `${CACHE_VERSION}:media`;
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/styles.css",
  "/app.js",
  "/activity-ui.js",
  "/shelf.html",
  "/shelf.css",
  "/shelf.js",
  "/assets/backdrop.png",
  "/assets/Icon.png",
  "/assets/Icon_shelf.png",
  "/assets/app-Icon.png",
  "/assets/kh_icon.png",
  "/assets/kh_app-icon.png",
  "/assets/fonts/CascadiaCode.woff2",
  "/assets/platforms/playstation.png",
  "/assets/platforms/steam.png",
  "/assets/platforms/switch.png",
  "/assets/platforms/xbox.png",
  "/assets/platforms/wii.png",
  "/assets/platforms/wiiu.png",
  "/assets/platforms/n64.png",
  "/assets/platforms/gc.png",
  "/assets/platforms/nes.png",
  "/assets/platforms/snes.png",
  "/assets/platforms/nds.png",
  "/assets/platforms/3ds.png",
  "/assets/platforms/gba.png",
  "/assets/platforms/gbc.png",
  "/assets/platforms/gb.png",
  "/assets/platforms/sega.png",
  "/assets/platforms/dreamcast.png",
  "/assets/platforms/disk.png",
  "/assets/flags/eu.svg",
  "/assets/sites/howlongtobeat.png",
  "/assets/sites/neoseeker.png",
  "/assets/sites/nintendo.png",
  "/assets/sites/playstation.png",
  "/assets/sites/psnprofiles.png",
  "/assets/sites/rpgsite.png",
  "/assets/sites/steam.png",
  "/assets/sites/wikipedia.ico",
  "/assets/stores/amazon.ico",
  "/assets/stores/game.ico",
  "/assets/stores/retroisland.png",
  "/assets/stores/xtralife.ico",
];
const OPTIONAL_STATIC_ASSETS = [
  "/assets/fonts/AntiqueOliveNord.woff2",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => cacheOptionalStaticAssets())
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
  if (url.origin === location.origin && url.pathname === "/version.json") return;

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
    "img.psnprofiles.com",
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

async function cacheOptionalStaticAssets() {
  const cache = await caches.open(STATIC_CACHE);
  await Promise.all(OPTIONAL_STATIC_ASSETS.map(async (asset) => {
    try {
      const response = await fetch(asset);
      await safePut(cache, asset, response);
    } catch {
      // Optional licensed assets may not be present in every checkout.
    }
  }));
}
