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
    && !game.deletedAt
    && (!previousById.has(game.id) || previousById.get(game.id)?.section !== "backlog" || previousById.get(game.id)?.digital)
  ));
  await env.GAMELIST.put(KV_KEY, JSON.stringify({
    games: body.games,
    settings: body.settings && typeof body.settings === "object" ? body.settings : {},
    updatedAt: new Date().toISOString(),
  }));
  await syncBacklogGamesToShelf(env, body.games, newlyCollected);
  return json({ ok: true });
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
    tags: ["Gamelist", ...(game.tags || [])],
    owners: Array.isArray(game.owners) ? game.owners : [],
    game: true,
    box: false,
    manual: false,
    other: false,
    sealed: false,
    ownership: "Loose",
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
    sourceGames,
    games: [...additions, ...shelfGames].slice(0, 1000),
    overrides: shelf.overrides || {},
    layout: shelf.layout || null,
    updatedAt: new Date().toISOString(),
  }));
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
