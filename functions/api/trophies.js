import { getPsnAccessToken } from "./psn-auth.js";

const PSN_TROPHY_BASE = "https://m.np.playstation.com/api/trophy";
const PSN_CACHE_SECONDS = 60 * 60;
const PSN_SEARCH_BASE = "https://m.np.playstation.com/api/search";
const PSN_LEGACY_USER_BASE = "https://us-prof.np.community.playstation.net/userProfile/v1/users";

export async function onRequestGet({ request, env = {} }) {
  const url = new URL(request.url);
  const npCommunicationId = cleanNpCommunicationId(url.searchParams.get("id"));
  const npServiceName = cleanServiceName(url.searchParams.get("service"));
  const user = cleanUser(url.searchParams.get("user") || env.PSN_PROFILE_USER || "");
  const debug = url.searchParams.has("debug");

  if (!npCommunicationId) {
    return json({ trophies: [], error: "Missing PSN trophy title id" }, 400, { cache: false });
  }

  const npsso = cleanNpsso(env.PSN_NPSSO);
  if (!npsso) {
    return json({ trophies: [], needsSetup: true }, 200, { cache: false });
  }

  try {
    const accessToken = await getPsnAccessToken(npsso);
    const accountId = await resolvePsnAccountId(accessToken, user);
    const trophies = await getEarnedTrophiesForTitle(accessToken, accountId, npCommunicationId, npServiceName);
    return json({ trophies, count: trophies.length, source: "psn", accountId });
  } catch (error) {
    console.error("[trophies] PSN trophies request failed", {
      npCommunicationId,
      npServiceName,
      message: error?.message || "Unknown trophy API error",
    });
    return json({
      trophies: [],
      authError: true,
      ...(debug ? { debug: error?.message || "PSN trophies request failed" } : {}),
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

async function getEarnedTrophiesForTitle(accessToken, accountId, npCommunicationId, npServiceName) {
  const [earnedData, metaData] = await Promise.all([
    getPagedTrophies(accessToken, `${PSN_TROPHY_BASE}/v1/users/${encodeURIComponent(accountId || "me")}/npCommunicationIds/${encodeURIComponent(npCommunicationId)}/trophyGroups/all/trophies`, npServiceName),
    getPagedTrophies(accessToken, `${PSN_TROPHY_BASE}/v1/npCommunicationIds/${encodeURIComponent(npCommunicationId)}/trophyGroups/all/trophies`, npServiceName),
  ]);
  const metaById = new Map(metaData.map((trophy) => [String(trophy.trophyId), trophy]));
  const earnedById = new Map(earnedData.map((trophy) => [String(trophy.trophyId), trophy]));
  const metaIds = metaData.map((trophy) => String(trophy.trophyId));
  const trophyIds = [
    ...metaIds,
    ...earnedData.map((trophy) => String(trophy.trophyId)).filter((id) => !metaById.has(id)),
  ];
  return trophyIds
    .map((id, index) => {
      const meta = metaById.get(id) || {};
      const earned = earnedById.get(id) || {};
      const type = trophyTypeLabel(meta.trophyType || earned.trophyType);
      return {
        trophyId: Number(id),
        order: index,
        title: meta.trophyName || type,
        description: meta.trophyDetail || "",
        earned: Boolean(earned.earned),
        earnedAt: earned.earnedDateTime ? formatPsnDate(earned.earnedDateTime) : "",
        rawEarnedAt: earned.earnedDateTime || "",
        rarity: earned.trophyEarnedRate ? `${earned.trophyEarnedRate}%` : (meta.trophyRare ? `${meta.trophyRare}%` : ""),
        type,
        icon: meta.trophyIconUrl || earned.trophyRewardImageUrl || "",
      };
    });
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

function cleanNpsso(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  try {
    const parsed = JSON.parse(text);
    if (parsed?.npsso) return cleanNpsso(parsed.npsso);
  } catch {}
  const cookieMatch = text.match(/(?:^|;\s*)npsso=([^;\s]+)/i);
  if (cookieMatch) return cookieMatch[1].trim();
  return text.replace(/^npsso=/i, "").trim();
}

function cleanNpCommunicationId(value) {
  return String(value || "").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 64);
}

function cleanUser(value) {
  return String(value || "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 32);
}

function cleanServiceName(value) {
  const service = String(value || "").toLowerCase();
  return service === "trophy2" ? "trophy2" : "trophy";
}

function trophyTypeLabel(value) {
  const text = String(value || "").toLowerCase();
  return text ? text[0].toUpperCase() + text.slice(1) : "Trophy";
}

function formatPsnDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function json(payload, status = 200, { cache = true } = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": cache ? `public, max-age=${PSN_CACHE_SECONDS}` : "no-store",
    },
  });
}
