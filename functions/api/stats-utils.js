export function json(data, status = 200, cache = false) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": cache ? "public, max-age=3600" : "no-store",
    },
  });
}

export async function cachedStats({ request, env, key, producer, cacheSeconds = 60 * 60 }) {
  const url = new URL(request.url);
  const cacheKey = statsCacheKey(key, url);
  const canCache = Boolean(env?.GAMELIST);
  if (canCache && url.searchParams.get("refresh") !== "1") {
    const cached = await env.GAMELIST.get(cacheKey, "json").catch(() => null);
    if (cached?.expiresAt && cached.expiresAt > Date.now() && cached.payload) {
      return json(cached.payload, cached.status || 200, true);
    }
  }
  const payload = await producer();
  if (canCache) {
    await env.GAMELIST.put(cacheKey, JSON.stringify({
      payload,
      status: 200,
      cachedAt: new Date().toISOString(),
      expiresAt: nextCacheHour(),
    }), { expirationTtl: cacheSeconds * 2 }).catch(() => {});
  }
  return json(payload, 200, true);
}

function statsCacheKey(key, url) {
  const hour = currentCacheHour();
  const params = [...url.searchParams.entries()]
    .filter(([name]) => name !== "refresh")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, value]) => `${name}=${value}`)
    .join("&");
  return `stats-cache:${key}:${hour}:${params}`.slice(0, 512);
}

function currentCacheHour() {
  return new Date().toISOString().slice(0, 13);
}

function nextCacheHour() {
  const date = new Date();
  date.setUTCMinutes(0, 0, 0);
  date.setUTCHours(date.getUTCHours() + 1);
  return date.getTime();
}

export function gameSummary(game = {}) {
  return {
    id: game.id || "",
    title: game.title || game.name || "",
    platform: game.platform || "",
    section: game.section || "",
    completedAt: game.completedAt || "",
    startedAt: game.startedAt || "",
    cover: game.cover || "",
    owners: Array.isArray(game.owners) ? game.owners : [],
    tags: Array.isArray(game.tags) ? game.tags : [],
  };
}

export function yearFromDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return String(date.getUTCFullYear());
}

export function latestDate(items, field = "rawEarnedAt") {
  return items
    .map((item) => String(item?.[field] || item?.earnedAt || ""))
    .filter(Boolean)
    .sort((a, b) => Date.parse(b) - Date.parse(a))[0] || "";
}

export function groupByYear(items, getDate, mapItem = (item) => item) {
  const groups = new Map();
  for (const item of items) {
    const year = yearFromDate(getDate(item));
    const key = year || "unknown";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(mapItem(item));
  }
  return [...groups.entries()]
    .map(([year, grouped]) => ({ year, count: grouped.length, items: grouped }))
    .sort(compareYearGroups);
}

export function countByYear(items, getDate, extra = () => ({})) {
  return groupByYear(items, getDate).map((group) => ({
    year: group.year,
    count: group.count,
    ...extra(group.items, group.year),
  }));
}

export function compareYearGroups(a, b) {
  if (a.year === "unknown") return 1;
  if (b.year === "unknown") return -1;
  return String(b.year).localeCompare(String(a.year));
}

export function sortByDateDesc(items, field = "rawEarnedAt") {
  return [...items].sort((a, b) => Date.parse(b?.[field] || b?.earnedAt || "") - Date.parse(a?.[field] || a?.earnedAt || ""));
}

export async function responseJson(response) {
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Invalid JSON response (${response.status})`);
  }
  if (!response.ok) throw new Error(data?.error || `Request failed (${response.status})`);
  return data || {};
}

export function apiUrl(request, pathname, params = {}) {
  const source = new URL(request.url);
  const url = new URL(pathname, source.origin);
  for (const [key, value] of source.searchParams.entries()) {
    if (!["cursor", "limit", "appId", "titleId", "id", "service"].includes(key)) url.searchParams.set(key, value);
  }
  for (const [key, value] of Object.entries(params)) {
    if (value != null && value !== "") url.searchParams.set(key, String(value));
  }
  return url;
}

export async function inChunks(items, size, mapper) {
  const results = [];
  for (let index = 0; index < items.length; index += size) {
    const chunk = items.slice(index, index + size);
    const settled = await Promise.allSettled(chunk.map(mapper));
    results.push(...settled.filter((item) => item.status === "fulfilled").map((item) => item.value));
  }
  return results;
}
