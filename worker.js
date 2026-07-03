import * as auth from "./functions/api/auth.js";
import * as achievements from "./functions/api/achievements.js";
import * as calendar from "./functions/api/calendar.js";
import * as collectionPrice from "./functions/api/collection-price.js";
import * as cover from "./functions/api/cover.js";
import * as gamelistMassAdd from "./functions/api/gamelist-mass-add.js";
import * as gamelistMetadata from "./functions/api/gamelist-metadata.js";
import * as prices from "./functions/api/prices.js";
import * as search from "./functions/api/search.js";
import * as shelf from "./functions/api/shelf.js";
import * as shelfCovers from "./functions/api/shelf-covers.js";
import * as shelfMassAdd from "./functions/api/shelf-mass-add.js";
import * as shelfMetadata from "./functions/api/shelf-metadata.js";
import * as shelfPriceAudit from "./functions/api/shelf-price-audit.js";
import * as sync from "./functions/api/sync.js";
import * as steamAchievements from "./functions/api/steam-achievements.js";
import * as trophies from "./functions/api/trophies.js";
import * as xboxAchievements from "./functions/api/xbox-achievements.js";

const routes = {
  "/api/achievements": achievements,
  "/api/auth": auth,
  "/api/calendar": calendar,
  "/api/collection-price": collectionPrice,
  "/api/cover": cover,
  "/api/gamelist-mass-add": gamelistMassAdd,
  "/api/gamelist-metadata": gamelistMetadata,
  "/api/prices": prices,
  "/api/search": search,
  "/api/shelf": shelf,
  "/api/shelf-covers": shelfCovers,
  "/api/shelf-mass-add": shelfMassAdd,
  "/api/shelf-metadata": shelfMetadata,
  "/api/shelf-price-audit": shelfPriceAudit,
  "/api/steam-achievements": steamAchievements,
  "/api/sync": sync,
  "/api/trophies": trophies,
  "/api/xbox-achievements": xboxAchievements,
};

const shelfOnlyPaths = new Set([
  "/shelf",
  "/shelf/",
  "/shelf.html",
  "/shelf.css",
  "/shelf.js",
  "/api/collection-price",
  "/api/cover",
  "/api/shelf",
  "/api/shelf-covers",
  "/api/shelf-mass-add",
  "/api/shelf-metadata",
  "/api/shelf-price-audit",
]);

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (shelfOnlyPaths.has(url.pathname) && env.SHELF_ENABLED !== "true") {
      return new Response("Not found", {
        status: 404,
        headers: { "Cache-Control": "no-store" },
      });
    }
    const module = routes[url.pathname];
    if (module) {
      const method = request.method.toLowerCase();
      const handler = module[`onRequest${method[0].toUpperCase()}${method.slice(1)}`];
      if (!handler) return json({ error: "Method not allowed" }, 405);
      return handler({ request, env, ctx });
    }

    return env.ASSETS.fetch(request);
  },
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
