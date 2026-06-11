const DEFAULT_USER = "ShabiiEXE";
const PSNP_BASE = "https://psnprofiles.com";
const PSN_AUTH_BASE = "https://ca.account.sony.com/api/authz/v3/oauth";
const PSN_TROPHY_BASE = "https://m.np.playstation.com/api/trophy";
const PSN_CLIENT_ID = "09515159-7237-4370-9b40-3806e67c0891";
const PSN_REDIRECT_URI = "com.scee.psxandroid.scecompcall://redirect";
const PSN_BASIC_AUTH = "Basic MDk1MTUxNTktNzIzNy00MzcwLTliNDAtMzgwNmU2N2MwODkxOnVjUGprYTV0bnRCMktxc1A=";
const PSN_CACHE_SECONDS = 60 * 60;

export async function onRequestGet({ request, env = {} }) {
  const url = new URL(request.url);
  const debug = url.searchParams.has("debug");
  const user = cleanUser(url.searchParams.get("user") || env.PSN_PROFILE_USER || DEFAULT_USER);
  const sourceUrl = `${PSNP_BASE}/${encodeURIComponent(user)}`;
  if (!user) return json({ user: DEFAULT_USER, achievements: [], sourceUrl: `${PSNP_BASE}/${DEFAULT_USER}` }, 200, { cache: false });

  const npsso = cleanNpsso(env.PSN_NPSSO);
  if (!npsso) {
    return json({ user, sourceUrl: "https://www.playstation.com/", achievements: [], source: "psn", needsSetup: true }, 200, { cache: false });
  }

  try {
    const accessToken = await getPsnAccessToken(npsso);
    const activity = await getRecentPsnActivity(accessToken, sourceUrl);
    return json({ user, sourceUrl, ...activity, source: "psn", blocked: false });
  } catch (error) {
    return json({
      user,
      sourceUrl,
      achievements: [],
      source: "psn",
      authError: true,
      ...(debug ? { debug: error?.message || "PSN authentication failed" } : {}),
    }, 200, { cache: false });
  }
}

