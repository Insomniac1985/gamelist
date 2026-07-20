import { isEditorRequest } from "./editor-auth.js";

const KV_KEY = "shelf-data";

export async function onRequestGet({ env }) {
  if (!env.GAMELIST) return json({ sourceGames: [], games: [], overrides: {}, layout: null, favoriteGameIds: [] });
  const [shelf, list] = await Promise.all([
    env.GAMELIST.get(KV_KEY, "json"),
    env.GAMELIST.get("gamelist-data", "json"),
  ]);
  return json(withEffectiveFavoriteGameIds(shelf || { sourceGames: [], games: [], overrides: {}, layout: null, favoriteGameIds: [] }, list));
}

export async function onRequestPut({ request, env }) {
  if (!env.GAMELIST) return json({ error: "Missing GAMELIST KV binding" }, 501);
  if (!env.EDIT_PASSWORD) return json({ error: "Missing EDIT_PASSWORD secret" }, 503);
  if (!await isEditorRequest(request, env)) return json({ error: "Unauthorized" }, 401);
  const body = await request.json().catch(() => null);
  if (body?.favoriteGameIdsOnly === true) {
    if (!validFavoriteGameIds(body.favoriteGameIds)) return json({ error: "Expected { favoriteGameIds: [] }" }, 400);
    const existing = await env.GAMELIST.get(KV_KEY, "json") || {};
    const data = {
      ...existing,
      sourceGames: Array.isArray(existing.sourceGames) ? existing.sourceGames : [],
      games: Array.isArray(existing.games) ? existing.games : [],
      overrides: existing.overrides && typeof existing.overrides === "object" ? existing.overrides : {},
      layout: validLayout(existing.layout) ? existing.layout : null,
      favoriteGameIds: body.favoriteGameIds.slice(0, 5),
      updatedAt: new Date().toISOString(),
    };
    await env.GAMELIST.put(KV_KEY, JSON.stringify(data));
    await saveShowcaseFavoriteSettings(env, data.favoriteGameIds);
    return json({ ok: true, updatedAt: data.updatedAt, favoriteGameIds: data.favoriteGameIds });
  }
  if (!body || !Array.isArray(body.games) || !body.overrides || typeof body.overrides !== "object") {
    return json({ error: "Expected { games: [], overrides: {} }" }, 400);
  }
  const existing = await env.GAMELIST.get(KV_KEY, "json") || {};
  const previousIds = new Set([...(existing.sourceGames || []), ...(existing.games || [])].map((game) => game.id));
  const newlyAdded = body.games.filter((game) => !previousIds.has(game.id));
  const sourceGames = Array.isArray(body.sourceGames) ? body.sourceGames.slice(0, 1000) : (Array.isArray(existing.sourceGames) ? existing.sourceGames : []);
  const data = {
    sourceGames,
    games: body.games.slice(0, 1000),
    overrides: body.overrides,
    layout: validLayout(body.layout) ? body.layout : (validLayout(existing.layout) ? existing.layout : null),
    favoriteGameIds: validFavoriteGameIds(body.favoriteGameIds) ? body.favoriteGameIds.slice(0, 5) : (validFavoriteGameIds(existing.favoriteGameIds) ? existing.favoriteGameIds.slice(0, 5) : []),
    updatedAt: new Date().toISOString(),
  };
  await env.GAMELIST.put(KV_KEY, JSON.stringify(data));
  await saveShowcaseFavoriteSettings(env, data.favoriteGameIds);
  await syncShelfGamesToBacklog(env, body.games, newlyAdded);
  return json({ ok: true, updatedAt: data.updatedAt, favoriteGameIds: data.favoriteGameIds });
}

export async function onRequestDelete({ request, env }) {
  if (!env.GAMELIST) return json({ error: "Missing GAMELIST KV binding" }, 501);
  if (!env.EDIT_PASSWORD) return json({ error: "Missing EDIT_PASSWORD secret" }, 503);
  if (!await isEditorRequest(request, env)) return json({ error: "Unauthorized" }, 401);
  const existing = await env.GAMELIST.get(KV_KEY, "json") || {};
  const data = { sourceGames: [], games: [], overrides: {}, layout: validLayout(existing.layout) ? existing.layout : null, favoriteGameIds: [], updatedAt: new Date().toISOString() };
  await env.GAMELIST.put(KV_KEY, JSON.stringify(data));
  return json({ ok: true, updatedAt: data.updatedAt });
}

