const CACHE_VERSION = "gamelist-cache-v638";
const STATIC_CACHE = `${CACHE_VERSION}:static`;
const MEDIA_CACHE = `${CACHE_VERSION}:media`;
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/styles.css",
  "/game-editor-layout.css",
  "/game-editor-controls.js",
  "/shared-add-game.js",
  "/collection-workspace.js",
  "/media-format-toggle.js",
  "/collection-workspace.css",
  "/app.js",
  "/batched-list.js",
  "/card-hover-sound.js",
  "/activity-ui.js",
  "/theme-system.js",
  "/i18n.js",
  "/collection-ui.html",
  "/collection-ui.js",
  "/account-settings-ui.js",
  "/assets/backgrounds/backdrop.png",
  "/assets/backgrounds/backdrop_light.png",
  "/assets/branding/Icon.png",
  "/assets/branding/Icon_shelf.png",
  "/assets/branding/app-icons/app-Icon.png",
  "/assets/branding/app-icons/app-Icon-monochrome.png",
  "/assets/branding/app-icons/app-Icon-bw.png",
  "/assets/branding/kh_icon.png",
  "/assets/branding/app-icons/kh_app-icon.png",
  "/assets/branding/app-icons/kh_app-icon-monochrome.png",
  "/assets/fonts/CascadiaCode.woff2",
  "/assets/fonts/Georgia-Bold.ttf",
  "/assets/fonts/pokemon-emerald.ttf",
  "/assets/fonts/04B_30.TTF",
  "/assets/fonts/Michroma.ttf",
  "/assets/fonts/Minecraft.ttf",
  "/assets/fonts/AntiqueOliveNord.woff2",
  "/assets/fonts/Mata Regular.otf",
  "/assets/platforms/playstation.png",
  "/assets/platforms/playstation_retro.png",
  "/assets/platforms/playstation_modern.png",
  "/assets/platforms/psplus.png",
  "/assets/platforms/steam.png",
  "/assets/platforms/switch.png",
  "/assets/platforms/xbox.png",
  "/assets/platforms/gameswithgold.png",
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
  "/assets/flags/it.svg",
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
  "/assets/stores/playasia.ico",
  "/assets/stores/limited-run-games.png",
  "/assets/stores/retroisland.png",
  "/assets/stores/square-enix-store.png",
  "/assets/stores/xtralife.ico",
  "/svg-assets.js",
  "/asset-paths.js",
  "/assets/svg/catalog.svg",
  "/assets/icons/navigation/dropdown-chevron-active.svg",
  "/assets/icons/status/checkbox-check.svg",
  "/assets/icons/navigation/dropdown-chevron-hover.svg",
  "/assets/icons/navigation/dropdown-chevron.svg",
];
const OPTIONAL_STATIC_ASSETS = [];

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

  if (url.origin === location.origin && isLocalScriptOrStyle(url)) {
    event.respondWith(networkFirst(request, STATIC_CACHE));
    return;
  }

  if (shouldCacheMedia(request, url)) {
    event.respondWith(cacheFirst(request, MEDIA_CACHE));
    return;
  }

  if (url.origin === location.origin && shouldCacheStatic(url)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, STATIC_CACHE));
  }
});

function shouldCacheMedia(request, url) {
  if (url.origin === location.origin && (request.destination === "image" || request.destination === "font")) return true;
  if (request.mode !== "no-cors") return false;
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
  return /\.(?:css|js|json|png|ico|svg|webp|woff2?)$/i.test(url.pathname)
    || url.pathname === "/"
    || url.pathname === "/index.html";
}

function isLocalScriptOrStyle(url) {
  return /\.(?:css|js)$/i.test(url.pathname);
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    await safePut(cache, request, response.clone());
    return response;
  } catch {
    return new Response("", { status: 503, statusText: "Offline" });
  }
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
