import { isEditorRequest } from "./editor-auth.js";
import { onRequestGet as searchMetadata } from "./search.js";
import { onRequestGet as collectionPrice } from "./collection-price.js";

const KV_KEY = "shelf-data";
const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

export async function onRequestPost({ request, env }) {
  if (!env.GAMELIST) return json({ error: "Missing GAMELIST KV binding" }, 501);
  if (!env.EDIT_PASSWORD) return json({ error: "Missing EDIT_PASSWORD secret" }, 503);
  if (!await isEditorRequest(request, env)) return json({ error: "Unauthorized" }, 401);

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return json({ error: "Expected { all: true } or { ids: [] }" }, 400);
  }

  const ids = new Set((Array.isArray(body.ids) ? body.ids : []).map((id) => String(id || "").trim()).filter(Boolean));
  if (!body.all && !ids.size) return json({ error: "Provide all: true or ids: []" }, 400);

  const options = {
    igdb: body.igdb !== false,
    pricecharting: body.pricecharting !== false,
    overwrite: Boolean(body.overwrite),
    includePending: Boolean(body.includePending),
    limit: Math.min(MAX_LIMIT, Math.max(1, Number(body.limit) || DEFAULT_LIMIT)),
  };
  if (!options.igdb && !options.pricecharting) return json({ error: "Enable igdb or pricecharting" }, 400);

  const data = await env.GAMELIST.get(KV_KEY, "json") || {};
  const list = await env.GAMELIST.get("gamelist-data", "json").catch(() => null) || {};
  const settings = normalizePriceSettings(list.settings || {});
  const sourceGames = Array.isArray(data.sourceGames) ? data.sourceGames : [];
  const games = Array.isArray(data.games) ? data.games : [];
  const overrides = data.overrides && typeof data.overrides === "object" ? { ...data.overrides } : {};
  const candidates = [
    ...sourceGames.map((game, index) => ({ kind: "source", index, game: { ...game, ...(overrides[game.id] || {}) } })),
    ...games.map((game, index) => ({ kind: "game", index, game })),
  ].filter(({ game }) => game?.title && (body.all || ids.has(game.id)) && (options.includePending || !game.pendingCollection));

  const selected = candidates.slice(0, options.limit);
  let updated = 0;
  const errors = [];

  for (const item of selected) {
    try {
      const hydrated = await hydrateGame(item.game, options, settings, env);
      if (!changed(item.game, hydrated)) continue;
      updated += 1;
      if (item.kind === "source") overrides[item.game.id] = stripRuntimeFields(hydrated);
      else games[item.index] = stripRuntimeFields(hydrated);
    } catch (error) {
      errors.push({ id: item.game.id, title: item.game.title, error: error?.message || "Metadata unavailable" });
    }
  }

  const now = new Date().toISOString();
  await env.GAMELIST.put(KV_KEY, JSON.stringify({
    sourceGames,
    games,
    overrides,
    layout: data.layout || null,
    favoriteGameIds: Array.isArray(data.favoriteGameIds) ? data.favoriteGameIds.slice(0, 5) : [],
    updatedAt: now,
  }));

  return json({ ok: true, processed: selected.length, updated, errors, remaining: Math.max(0, candidates.length - selected.length), updatedAt: now });
}

async function hydrateGame(game, options, settings, env) {
  let next = { ...game };
  const [igdb, physical] = await Promise.allSettled([
    options.igdb ? fetchGameMetadata(next, env) : null,
    options.pricecharting ? fetchPhysicalMetadata(next, settings, env) : null,
  ]);
  if (igdb.status === "fulfilled" && igdb.value) next = mergeIgdb(next, igdb.value, options);
  if (physical.status === "fulfilled" && physical.value) next = mergePhysical(next, physical.value, options);
  next.updatedAt = changed(game, next) ? new Date().toISOString() : game.updatedAt;
  return next;
}

async function fetchGameMetadata(game, env) {
  for (const query of metadataQueries(game.title)) {
    const url = new URL("https://local/api/search");
    url.searchParams.set("q", query);
    const response = await searchMetadata({ request: new Request(url), env });
    const data = response.ok ? await response.json() : { results: [] };
    const result = bestTitleMatch(game.title, data.results || []);
    if (result) return result;
  }
  return null;
}

