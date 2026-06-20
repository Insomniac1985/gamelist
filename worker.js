import * as auth from "./functions/api/auth.js";
import * as achievements from "./functions/api/achievements.js";
import * as calendar from "./functions/api/calendar.js";
import * as prices from "./functions/api/prices.js";
import * as search from "./functions/api/search.js";
import * as sync from "./functions/api/sync.js";
import * as steamAchievements from "./functions/api/steam-achievements.js";
import * as trophies from "./functions/api/trophies.js";

const routes = {
  "/api/achievements": achievements,
  "/api/auth": auth,
  "/api/calendar": calendar,
  "/api/prices": prices,
  "/api/search": search,
  "/api/steam-achievements": steamAchievements,
  "/api/sync": sync,
  "/api/trophies": trophies,
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
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
