const HEALTH_CACHE_MS = 5 * 60 * 1000;
let healthCache;

export async function onRequestGet({ env = {} }) {
  const isSet = (value) => Boolean(String(value || "").trim());
  const working = await integrationHealth(env);
  return json({
    PSN_NPSSO: isSet(env.PSN_NPSSO),
    OPENXBL_API_KEY: isSet(env.OPENXBL_API_KEY),
    STEAM_API_KEY: isSet(env.STEAM_API_KEY),
    IGDB_TWITCH: isSet(env.IGDB_CLIENT_ID) && isSet(env.IGDB_CLIENT_SECRET),
    PRICECHARTING_TOKEN: isSet(env.PRICECHARTING_TOKEN),
    GOOGLE_PRIVATE_KEY: isSet(env.GOOGLE_PRIVATE_KEY),
    UPDATE: working.UPDATE,
    working,
  });
}

async function integrationHealth(env) {
  if (healthCache && Date.now() < healthCache.expiresAt) return healthCache.value;
  const checks = await Promise.all([
    checkIgdb(env),
    checkPriceCharting(),
    checkPsn(env),
    checkXbox(env),
    checkSteam(env),
    checkGooglePrivateKey(env),
    checkUpdateWorkflow(env),
  ]);
  const value = {
    IGDB: checks[0],
    PRICECHARTING: checks[1],
    PSN: checks[2],
    XBOX: checks[3],
    STEAM: checks[4],
    GOOGLE_PRIVATE_KEY_VALID: checks[5],
    UPDATE: checks[6],
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
  const url = new URL("https://ca.account.sony.com/api/authz/v3/oauth/authorize");
  url.search = new URLSearchParams({
    access_type: "offline",
    client_id: "09515159-7237-4370-9b40-3806e67c0891",
    redirect_uri: "com.scee.psxandroid.scecompcall://redirect",
    response_type: "code",
    scope: "psn:mobile.v2.core psn:clientapp",
  });
  const response = await safeFetch(url, {
    headers: { Cookie: `npsso=${npsso}` },
    redirect: "manual",
  });
  return Boolean(response && response.status >= 300 && response.status < 400 && (response.headers.get("location") || "").includes("?code="));
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

async function checkGooglePrivateKey(env) {
  const privateKey = String(env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n").trim();
  if (!privateKey) return false;
  try {
    const binary = Uint8Array.from(atob(privateKey.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "")), (char) => char.charCodeAt(0));
    await crypto.subtle.importKey("pkcs8", binary, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
    return true;
  } catch {
    return false;
  }
}

async function checkUpdateWorkflow(env) {
  const token = String(env.GITHUB_WORKFLOW_TOKEN || "").trim();
  if (!token) return false;
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "User-Agent": "gamelist-update-check",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  let repo = String(env.GITHUB_REPO_FULL_NAME || "").trim();
  if (!repo) {
    const reposResponse = await safeFetch("https://api.github.com/user/repos?per_page=2", { headers });
    if (!reposResponse?.ok) return false;
    const repos = await reposResponse.json().catch(() => []);
    if (!Array.isArray(repos) || repos.length !== 1) return false;
    repo = String(repos[0]?.full_name || "");
  }
  if (!/^[^/]+\/[^/]+$/.test(repo)) return false;
  const response = await safeFetch(`https://api.github.com/repos/${repo}/actions/workflows/main.yml`, { headers });
  return Boolean(response?.ok);
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
