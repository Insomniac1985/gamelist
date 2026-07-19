import { isEditorRequest } from "./editor-auth.js";

const KV_KEY = "gamelist-data";

export async function onRequestGet({ request, env }) {
  if (!env.GAMELIST) return json({ games: [] });
  const data = await env.GAMELIST.get(KV_KEY, "json");
  if (new URL(request.url).searchParams.get("settings") === "1") {
    return json({ settings: data?.settings || {} });
  }
  return json(data || { games: [] });
}

export async function onRequestPut({ request, env }) {
  if (!env.GAMELIST) return json({ error: "Missing GAMELIST KV binding" }, 501);
  if (!env.EDIT_PASSWORD) return json({ error: "Missing EDIT_PASSWORD secret" }, 503);
  if (!await isEditorRequest(request, env)) {
    return json({ error: "Unauthorized" }, 401);
  }
  const body = await request.json().catch(() => null);
  if (body?.settingsOnly === true && body.settings && typeof body.settings === "object") {
    const previous = await env.GAMELIST.get(KV_KEY, "json") || { games: [] };
    await env.GAMELIST.put(KV_KEY, JSON.stringify({
      games: Array.isArray(previous.games) ? previous.games : [],
      settings: body.settings,
      updatedAt: new Date().toISOString(),
    }));
    return json({ ok: true });
  }
  if (!body || !Array.isArray(body.games)) {
    return json({ error: "Expected { games: [], settings?: {} }" }, 400);
  }
  const previous = await env.GAMELIST.get(KV_KEY, "json") || { games: [] };
  const previousById = new Map((previous.games || []).map((game) => [game.id, game]));
  const newlyCollected = body.games.filter((game) => (
    game.section === "backlog"
    && !game.digital
    && !game.shelfId
    && !game.deletedAt
    && (!previousById.has(game.id) || previousById.get(game.id)?.section !== "backlog" || previousById.get(game.id)?.digital)
  ));
  await env.GAMELIST.put(KV_KEY, JSON.stringify({
    games: body.games,
    settings: body.settings && typeof body.settings === "object" ? body.settings : {},
    updatedAt: new Date().toISOString(),
  }));
  if (shelfSyncEnabled(body.settings)) await syncBacklogGamesToShelf(env, body.games, newlyCollected);
  return json({ ok: true });
}

function shelfSyncEnabled(settings = {}) {
  return settings?.shelfSync !== false;
}

async function syncBacklogGamesToShelf(env, allGames, games) {
  const shelf = await env.GAMELIST.get("shelf-data", "json") || { sourceGames: [], games: [], overrides: {} };
  const byId = new Map(allGames.map((game) => [game.id, game]));
  let changed = false;
  const syncOwners = (game) => {
    const linked = byId.get(game.gamelistId);
    if (!linked) return game;
    const owners = Array.isArray(linked.owners) ? linked.owners : [];
    if (JSON.stringify(game.owners || []) === JSON.stringify(owners)) return game;
    changed = true;
    return { ...game, owners, updatedAt: new Date().toISOString() };
  };
  const sourceGames = (shelf.sourceGames || []).map(syncOwners);
  const shelfGames = (shelf.games || []).map(syncOwners);
  const all = [...sourceGames, ...shelfGames];
  const known = new Set(all.flatMap((game) => [game.gamelistId, game.id]).filter(Boolean));
  const additions = games.filter((game) => !known.has(game.id)).map((game) => ({
    id: `gamelist-${game.id}`,
    gamelistId: game.id,
    source: "gamelist",
    pendingCollection: true,
    title: game.title,
    platform: game.platform || "Unknown platform",
    country: "World",
    region: "Unconfirmed",
    category: "Gamelist",
    tags: cleanTransferTags(game.tags),
    owners: Array.isArray(game.owners) ? game.owners : [],
    game: true,
    box: false,
    manual: false,
    other: false,
    sealed: false,
    publisher: game.publisher || "",
    developer: game.developer || "",
    genre: (game.genres || []).join(", "),
    cover: game.cover || "",
    releaseDate: game.releaseDate || "",
    description: game.description || "",
    igdbUrl: game.igdbUrl || "",
    storeLinks: game.storeLinks || {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));
  if (!additions.length && !changed) return;
  await env.GAMELIST.put("shelf-data", JSON.stringify({
    ...shelf,
    sourceGames,
    games: [...additions, ...shelfGames].slice(0, 1000),
    overrides: shelf.overrides || {},
    layout: shelf.layout || null,
    favoriteGameIds: Array.isArray(shelf.favoriteGameIds) ? shelf.favoriteGameIds.slice(0, 5) : [],
    updatedAt: new Date().toISOString(),
  }));
}

function cleanTransferTags(tags) {
  return Array.isArray(tags)
    ? tags.filter((tag) => String(tag || "").trim().toLowerCase() !== "gamelist")
    : [];
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
