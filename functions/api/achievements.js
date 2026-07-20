const DEFAULT_USER = "ShabiiEXE";
import { getPsnAccessToken } from "./psn-auth.js";

const PSNP_BASE = "https://psnprofiles.com";
const PSN_TROPHY_BASE = "https://m.np.playstation.com/api/trophy";
const PSN_CACHE_SECONDS = 60 * 60;
const PSN_SEARCH_BASE = "https://m.np.playstation.com/api/search";
const PSN_LEGACY_USER_BASE = "https://us-prof.np.community.playstation.net/userProfile/v1/users";
const MANUAL_PLATINUM_OVERRIDES = [
  { match: ["miles", "morales"], trophyName: "Be Yourself", icon: "https://img.psnprofiles.com/trophy/m/11805/8739f0e6-486a-458b-97a2-f3c9d7914492.png" },
  { match: ["persona", "4", "dancing"], trophyName: "Dancing All Night", icon: "https://img.psnprofiles.com/trophy/m/8508/d370e2bc-56f7-4b36-884c-de3565686c1b.png" },
  { match: ["spider", "man", "2"], ids: ["23918"], exclude: ["miles"], trophyName: "Dedicated", icon: "https://img.psnprofiles.com/trophy/m/23918/c6620db1-4320-4a50-99af-fce3f5be2b41.png" },
  { match: ["spider", "man"], ids: ["8143"], exclude: ["miles", "2", "23918"], trophyName: "Be Greater", icon: "https://img.psnprofiles.com/trophy/m/8143/ccb3b536-eaae-4c03-beb5-4d9b3f8cb72c.png" },
  { match: ["13", "sentinels"], trophyName: "13 Sentinels: Aegis Rim", icon: "https://img.psnprofiles.com/trophy/m/10041/d68a865e-66a8-407c-8b43-2852b95f54d3.png" },
  { match: ["elden", "ring"], trophyName: "Elden Ring", icon: "https://img.psnprofiles.com/trophy/m/15539/b0d9a703-d112-4415-b64e-b7093cabe18c.png" },
  { match: ["persona", "5"], trophyName: "The Phenomenal Phantom Thief", icon: "https://img.psnprofiles.com/trophy/m/10572/aa5d2bda-ce7e-40e8-aff1-bab61e4cfcf3.png" },
];

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
    const accountId = await resolvePsnAccountId(accessToken, user);
    const activity = await getRecentPsnActivity(accessToken, sourceUrl, accountId);
    return json({ user, accountId, sourceUrl, ...activity, source: "psn", blocked: false });
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

async function resolvePsnAccountId(accessToken, user) {
  const cleaned = cleanUser(user);
  if (!cleaned) return "me";
  if (/^\d{6,}$/.test(cleaned)) return cleaned;
  try {
    const data = await psnPost(`${PSN_SEARCH_BASE}/v1/universalSearch`, accessToken, {
      searchTerm: cleaned,
      domainRequests: [{ domain: "SocialAllAccounts" }],
    });
    const results = (data?.domainResponses || []).flatMap((domain) => domain?.results || []);
    const exact = results.find((result) => String(result?.socialMetadata?.onlineId || "").toLowerCase() === cleaned.toLowerCase());
    if (exact) return String(exact?.socialMetadata?.accountId || exact?.accountId || "").trim() || "me";
  } catch {
    // Legacy lookup below is a useful fallback for public profiles.
  }
  return await resolvePsnAccountIdFromLegacy(accessToken, cleaned) || "me";
}

async function resolvePsnAccountIdFromLegacy(accessToken, user) {
  try {
    const fields = "npId,onlineId,accountId";
    const data = await psnGet(`${PSN_LEGACY_USER_BASE}/${encodeURIComponent(user)}/profile2?${new URLSearchParams({ fields })}`, accessToken);
    return String(data?.profile?.accountId || data?.accountId || "").trim();
  } catch {
    return "";
  }
}

