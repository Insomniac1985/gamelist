import { getPsnAccessToken } from "./psn-auth.js";

const HEALTH_CACHE_MS = 5 * 60 * 1000;
let healthCache;

export async function onRequestGet({ request, env = {} }) {
  const isSet = (value) => Boolean(String(value || "").trim());
  const health = await integrationHealth(env, request);
  const { CURRENT_REPO, ...working } = health;
  return json({
    PSN_NPSSO: isSet(env.PSN_NPSSO),
    OPENXBL_API_KEY: isSet(env.OPENXBL_API_KEY),
    STEAM_API_KEY: isSet(env.STEAM_API_KEY),
    IGDB_CLIENT_ID: isSet(env.IGDB_CLIENT_ID),
    IGDB_CLIENT_SECRET: isSet(env.IGDB_CLIENT_SECRET),
    PRICECHARTING_TOKEN: isSet(env.PRICECHARTING_TOKEN),
    GOOGLE_PRIVATE_KEY: isSet(env.GOOGLE_PRIVATE_KEY),
    UPDATE: working.UPDATE,
    CURRENT_REPO,
    working,
  });
}

async function integrationHealth(env, request) {
  if (healthCache && Date.now() < healthCache.expiresAt) return healthCache.value;
  const checks = await Promise.all([
    checkIgdb(env),
    checkPriceCharting(),
    checkPsn(env),
    checkXbox(env),
    checkSteam(env),
    checkUpdateWorkflow(env, request),
  ]);
  const value = {
    IGDB: checks[0],
    PRICECHARTING: checks[1],
    PSN: checks[2],
    XBOX: checks[3],
    STEAM: checks[4],
    UPDATE: checks[5].ok,
    CURRENT_REPO: checks[5].repoUrl,
  };
  healthCache = { value, expiresAt: Date.now() + HEALTH_CACHE_MS };
  return value;
}

async function checkIgdb(env) {
  const clientId = String(env.IGDB_CLIENT_ID || "").trim();
  const clientSecret = String(env.IGDB_CLIENT_SECRET || "").trim();
  if (!clientId || !clientSecret) return false;
  const tokenUrl = new URL("https://id.twitch.tv/oauth2/token");
  tokenUrl.searchParams.set("client_id", clientId);
  tokenUrl.searchParams.set("client_secret", clientSecret);
  tokenUrl.searchParams.set("grant_type", "client_credentials");
  const tokenResponse = await safeFetch(tokenUrl, { method: "POST" });
  if (!tokenResponse?.ok) return false;
  const token = await tokenResponse.json().catch(() => ({}));
  const response = await safeFetch("https://api.igdb.com/v4/games", {
    method: "POST",
    headers: {
      "Client-ID": clientId,
      Authorization: `Bearer ${token.access_token || ""}`,
      "Content-Type": "text/plain",
    },
    body: "fields id; limit 1;",
  });
  return Boolean(response?.ok);
}

async function checkPriceCharting() {
  const response = await safeFetch("https://www.pricecharting.com/search-products?type=prices&q=super%20mario", {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; Gamelist/1.0)" },
  });
  return Boolean(response?.ok);
}

async function checkPsn(env) {
  const npsso = String(env.PSN_NPSSO || "").trim();
  if (!npsso) return false;
  try {
    return Boolean(await getPsnAccessToken(npsso));
  } catch {
    return false;
  }
}

async function checkXbox(env) {
  const apiKey = String(env.OPENXBL_API_KEY || "").trim();
  if (!apiKey) return false;
  const response = await safeFetch("https://xbl.io/api/v2/account", {
    headers: { "X-Authorization": apiKey },
  });
  return Boolean(response?.ok);
}

async function checkSteam(env) {
  const apiKey = String(env.STEAM_API_KEY || "").trim();
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