export async function syncShelfGamesToBacklog(env, allShelfGames, games) {
  const list = await env.GAMELIST.get("gamelist-data", "json") || { games: [], settings: {} };
  if (list.settings?.shelfSync === false) return;
  const shelfById = new Map(allShelfGames.map((game) => [game.id, game]));
  let changed = false;
  const listGames = (list.games || []).map((game) => {
    const linked = shelfById.get(game.shelfId);
    if (!linked) return game;
    const owners = Array.isArray(linked.owners) ? linked.owners : [];
    const trophyName = linked.trophyName || "";
    if (JSON.stringify(game.owners || []) === JSON.stringify(owners) && String(game.trophyName || "") === trophyName) return game;
    changed = true;
    return { ...game, owners, trophyName, updatedAt: new Date().toISOString() };
  });
  const known = new Set(listGames.flatMap((game) => [game.shelfId, game.id]).filter(Boolean));
  const additions = games.filter((game) => !game.gamelistId && !known.has(game.id)).map((game) => ({
    id: `shelf-${game.id}`,
    shelfId: game.id,
    title: game.title,
    trophyName: game.trophyName || "",
    platform: shortPlatform(game.platform),
    section: "new",
    digital: false,
    playing: false,
    platinum: false,
    completedAt: "",
    owners: Array.isArray(game.owners) ? game.owners : [],
    statuses: [],
    tags: cleanTransferTags(game.tags),
    genres: String(game.genre || "").split(",").map((value) => value.trim()).filter(Boolean),
    publisher: game.publisher || "",
    developer: game.developer || "",
    cover: game.cover || "",
    releaseDate: game.releaseDate || "",
    description: game.description || "",
    igdbUrl: game.igdbUrl || "",
    storeLinks: game.storeLinks || {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    order: 0,
  }));
  if (!additions.length && !changed) return;
  await env.GAMELIST.put("gamelist-data", JSON.stringify({
    games: [...additions, ...listGames],
    settings: list.settings || {},
    updatedAt: new Date().toISOString(),
  }));
}

function cleanTransferTags(tags) {
  return Array.isArray(tags)
    ? tags.filter((tag) => String(tag || "").trim().toLowerCase() !== "gamelist")
    : [];
}

function shortPlatform(value) {
  const clean = String(value || "").trim();
  return ({
    "Sony PlayStation": "PS1", "Sony PlayStation 2": "PS2", "Sony PlayStation 3": "PS3",
    "Sony PlayStation 4": "PS4", "Sony PlayStation 5": "PS5", "Nintendo Switch": "Switch",
    "Nintendo Switch 2": "Switch 2", "Nintendo DS": "DS", "Nintendo 3DS": "3DS", "Nintendo 64": "N64",
  })[clean] || clean;
}

function validLayout(value) {
  return Boolean(value && Array.isArray(value.order) && Array.isArray(value.hidden));
}

function validFavoriteGameIds(value) {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function withEffectiveFavoriteGameIds(shelf, list) {
  const settings = list?.settings && typeof list.settings === "object" ? list.settings : {};
  if (Object.prototype.hasOwnProperty.call(settings, "shelfShowcaseFavoriteGameIds")) {
    return {
      ...shelf,
      favoriteGameIds: validFavoriteGameIds(settings.shelfShowcaseFavoriteGameIds)
        ? settings.shelfShowcaseFavoriteGameIds.slice(0, 5)
        : [],
    };
  }
  return {
    ...shelf,
    favoriteGameIds: validFavoriteGameIds(shelf?.favoriteGameIds) ? shelf.favoriteGameIds.slice(0, 5) : [],
  };
}

async function saveShowcaseFavoriteSettings(env, favoriteGameIds) {
  const list = await env.GAMELIST.get("gamelist-data", "json") || { games: [], settings: {} };
  const settings = list.settings && typeof list.settings === "object" ? list.settings : {};
  await env.GAMELIST.put("gamelist-data", JSON.stringify({
    ...list,
    games: Array.isArray(list.games) ? list.games : [],
    settings: { ...settings, shelfShowcaseFavoriteGameIds: favoriteGameIds.slice(0, 5) },
    updatedAt: new Date().toISOString(),
  }));
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}
