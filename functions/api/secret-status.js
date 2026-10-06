import { getPsnAccessToken, getPsnNpsso } from "./psn-auth.js";
import { getSteamApiKey } from "./steam-account.js";
import { getXboxApiKey } from "./xbox-account.js";
import { igdbCredentials, verifyIgdbCredentials } from "./igdb-account.js";
import { isEditorRequest } from "./editor-auth.js";

const HEALTH_CACHE_SECONDS = 45 * 60;

export async function onRequestGet({ request, env = {} }) {
  if (!await isEditorRequest(request, env)) return json({ error: "Unauthorized" }, 401);
  const isSet = (value) => Boolean(String(value || "").trim());
  const health = await integrationHealth(env, request);
  const igdb = await igdbCredentials(env);
  const { CURRENT_REPO, ...working } = health;
  return json({
    PSN_NPSSO: isSet(await getPsnNpsso(env)),
    OPENXBL_API_KEY: isSet(await getXboxApiKey(env)),
    STEAM_API_KEY: isSet(await getSteamApiKey(env)),
    IGDB_CLIENT_ID: Boolean(igdb?.clientId),
    IGDB_CLIENT_SECRET: Boolean(igdb?.clientSecret),
    PRICECHARTING_TOKEN: isSet(env.PRICECHARTING_TOKEN),
    GOOGLE_PRIVATE_KEY: isSet(env.GOOGLE_PRIVATE_KEY),
    UPDATE: working.UPDATE,
    CURRENT_REPO,
    SITE_URL: siteUrl(request),
    working,
  });
}

function siteUrl(request) {
  try {
    return new URL(request.url).origin;
  } catch {
    return "";
  }
}

async function integrationHealth(env, request) {
  const cache = caches.default;
  const cacheKey = new Request(new URL("/api/secret-status/health-cache", siteUrl(request)).toString());
  const cached = await cache.match(cacheKey);
  if (cached) return cached.json();
  const checks = await Promise.allSettled([
    checkIgdb(env),
    checkPriceCharting(),
    checkPsn(env),
    checkXbox(env),
    checkSteam(env),
    checkUpdateWorkflow(env, request),
  ]);
  const ok = (index) => checks[index].status === "fulfilled" ? checks[index].value : false;
  const update = checks[5].status === "fulfilled" ? checks[5].value : { ok: false, repoUrl: "" };
  const priceCharting = ok(1);
  const value = {
    IGDB: ok(0),
    PRICECHARTING: priceCharting.ok,
    PRICECHARTING_BLOCKED: priceCharting.blocked,
    PSN: ok(2),
    XBOX: ok(3),
    STEAM: ok(4),
    UPDATE: Boolean(update.ok),
    CURRENT_REPO: update.repoUrl || "",
  };
  await cache.put(cacheKey, new Response(JSON.stringify(value), {
    headers: { "Content-Type": "application/json", "Cache-Control": `public, max-age=${HEALTH_CACHE_SECONDS}` },
  }));
  return value;
}

async function checkIgdb(env) {
  const credentials = await igdbCredentials(env);
  if (!credentials) return false;
  try { return await verifyIgdbCredentials(credentials); } catch { return false; }
}

async function checkPriceCharting() {
  const response = await safeFetch("https://www.pricecharting.com/search-products?type=prices&q=super%20mario", {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; Gamelist/1.0)" },
  });
  if (!response) return { ok: false, blocked: false };
  const body = await response.text().catch(() => "");
  const blocked = /(?:id=["']challenge-error-text["']|\/cdn-cgi\/challenge-platform\/|cf-chl-|Enable JavaScript and cookies to continue)/i.test(body);
  return { ok: Boolean(response.ok && !blocked), blocked };
}

async function checkPsn(env) {
  const npsso = await getPsnNpsso(env);
  if (!npsso) return false;
  try {
    return Boolean(await getPsnAccessToken(npsso));
  } catch {
    return false;
  }
}

async function checkXbox(env) {
  const apiKey = await getXboxApiKey(env);
  if (!apiKey) return false;
  const response = await safeFetch("https://xbl.io/api/v2/account", {
    headers: { "X-Authorization": apiKey },
  });
  return Boolean(response?.ok);
}

async function checkSteam(env) {
  const apiKey = await getSteamApiKey(env);
  if (!apiKey) return false;
  const url = new URL("https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("steamids", "76561197960435530");
  const response = await safeFetch(url);
  return Boolean(response?.ok);
}

async function checkUpdateWorkflow(env, request) {
  const configuredRepoUrl = cleanRepoUrl(env.GITLAB_PROJECT_URL || env.CI_PROJECT_URL || env.REPOSITORY_URL);
  if (env.UPDATE_FILE_PRESENT === "true") return { ok: true, repoUrl: configuredRepoUrl };
  let updateFilePresent = false;
  if (env.ASSETS && request?.url) {
    const origin = new URL(request.url).origin;
    const assetChecks = await Promise.all([
      env.ASSETS.fetch(new Request(`${origin}/.github/workflows/main.yml`)),
      env.ASSETS.fetch(new Request(`${origin}/.gitlab-ci.yml`)),
    ]).catch(() => []);
    updateFilePresent = assetChecks.some((response) => response?.ok);
    if (updateFilePresent && configuredRepoUrl) return { ok: true, repoUrl: configuredRepoUrl };
  }
  const token = String(env.GITHUB_WORKFLOW_TOKEN || "").trim();
  if (!token) return { ok: updateFilePresent, repoUrl: configuredRepoUrl };
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "User-Agent": "gamelist-update-check",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  let repo = String(env.GITHUB_REPO_FULL_NAME || "").trim();
  if (!repo) {
    const reposResponse = await safeFetch("https://api.github.com/user/repos?per_page=2", { headers });
    if (!reposResponse?.ok) return { ok: updateFilePresent, repoUrl: configuredRepoUrl };
    const repos = await reposResponse.json().catch(() => []);
    if (!Array.isArray(repos) || repos.length !== 1) return { ok: updateFilePresent, repoUrl: configuredRepoUrl };
    repo = String(repos[0]?.full_name || "");
  }
  if (!/^[^/]+\/[^/]+$/.test(repo)) return { ok: updateFilePresent, repoUrl: configuredRepoUrl };
  const repoUrl = `https://github.com/${repo}`;
  const response = await safeFetch(`https://api.github.com/repos/${repo}/actions/workflows/main.yml`, { headers });
  return { ok: Boolean(response?.ok), repoUrl };
}

function cleanRepoUrl(value) {
  try {
    const url = new URL(String(value || "").trim());
    return /^https?:$/.test(url.protocol) ? url.toString().replace(/\/$/, "") : "";
  } catch {
    return "";
  }
}

async function safeFetch(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function json(data) {
  return new Response(JSON.stringify(data), {
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json",
    },
  });
}