async function getRecentPsnActivity(accessToken, sourceUrl, accountId = "me") {
  const [data, summary] = await Promise.all([
    getPsnTrophyTitles(accessToken, accountId),
    getPsnTrophySummary(accessToken, accountId),
  ]);
  const titles = (data.trophyTitles || []).map((title) => ({ ...title, accountId }));
  const recentTitles = titles.slice(0, 6);
  const [trophies, platinums] = await Promise.all([
    Promise.all(recentTitles.slice(0, 4).map((title) => getRecentTrophiesForTitle(accessToken, title, sourceUrl))),
    getAllPlatinums(accessToken, titles, sourceUrl, Number(summary?.trophies?.platinum || 0)),
  ]);
  const recentTrophies = trophies.flat();
  recentTrophies.sort((a, b) => String(b.rawEarnedAt || "").localeCompare(String(a.rawEarnedAt || "")));
  return {
    achievements: recentTrophies.length ? recentTrophies.slice(0, 6) : recentTitles.map((title) => titleSummary(title, sourceUrl)).slice(0, 6),
    games: titles.map((title) => titleSummary(title, sourceUrl)),
    platinums,
    platinumStatus: {
      expected: Number(summary?.trophies?.platinum || 0),
      returned: platinums.length,
      fallback: platinums.filter((item) => item.fallback).length,
      genericFallback: platinums.filter((item) => item.fallback && item.trophyName === "Platinum").length,
    },
    summary,
  };
}

async function getPsnTrophyTitles(accessToken, accountId = "me") {
  let lastError = null;
  for (const limit of [999, 200, 100, 50]) {
    try {
      const titles = await getPagedTrophyTitles(accessToken, accountId, limit);
      return { trophyTitles: titles };
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error("PSN trophy titles request failed");
}

async function getPagedTrophyTitles(accessToken, accountId, limit) {
  const titles = [];
  for (let offset = 0; offset < 5000; offset += limit) {
    const data = await psnGet(`${PSN_TROPHY_BASE}/v1/users/${encodeURIComponent(accountId)}/trophyTitles?${new URLSearchParams({ limit: String(limit), offset: String(offset) })}`, accessToken);
    const page = data.trophyTitles || [];
    titles.push(...page);
    if (page.length < limit || titles.length >= Number(data.totalItemCount || 0)) break;
  }
  return titles;
}

async function getPsnTrophySummary(accessToken, accountId = "me") {
  const data = await psnGet(`${PSN_TROPHY_BASE}/v1/users/${encodeURIComponent(accountId)}/trophySummary`, accessToken);
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
    const npServiceName = title.npServiceName || serviceNameFor(title);
    const accountId = title.accountId || "me";
    const earnedUrl = `${PSN_TROPHY_BASE}/v1/users/${encodeURIComponent(accountId)}/npCommunicationIds/${encodeURIComponent(title.npCommunicationId)}/trophyGroups/all/trophies`;
    const metaUrl = `${PSN_TROPHY_BASE}/v1/npCommunicationIds/${encodeURIComponent(title.npCommunicationId)}/trophyGroups/all/trophies`;
    const [earnedData, metaData] = await Promise.all([
      getPagedTrophies(accessToken, earnedUrl, npServiceName),
      getPagedTrophies(accessToken, metaUrl, npServiceName),
    ]);
    const metaById = new Map(metaData.map((trophy) => [String(trophy.trophyId), trophy]));
    return earnedData
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
          npCommunicationId: title.npCommunicationId || "",
          npServiceName,
          platform: title.trophyTitlePlatform || "",
          url: sourceUrl,
        };
      });
  } catch {
    return [titleSummary(title, sourceUrl)];
  }
}

async function getAllPlatinums(accessToken, titles, sourceUrl, expectedCount = 0) {
  const platinumTitles = titles.filter((title) => Number(title?.earnedTrophies?.platinum || 0) > 0);
  const remainingTitles = titles.filter((title) => Number(title?.earnedTrophies?.platinum || 0) <= 0);
  const results = [];
  const chunkSize = 6;
  for (let index = 0; index < platinumTitles.length; index += chunkSize) {
    const chunk = platinumTitles.slice(index, index + chunkSize);
    const platinums = await Promise.all(chunk.map((title) => getPlatinumsForTitle(accessToken, title, sourceUrl)));
    results.push(...platinums.flat());
  }
  let unique = uniquePlatinums(results);
  for (let index = 0; expectedCount && unique.length < expectedCount && index < remainingTitles.length; index += chunkSize) {
    const chunk = remainingTitles.slice(index, index + chunkSize);
    const platinums = await Promise.all(chunk.map((title) => getPlatinumsForTitle(accessToken, title, sourceUrl)));
    results.push(...platinums.flat());
    unique = uniquePlatinums(results);
  }
  unique.sort(comparePlatinumRecords);
  return expectedCount ? unique.slice(0, expectedCount) : unique;
}

