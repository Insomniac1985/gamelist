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
    && !game.shelfId
    && !game.deletedAt
    && (!game.digital && !game.dlc || body.settings?.shelfDigitalGames === true)
    && (!previousById.has(game.id) || previousById.get(game.id)?.section !== "backlog")
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
    const trophyName = linked.trophyName || "";
    const digital = Boolean(linked.digital || linked.dlc);
    const dlc = Boolean(linked.dlc);
    const psPlus = digital && ["PS3", "PS4", "PS5"].includes(linked.platform) && Boolean(linked.psPlus);
    const gamesWithGold = digital && ["X360", "XOne"].includes(linked.platform) && Boolean(linked.gamesWithGold);
    if (JSON.stringify(game.owners || []) === JSON.stringify(owners) && String(game.trophyName || "") === trophyName && Boolean(game.digital) === digital && Boolean(game.dlc) === dlc && Boolean(game.psPlus) === psPlus && Boolean(game.gamesWithGold) === gamesWithGold) return game;
    changed = true;
    return { ...game, owners, trophyName, digital, dlc, psPlus, gamesWithGold, updatedAt: new Date().toISOString() };
  };
  const sourceGames = (shelf.sourceGames || []).map(syncOwners);
  const shelfGames = (shelf.games || []).map(syncOwners);
  const all = [...sourceGames, ...shelfGames];
  const known = new Set(all.flatMap((game) => [game.gamelistId, game.id]).filter(Boolean));
  const additions = games.filter((game) => !known.has(game.id)).map((game) => {
    const digital = Boolean(game.digital || game.dlc);
    return {
      id: `gamelist-${game.id}`,
      gamelistId: game.id,
      source: "gamelist",
      pendingCollection: true,
      digital,
      dlc: Boolean(game.dlc),
      psPlus: digital && ["PS3", "PS4", "PS5"].includes(game.platform) && Boolean(game.psPlus),
      gamesWithGold: digital && ["X360", "XOne"].includes(game.platform) && Boolean(game.gamesWithGold),
      title: game.title,
      trophyName: game.trophyName || "",
      platform: game.platform || "Unknown platform",
      country: digital ? "" : "World",
      region: digital ? "" : "Unconfirmed",
      category: digital ? "Game" : "Gamelist",
      tags: cleanTransferTags(game.tags),
      owners: Array.isArray(game.owners) ? game.owners : [],
      game: !digital,
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
    };
  });
  if (!additions.length && !changed) return;
  await env.GAMELIST.put("shelf-data", JSON.stringify({
    ...shelf,
    sourceGames,
    games: [...additions, ...shelfGames],
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