async function fetchPhysicalMetadata(game, settings, env) {
  const direct = await fetchCollectionPriceData(game, settings, env).catch(() => null);
  if (direct) return direct;
  const result = await findPhysicalResult(game, settings, env);
  if (!result) return null;
  return fetchCollectionPriceData({ ...game, pricechartingId: result.url || result.productId || "" }, settings, env).catch(() => null);
}

async function fetchCollectionPriceData(game, settings, env) {
  const response = await collectionPrice({ request: new Request(`https://local/api/collection-price?${collectionPriceParams(game, settings)}`), env });
  const data = await response.json();
  return response.ok && !data.error && hasPriceValue(data) ? data : null;
}

async function findPhysicalResult(game, settings, env) {
  const selectedPlatform = shortPlatform(game.platform);
  const results = [];
  for (const title of physicalQueries(game.title)) {
    for (const platform of [selectedPlatform, ""]) {
      const params = new URLSearchParams({ mode: "search", title, region: game.country || game.region || settings.region, currency: settings.currency });
      if (platform) params.set("platform", platform);
      const response = await collectionPrice({ request: new Request(`https://local/api/collection-price?${params}`), env });
      const data = response.ok ? await response.json() : { results: [] };
      results.push(...(data.results || []));
    }
  }
  return uniquePhysicalResults(results)
    .map((result) => ({ result, score: titleScore(game.title, result.productName || result.title) + (selectedPlatform && normalize(result.consoleName).includes(normalize(selectedPlatform)) ? 0.08 : 0) }))
    .filter(({ score }) => score >= 1)
    .sort((a, b) => b.score - a.score)[0]?.result || null;
}

function mergeIgdb(game, data, options) {
  const next = { ...game };
  setField(next, "cover", data.cover, options);
  setField(next, "releaseDate", data.releaseDate, options);
  setField(next, "publisher", data.publisher, options);
  setField(next, "developer", data.developer, options);
  setField(next, "genre", (data.genres || []).join(", "), options);
  setField(next, "description", data.description, options);
  setField(next, "igdbUrl", data.igdbUrl, options);
  setField(next, "trailerUrl", data.trailerUrl, options);
  setField(next, "lengthHours", data.lengthHours, options);
  next.storeLinks = mergeStoreLinks(next.storeLinks, data.storeLinks, options);
  if (data.hltbId) next.hltbId = data.hltbId;
  if (data.igdbId) next.igdbId = data.igdbId;
  return next;
}

function mergePhysical(game, data, options) {
  const next = { ...game };
  setField(next, "releaseDate", data.releaseDate, options);
  setField(next, "upc", data.upc, options);
  setField(next, "sku", data.sku, options);
  setField(next, "asin", data.asin, options);
  setField(next, "epid", data.epid, options);
  setField(next, "genre", data.genre, options);
  setField(next, "publisher", data.publisher, options);
  setField(next, "developer", data.developer, options);
  if (data.productUrl || data.productId) setField(next, "pricechartingId", data.productUrl || data.productId, options);
  const key = collectionPriceKey(next);
  const value = data.prices?.[key] ?? data.mainValue;
  if (Number.isFinite(Number(value)) && Number(value) > 0) {
    next.collectionPrices = mergeCollectionPrices(next.collectionPrices, data.prices, options);
    if (options.overwrite || !Number.isFinite(Number(next.price)) || Number(next.price) <= 0) next.price = Number(value);
    setField(next, "priceCurrency", data.currency || settingsCurrencyFallback(data), options);
    setField(next, "collectionProductUrl", data.productUrl || priceChartingPageUrl(next.pricechartingId), options);
    if (options.overwrite || !next.priceFetchedAt) next.priceFetchedAt = data.checkedAt || new Date().toISOString();
  }
  return next;
}

function setField(target, key, value, { overwrite }) {
  if (value == null || value === "") return;
  if (overwrite || target[key] == null || target[key] === "" || (Array.isArray(target[key]) && !target[key].length)) target[key] = value;
}

function mergeStoreLinks(existing, incoming, options) {
  const next = existing && typeof existing === "object" ? { ...existing } : {};
  for (const [key, value] of Object.entries(incoming || {})) setField(next, key, value, options);
  return next;
}

function mergeCollectionPrices(existing, incoming, options) {
  const next = existing && typeof existing === "object" ? { ...existing } : {};
  for (const [key, value] of Object.entries(incoming || {})) {
    if (!Number.isFinite(Number(value)) || Number(value) <= 0) continue;
    if (options.overwrite || !Number.isFinite(Number(next[key])) || Number(next[key]) <= 0) next[key] = value;
  }
  return next;
}