function uniquePlatinums(platinums) {
  const seen = new Set();
  return platinums.filter((item) => {
    const key = item.npCommunicationId || [item.title, item.trophyName, item.rawEarnedAt].join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function comparePlatinumRecords(a, b) {
  if (Boolean(a.fallback) !== Boolean(b.fallback)) return a.fallback ? 1 : -1;
  return String(b.rawEarnedAt || "").localeCompare(String(a.rawEarnedAt || ""));
}

async function getPlatinumsForTitle(accessToken, title, sourceUrl) {
  const services = trophyServiceCandidates(title);
  for (const npServiceName of services) {
    try {
      const platinums = await getPlatinumsForTitleService(accessToken, title, sourceUrl, npServiceName);
      if (platinums.length) return platinums;
    } catch {
      // Some mixed-platform titles only respond to one trophy service.
    }
  }
  if (Number(title?.earnedTrophies?.platinum || 0) <= 0) return [];
  const fallback = await getFallbackPlatinumForTitle(accessToken, title, sourceUrl, services);
  return fallback ? [fallback] : [fallbackPlatinumForTitle(title, sourceUrl)];
}

async function getPlatinumsForTitleService(accessToken, title, sourceUrl, npServiceName) {
  const accountId = title.accountId || "me";
  const earnedUrl = `${PSN_TROPHY_BASE}/v1/users/${encodeURIComponent(accountId)}/npCommunicationIds/${encodeURIComponent(title.npCommunicationId)}/trophyGroups/all/trophies`;
  const metaUrl = `${PSN_TROPHY_BASE}/v1/npCommunicationIds/${encodeURIComponent(title.npCommunicationId)}/trophyGroups/all/trophies`;
  const [earnedData, metaData] = await Promise.all([
    getPagedTrophies(accessToken, earnedUrl, npServiceName),
    getPagedTrophies(accessToken, metaUrl, npServiceName),
  ]);
  const metaById = new Map(metaData.map((trophy) => [String(trophy.trophyId), trophy]));
  const platinums = earnedData
    .map((earned) => {
      const meta = metaById.get(String(earned.trophyId)) || {};
      if (!earned.earned || !earned.earnedDateTime || !isPlatinumTrophy(earned, meta)) return null;
      return platinumFromTitleTrophy(title, sourceUrl, npServiceName, earned, meta);
    })
    .filter(Boolean);
  if (platinums.length) return platinums;
  if (Number(title?.earnedTrophies?.platinum || 0) <= 0) return [];
  const metaPlatinum = metaData.find((trophy) => isPlatinumTrophy({}, trophy));
  if (!metaPlatinum) return [];
  return [platinumFromTitleTrophy(title, sourceUrl, npServiceName, {}, metaPlatinum, true)];
}

function trophyServiceCandidates(title) {
  const platform = String(title?.trophyTitlePlatform || "").toUpperCase();
  return uniqueValues([
    title?.npServiceName,
    serviceNameFor(title),
    platform.includes("PS5") ? "trophy2" : "",
    platform.includes("PS4") ? "trophy" : "",
    "trophy2",
    "trophy",
  ].filter(Boolean));
}

function uniqueValues(values) {
  return [...new Set(values)];
}

async function getPagedTrophies(accessToken, baseUrl, npServiceName) {
  const trophies = [];
  const limit = 200;
  for (let offset = 0; offset < 1000; offset += limit) {
    const params = new URLSearchParams({ npServiceName, limit: String(limit), offset: String(offset) });
    const data = await psnGet(`${baseUrl}?${params}`, accessToken);
    const page = data.trophies || [];
    trophies.push(...page);
    if (page.length < limit || trophies.length >= Number(data.totalItemCount || 0)) break;
  }
  return trophies;
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

async function psnPost(url, accessToken, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "Accept-Language": "en-US",
    },
    body: JSON.stringify(body),
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
      npCommunicationId: title.npCommunicationId || "",
      npServiceName: title.npServiceName || serviceNameFor(title),
      url: sourceUrl,
    };
  }
}

function serviceNameFor(title) {
  return String(title.trophyTitlePlatform || "").toUpperCase().includes("PS5") ? "trophy2" : "trophy";
}

async function getFallbackPlatinumForTitle(accessToken, title, sourceUrl, services) {
  const metaUrl = `${PSN_TROPHY_BASE}/v1/npCommunicationIds/${encodeURIComponent(title.npCommunicationId)}/trophyGroups/all/trophies`;
  for (const npServiceName of services) {
    try {
      const metaData = await getPagedTrophies(accessToken, metaUrl, npServiceName);
      const metaPlatinum = metaData.find((trophy) => isPlatinumTrophy({}, trophy));
      if (metaPlatinum) return platinumFromTitleTrophy(title, sourceUrl, npServiceName, {}, metaPlatinum, true);
    } catch {
      // Keep trying the other trophy service before falling back to title data.
    }
  }
  return null;
}

function fallbackPlatinumForTitle(title, sourceUrl) {
  return applyManualPlatinumOverride(title?.trophyTitleName, {
    title: title?.trophyTitleName || "Platinum game",
    cover: title?.trophyTitleIconUrl || "",
    trophyName: "Platinum",
    earnedAt: title?.lastUpdatedDateTime ? formatPsnDate(title.lastUpdatedDateTime) : "",
    rawEarnedAt: title?.lastUpdatedDateTime || "",
    icon: title?.trophyTitleIconUrl || "",
    platform: title?.trophyTitlePlatform || "",
    npCommunicationId: title?.npCommunicationId || "",
    npServiceName: title?.npServiceName || serviceNameFor(title || {}),
    url: sourceUrl,
    fallback: true,
  });
}

function platinumFromTitleTrophy(title, sourceUrl, npServiceName, earned = {}, meta = {}, fallback = false) {
  const rawEarnedAt = earned.earnedDateTime || title?.lastUpdatedDateTime || "";
  return applyManualPlatinumOverride(title?.trophyTitleName, {
    title: title?.trophyTitleName || "Platinum game",
    cover: title?.trophyTitleIconUrl || "",
    trophyName: meta.trophyName || "Platinum",
    earnedAt: rawEarnedAt ? formatPsnDate(rawEarnedAt) : "",
    rawEarnedAt,
    icon: meta.trophyIconUrl || earned.trophyRewardImageUrl || title?.trophyTitleIconUrl || "",
    platform: title?.trophyTitlePlatform || "",
    npCommunicationId: title?.npCommunicationId || "",
    npServiceName,
    url: sourceUrl,
    ...(fallback ? { fallback: true } : {}),
  });
}

function isPlatinumTrophy(earned = {}, meta = {}) {
  return trophyTypeLabel(earned.trophyType || meta.trophyType) === "Platinum"
    || /\bplatinum\b/i.test([earned.trophyName, meta.trophyName, earned.trophyDetail, meta.trophyDetail].filter(Boolean).join(" "));
}

function applyManualPlatinumOverride(title, item) {
  const override = manualPlatinumOverrideForItem({ ...item, title: title || item?.title });
  return override ? { ...item, trophyName: override.trophyName, icon: override.icon, manualOverride: true } : item;
}

function manualPlatinumOverrideForItem(item = {}) {
  const normalized = normalizePlatinumTitle(item.title);
  if (!normalized) return null;
  const compact = normalizePlatinumCompact(normalized);
  const haystack = normalizePlatinumCompact([
    item.title,
    item.icon,
    item.trophyIcon,
    item.npCommunicationId,
    item.npServiceName,
    item.url,
  ].filter(Boolean).join(" "));
  return MANUAL_PLATINUM_OVERRIDES.find((entry) => {
    if ((entry.ids || []).some((id) => haystack.includes(normalizePlatinumCompact(id)))) return true;
    const includesTerm = (term) => compact.includes(normalizePlatinumCompact(term));
    const hasMatches = entry.match.every(includesTerm);
    const hasExcluded = (entry.exclude || []).some(includesTerm);
    return hasMatches && !hasExcluded;
  }) || null;
}

function normalizePlatinumTitle(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function normalizePlatinumCompact(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
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
