const STEAM_API_BASE = "https://api.steampowered.com";
const STEAM_CACHE_SECONDS = 60 * 60;

export async function onRequestGet({ request, env = {} }) {
  const url = new URL(request.url);
  const appId = cleanSteamAppId(url.searchParams.get("appId"));
  const user = cleanSteamUser(url.searchParams.get("user") || env.STEAM_PROFILE_USER || "");
  const debug = url.searchParams.has("debug");
  const apiKey = String(env.STEAM_API_KEY || globalThis.process?.env?.STEAM_API_KEY || "").trim();

  if (!appId) return json({ achievements: [], error: "Missing Steam app id" }, 400, { cache: false });
  if (!user) return json({ achievements: [], needsSetup: true, error: "Missing Steam profile" }, 200, { cache: false });
  if (!apiKey) return json({ achievements: [], needsSetup: true, error: "Missing STEAM_API_KEY" }, 200, { cache: false });

  try {
    const steamId = await resolveSteamId(user, apiKey);
    if (!steamId) return json({ achievements: [], error: "Could not resolve Steam profile" }, 200, { cache: false });
    const achievements = await getSteamAchievements(appId, steamId, apiKey);
    return json({ achievements, count: achievements.length, source: "steam", steamId, appId });
  } catch (error) {
    return json({
      achievements: [],
      source: "steam",
      authError: true,
      ...(debug ? { debug: error?.message || "Steam achievements request failed" } : {}),
    }, 200, { cache: false });
  }
}

async function resolveSteamId(user, apiKey) {
  const cleaned = cleanSteamUser(user);
  if (/^\d{17}$/.test(cleaned)) return cleaned;
  const vanity = steamVanityName(cleaned);
  if (/^\d{17}$/.test(vanity)) return vanity;
  if (!vanity) return "";
  const data = await steamGet(`${STEAM_API_BASE}/ISteamUser/ResolveVanityURL/v0001/?${new URLSearchParams({
    key: apiKey,
    vanityurl: vanity,
  })}`);
  return data?.response?.success === 1 ? String(data.response.steamid || "") : "";
}

function steamVanityName(value) {
  const text = String(value || "").trim();
  try {
    const url = new URL(text);
    const parts = url.pathname.split("/").filter(Boolean);
    const profileIndex = parts.indexOf("profiles");
    if (profileIndex >= 0 && /^\d{17}$/.test(parts[profileIndex + 1] || "")) return parts[profileIndex + 1];
    const idIndex = parts.indexOf("id");
    if (idIndex >= 0) return parts[idIndex + 1] || "";
  } catch {}
  return text.replace(/^@/, "").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 64);
}

async function getSteamAchievements(appId, steamId, apiKey) {
  const [schema, player, globalStats] = await Promise.all([
    steamGet(`${STEAM_API_BASE}/ISteamUserStats/GetSchemaForGame/v2/?${new URLSearchParams({ key: apiKey, appid: appId, l: "en" })}`),
    steamGet(`${STEAM_API_BASE}/ISteamUserStats/GetPlayerAchievements/v0001/?${new URLSearchParams({ key: apiKey, steamid: steamId, appid: appId, l: "en" })}`),
    steamGet(`${STEAM_API_BASE}/ISteamUserStats/GetGlobalAchievementPercentagesForApp/v0002/?${new URLSearchParams({ gameid: appId })}`).catch(() => ({})),
  ]);
  const schemaAchievements = schema?.game?.availableGameStats?.achievements || [];
  const playerAchievements = player?.playerstats?.achievements || [];
  const playerByName = new Map(playerAchievements.map((item) => [String(item.apiname || item.name || ""), item]));
  const rarityByName = new Map((globalStats?.achievementpercentages?.achievements || []).map((item) => [String(item.name || ""), Number(item.percent)]));
  const source = schemaAchievements.length ? schemaAchievements : playerAchievements;
  return source.map((meta, index) => {
    const name = String(meta.name || meta.apiname || "");
    const earned = playerByName.get(name) || meta;
    const achieved = Number(earned.achieved || 0) === 1;
    const unlockTime = Number(earned.unlocktime || 0);
    const rarity = rarityByName.has(name) ? `${roundPercent(rarityByName.get(name))}%` : "";
    return {
      trophyId: index,
      order: index,
      title: meta.displayName || name || "Achievement",
      description: meta.description || "",
      earned: achieved,
      earnedAt: achieved && unlockTime ? formatSteamDate(unlockTime) : "",
      rawEarnedAt: achieved && unlockTime ? new Date(unlockTime * 1000).toISOString() : "",
      rarity,
      type: "achievement",
      icon: achieved ? (meta.icon || "") : (meta.icongray || meta.icon || ""),
      source: "steam",
    };
  });
}

async function steamGet(url) {
  const response = await fetch(url, { cf: { cacheTtl: STEAM_CACHE_SECONDS, cacheEverything: true } });
  if (!response.ok) throw new Error(`Steam request failed (${response.status})`);
  const data = await response.json();
  if (data?.playerstats?.success === false) throw new Error(data.playerstats.error || "Steam achievements unavailable");
  return data;
}

function cleanSteamAppId(value) {
  return String(value || "").replace(/\D/g, "").slice(0, 12);
}

function cleanSteamUser(value) {
  return String(value || "").trim().replace(/[<>]/g, "").slice(0, 128);
}

function roundPercent(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "";
  return number >= 10 ? number.toFixed(1).replace(/\.0$/, "") : number.toFixed(2).replace(/0$/, "").replace(/\.0$/, "");
}

function formatSteamDate(value) {
  const date = new Date(Number(value) * 1000);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function json(payload, status = 200, { cache = true } = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": cache ? `public, max-age=${STEAM_CACHE_SECONDS}` : "no-store",
    },
  });
}