function metadataQueries(title) {
  const plain = String(title || "").trim();
  const withoutBrackets = plain.replace(/\s*[\[(][^\])]*(?:edition|collector|collectors|limited|special|deluxe|agent|day one|steelbook)[^\])]*[\])]\s*/gi, " ").trim();
  const withoutEdition = withoutBrackets.replace(/\s+(?:special|collector'?s?|limited|deluxe|complete|ultimate|definitive|premium|gold|standard|day one|steelbook)(?:\s+\w+){0,3}\s+edition\s*$/i, "").trim();
  return [...new Set([plain, withoutBrackets, withoutEdition].filter(Boolean))];
}

function physicalQueries(title) {
  const normalized = normalize(title);
  return [...new Set([title, normalized, normalized.replace(/\bversion\b/g, " "), normalized.replace(/\bcollectors\b/g, "collector").replace(/\bspecial\b/g, "deluxe")].map((value) => String(value || "").trim()).filter(Boolean))];
}

function collectionPriceParams(game, settings) {
  const params = new URLSearchParams({ title: game.title || "", platform: shortPlatform(game.platform), region: game.country || game.region || settings.region, currency: settings.currency });
  const priceChartingValue = String(game.pricechartingId || "").trim();
  const productUrl = priceChartingPageUrl(priceChartingValue);
  const productId = productUrl ? "" : priceChartingValue.replace(/[^a-zA-Z0-9_-]/g, "");
  if (productUrl) params.set("url", productUrl);
  else if (productId) params.set("id", productId);
  else if (game.upc) params.set("upc", game.upc);
  return params;
}

function bestTitleMatch(title, results) {
  return (results || [])
    .map((result) => ({ result, score: titleScore(title, result.title) }))
    .filter(({ score }) => score >= 0.62)
    .sort((a, b) => b.score - a.score)[0]?.result || null;
}

function titleScore(wanted, found) {
  const a = normalize(wanted);
  const b = normalize(found);
  if (!a || !b) return 0;
  if (a === b) return 1.55;
  const tokens = a.split(" ").filter((token) => token.length > 1 && !["of", "the", "and"].includes(token));
  return tokens.filter((token) => b.includes(token)).length / Math.max(1, tokens.length) + (b.startsWith(a) ? 0.28 : 0);
}

function uniquePhysicalResults(results) {
  const seen = new Set();
  return results.filter((result) => {
    const key = String(result.productId || result.url || `${result.consoleName}:${result.productName}`).trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizePriceSettings(settings) {
  return {
    region: settings.region || "ES",
    currency: ["EUR", "USD"].includes(String(settings.currency || "").toUpperCase()) ? String(settings.currency).toUpperCase() : "EUR",
  };
}

function collectionPriceKey(game) {
  if (game.sealed) return "sealed";
  if (game.game && game.box) return "complete";
  return "loose";
}

function shortPlatform(value) {
  const clean = String(value || "").trim();
  return ({
    "Sony PlayStation": "PS1", "Sony PlayStation 2": "PS2", "Sony PlayStation 3": "PS3",
    "Sony PlayStation 4": "PS4", "Sony PlayStation 5": "PS5", "Nintendo Switch": "Switch",
    "Nintendo Switch 2": "Switch 2", "Nintendo DS": "DS", "Nintendo 3DS": "3DS", "Nintendo 64": "N64",
  })[clean] || clean;
}

function hasPriceValue(data) {
  return Object.values(data?.prices || {}).some((value) => Number.isFinite(Number(value)) && Number(value) > 0) || Number(data?.mainValue) > 0;
}

function changed(before, after) {
  return JSON.stringify(stripRuntimeFields(before)) !== JSON.stringify(stripRuntimeFields(after));
}

function stripRuntimeFields(game) {
  const { sourceRecord, ...clean } = game || {};
  return clean;
}

function priceChartingPageUrl(value) {
  const match = String(value || "").trim().match(/^https:\/\/www\.pricecharting\.com\/(?:[a-z]{2}\/)?game\/[^?#]+/i);
  return match?.[0] || "";
}

function settingsCurrencyFallback(data) {
  return data.currency || "EUR";
}

function normalize(value) {
  return String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}
