import * as auth from "./functions/api/auth.js";
import * as achievements from "./functions/api/achievements.js";
import * as calendar from "./functions/api/calendar.js";
import * as collectionPrice from "./functions/api/collection-price.js";
import * as cover from "./functions/api/cover.js";
import * as gamelistMassAdd from "./functions/api/gamelist-mass-add.js";
import * as gamelistMetadata from "./functions/api/gamelist-metadata.js";
import * as achievementCompletionsByYear from "./functions/api/achievement-completions-by-year.js";
import * as completedGamesByYear from "./functions/api/completed-games-by-year.js";
import * as gamelistGamesByList from "./functions/api/gamelist-games-by-list.js";
import * as prices from "./functions/api/prices.js";
import * as psnTrophiesByYear from "./functions/api/psn-trophies-by-year.js";
import * as repoCopies from "./functions/api/repo-copies.js";
import * as search from "./functions/api/search.js";
import * as secretStatus from "./functions/api/secret-status.js";
import * as shelf from "./functions/api/shelf.js";
import * as shelfCovers from "./functions/api/shelf-covers.js";
import * as shelfGamesPlatforms from "./functions/api/shelf-games-platforms.js";
import * as shelfMassAdd from "./functions/api/shelf-mass-add.js";
import * as shelfMetadata from "./functions/api/shelf-metadata.js";
import * as shelfPriceAudit from "./functions/api/shelf-price-audit.js";
import * as sync from "./functions/api/sync.js";
import * as steamAchievements from "./functions/api/steam-achievements.js";
import * as steamTrophiesByYear from "./functions/api/steam-trophies-by-year.js";
import * as trophies from "./functions/api/trophies.js";
import * as twitchPreview from "./functions/api/twitch-preview.js";
import * as xboxAchievements from "./functions/api/xbox-achievements.js";
import * as xboxTrophiesByYear from "./functions/api/xbox-trophies-by-year.js";

const routes = {
  "/api/achievements": achievements,
  "/api/achievement-completions-by-year": achievementCompletionsByYear,
  "/api/auth": auth,
  "/api/calendar": calendar,
  "/api/collection-price": collectionPrice,
  "/api/cover": cover,
  "/api/completed-games-by-year": completedGamesByYear,
  "/api/gamelist-games-by-list": gamelistGamesByList,
  "/api/gamelist-mass-add": gamelistMassAdd,
  "/api/gamelist-metadata": gamelistMetadata,
  "/api/prices": prices,
  "/api/psn-trophies-by-year": psnTrophiesByYear,
  "/api/repo-copies": repoCopies,
  "/api/search": search,
  "/api/secret-status": secretStatus,
  "/api/shelf": shelf,
  "/api/shelf-covers": shelfCovers,
  "/api/shelf-games-platforms": shelfGamesPlatforms,
  "/api/shelf-mass-add": shelfMassAdd,
  "/api/shelf-metadata": shelfMetadata,
  "/api/shelf-price-audit": shelfPriceAudit,
  "/api/steam-achievements": steamAchievements,
  "/api/steam-trophies-by-year": steamTrophiesByYear,
  "/api/sync": sync,
  "/api/trophies": trophies,
  "/api/twitch-preview": twitchPreview,
  "/api/xbox-achievements": xboxAchievements,
  "/api/xbox-trophies-by-year": xboxTrophiesByYear,
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
  "/api/shelf-games-platforms",
  "/api/shelf-mass-add",
  "/api/shelf-metadata",
  "/api/shelf-price-audit",
]);

export default {
  async scheduled(controller, env, ctx) {
    if (!env.GITHUB_WORKFLOW_TOKEN) return;
    ctx.waitUntil(triggerGithubSync(env));
  },

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

    if (url.pathname === "/goty-export" || url.pathname === "/goty-export/") {
      const target = new URL(request.url);
      const year = target.searchParams.get("year") || target.searchParams.get("gotyExport") || "";
      target.pathname = "/";
      if (year) target.searchParams.set("gotyExport", year);
      else target.searchParams.set("gotyExport", "1");
      return Response.redirect(target.toString(), 302);
    }

    return env.ASSETS.fetch(request);
  },
};

async function triggerGithubSync(env) {
  const repo = env.GITHUB_REPO_FULL_NAME || await findGithubRepo(env);
  const workflow = env.GITHUB_WORKFLOW_FILE || "main.yml";
  const ref = env.GITHUB_REF || "main";
  const response = await fetch(
    `https://api.github.com/repos/${repo}/actions/workflows/${workflow}/dispatches`,
    {
      method: "POST",
      headers: githubHeaders(env),
      body: JSON.stringify({ ref }),
    }
  );

  if (!response.ok) {
    throw new Error(`GitHub sync dispatch failed: ${response.status} ${await response.text()}`);
  }
}

async function findGithubRepo(env) {
  const response = await fetch("https://api.github.com/user/repos?per_page=2", {
    headers: githubHeaders(env),
  });

  if (!response.ok) {
    throw new Error(`GitHub repo lookup failed: ${response.status} ${await response.text()}`);
  }

  const repos = await response.json();
  if (!Array.isArray(repos) || repos.length !== 1 || !repos[0]?.full_name) {
    throw new Error(`GITHUB_WORKFLOW_TOKEN must have access to exactly one repo; found ${Array.isArray(repos) ? repos.length : 0}.`);
  }

  return repos[0].full_name;
}

function githubHeaders(env) {
  return {
    "Authorization": `Bearer ${env.GITHUB_WORKFLOW_TOKEN}`,
    "Accept": "application/vnd.github+json",
    "User-Agent": "gamelist-cloudflare-sync",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