async function getPsnAccessToken(npsso) {
  const codeUrl = `${PSN_AUTH_BASE}/authorize?${new URLSearchParams({
    access_type: "offline",
    client_id: PSN_CLIENT_ID,
    redirect_uri: PSN_REDIRECT_URI,
    response_type: "code",
    scope: "psn:mobile.v2.core psn:clientapp",
  })}`;
  const codeResponse = await fetch(codeUrl, {
    headers: { Cookie: `npsso=${npsso}` },
    redirect: "manual",
  });
  const location = codeResponse.headers.get("location") || "";
  if (!location.includes("?code=")) throw new Error(`Missing PSN access code (${codeResponse.status})`);
  const code = new URLSearchParams(location.split("redirect/")[1]).get("code");
  if (!code) throw new Error("Missing PSN code");

  const tokenResponse = await fetch(`${PSN_AUTH_BASE}/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: PSN_BASIC_AUTH,
    },
    body: new URLSearchParams({
      code,
      redirect_uri: PSN_REDIRECT_URI,
      grant_type: "authorization_code",
      token_format: "jwt",
    }).toString(),
  });
  if (!tokenResponse.ok) throw new Error(`PSN token exchange failed (${tokenResponse.status})`);
  const token = await tokenResponse.json();
  if (!token.access_token) throw new Error("Missing PSN access token");
  return token.access_token;
}

async function getRecentPsnActivity(accessToken, sourceUrl) {
  const [data, summary] = await Promise.all([
    getPsnTrophyTitles(accessToken),
    getPsnTrophySummary(accessToken),
  ]);
  const titles = data.trophyTitles || [];
  const recentTitles = titles.slice(0, 6);
  const trophies = (await Promise.all(recentTitles.slice(0, 4).map((title) => getRecentTrophiesForTitle(accessToken, title, sourceUrl)))).flat();
  trophies.sort((a, b) => String(b.rawEarnedAt || "").localeCompare(String(a.rawEarnedAt || "")));
  return {
    achievements: trophies.length ? trophies.slice(0, 6) : recentTitles.map((title) => titleSummary(title, sourceUrl)).slice(0, 6),
    games: titles.map((title) => titleSummary(title, sourceUrl)),
    summary,
  };
}

async function getPsnTrophyTitles(accessToken) {
  let lastError = null;
  for (const limit of ["999", "200", "100", "50"]) {
    try {
      return await psnGet(`${PSN_TROPHY_BASE}/v1/users/me/trophyTitles?${new URLSearchParams({ limit, offset: "0" })}`, accessToken);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error("PSN trophy titles request failed");
}

async function getPsnTrophySummary(accessToken) {
  const data = await psnGet(`${PSN_TROPHY_BASE}/v1/users/me/trophySummary`, accessToken);
  const earned = data.earnedTrophies || {};
  return {
    level: data.trophyLevel || "",
    progress: Number(data.progress || 0),
    tier: data.tier || "",
    trophies: {
      platinum: Number(earned.platinum || 0),
      gold: Number(earned.gold || 0),
      silver: Number(earned.silver || 0),
      bronze: Number(earned.bronze || 0),
    },
  };
}

async function getRecentTrophiesForTitle(accessToken, title, sourceUrl) {
  try {
    const params = new URLSearchParams({
      npServiceName: title.npServiceName || serviceNameFor(title),
      limit: "200",
      offset: "0",
    });
    const earnedUrl = `${PSN_TROPHY_BASE}/v1/users/me/npCommunicationIds/${encodeURIComponent(title.npCommunicationId)}/trophyGroups/all/trophies?${params}`;
    const metaUrl = `${PSN_TROPHY_BASE}/v1/npCommunicationIds/${encodeURIComponent(title.npCommunicationId)}/trophyGroups/all/trophies?${params}`;
    const [earnedData, metaData] = await Promise.all([
      psnGet(earnedUrl, accessToken),
      psnGet(metaUrl, accessToken),
    ]);
    const metaById = new Map((metaData.trophies || []).map((trophy) => [String(trophy.trophyId), trophy]));
    return (earnedData.trophies || [])
      .filter((trophy) => trophy.earned && trophy.earnedDateTime)
      .map((earned) => {
        const meta = metaById.get(String(earned.trophyId)) || {};
        return {
          title: meta.trophyName || trophyTypeLabel(earned.trophyType),
          game: title.trophyTitleName || "",
          earnedAt: formatPsnDate(earned.earnedDateTime),
          rawEarnedAt: earned.earnedDateTime,
          rarity: [trophyTypeLabel(earned.trophyType), earned.trophyEarnedRate ? `${earned.trophyEarnedRate}%` : ""].filter(Boolean).join(" · "),
          icon: meta.trophyIconUrl || earned.trophyRewardImageUrl || title.trophyTitleIconUrl || "",
          url: sourceUrl,
        };
      });
  } catch {
    return [titleSummary(title, sourceUrl)];
  }
}

async function psnGet(url, accessToken) {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "Accept-Language": "en-US",
    },
    cf: { cacheTtl: PSN_CACHE_SECONDS, cacheEverything: true },
  });
  if (!response.ok) throw new Error(`PSN request failed (${response.status})`);
  return response.json();
}

function titleSummary(title, sourceUrl) {
  if (!title) return {};
  {
    const earned = title.earnedTrophies || {};
    const total = title.definedTrophies || {};
    const earnedCount = trophyTotal(earned);
    const totalCount = trophyTotal(total);
    const progress = Number.isFinite(Number(title.progress)) ? `${title.progress}%` : "";
    return {
      title: title.trophyTitleName || "Recent trophy activity",
      game: [progress, totalCount ? `${earnedCount}/${totalCount} trophies` : ""].filter(Boolean).join(" · "),
      earnedAt: title.lastUpdatedDateTime ? formatPsnDate(title.lastUpdatedDateTime) : "",
      rarity: title.trophyTitlePlatform || "",
      icon: title.trophyTitleIconUrl || "",
      url: sourceUrl,
    };
  }
}

function serviceNameFor(title) {
  return String(title.trophyTitlePlatform || "").toUpperCase().includes("PS5") ? "trophy2" : "trophy";
}

function trophyTypeLabel(value) {
  const text = String(value || "").toLowerCase();
  return text ? text[0].toUpperCase() + text.slice(1) : "Trophy";
}

function trophyTotal(value = {}) {
  return ["bronze", "silver", "gold", "platinum"].reduce((sum, key) => sum + Number(value[key] || 0), 0);
}

function formatPsnDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function parseAchievements(html, sourceUrl) {
  const candidates = [];
  const rows = html.match(/<(?:tr|li|div|article)\b[^>]*(?:trophy|recent|earned|activity)[^>]*>[\s\S]*?<\/(?:tr|li|div|article)>/gi) || [];
  for (const row of rows) {
    const text = cleanText(stripTags(row));
    if (!text || text.length < 8) continue;
    const title = attr(row, "title") || firstHeading(row) || text.split(/\s{2,}| • | - /)[0];
    const game = firstMatch(text, /(?:in|from)\s+(.+?)(?:\s+earned|\s+\d|\s+platinum|\s+gold|\s+silver|\s+bronze|$)/i);
    const earnedAt = firstMatch(text, /(\d{1,2}\s+\w+\s+\d{4}|\w+\s+\d{1,2},\s+\d{4}|\d{1,2}\/\d{1,2}\/\d{2,4}|[0-9]+\s+(?:minute|hour|day|week|month)s?\s+ago)/i);
    const rarity = firstMatch(text, /(platinum|gold|silver|bronze|ultra rare|very rare|rare|common)/i);
    const icon = absoluteUrl(attr(row, "src"), sourceUrl);
    const link = absoluteUrl(attr(row, "href"), sourceUrl);
    if (title && !/profile|leaderboard|guide|session/i.test(title)) {
      candidates.push({ title: title.slice(0, 90), game, earnedAt, rarity, icon, url: link || sourceUrl });
    }
  }
  return uniqueAchievements(candidates).slice(0, 6);
}

function firstHeading(html) {
  return cleanText(stripTags(firstMatch(html, /<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/i)
    || firstMatch(html, /<(?:strong|b|a)[^>]*>([\s\S]*?)<\/(?:strong|b|a)>/i)));
}

function attr(html, name) {
  const match = html.match(new RegExp(`${name}=["']([^"']+)["']`, "i"));
  return match ? decode(match[1]) : "";
}

function firstMatch(value, pattern) {
  const match = String(value || "").match(pattern);
  return match ? cleanText(match[1]) : "";
}

function stripTags(value) {
  return String(value || "").replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ");
}

function cleanText(value) {
  return decode(String(value || "").replace(/\s+/g, " ").trim());
}

function decode(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function absoluteUrl(value, base) {
  if (!value || value.startsWith("data:")) return "";
  try {
    return new URL(value, base).toString();
  } catch {
    return "";
  }
}

function uniqueAchievements(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = `${item.title}|${item.game}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function cleanUser(value) {
  return String(value || "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 32);
}

function cleanNpsso(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.npsso) return cleanNpsso(parsed.npsso);
  } catch {
    // The secret is usually just the token, not JSON.
  }
  return raw
    .replace(/^npsso\s*=/i, "")
    .replace(/^["']|["']$/g, "")
    .trim();
}

function isBlocked(html) {
  return /Attention Required|Just a moment|cf-error|challenge-platform|Cloudflare/i.test(html);
}

function json(data, status = 200, options = {}) {
  const cache = options.cache !== false;
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": cache ? `public, max-age=${PSN_CACHE_SECONDS}` : "no-store",
    },
  });
}
