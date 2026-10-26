import { isEditorRequest } from "./editor-auth.js";

const KV_KEY = "gamelist-data";

export async function onRequestGet({ request, env }) {
  if (!env.GAMELIST) return json({ games: [] });
  const stored = await env.GAMELIST.get(KV_KEY, "json");
  const data = stored ? { ...stored, settings: { ...stored.settings, shelfSync: true } } : null;
  if (new URL(request.url).searchParams.get("shelfProjections") === "1") {
    const settings = data?.settings && typeof data.settings === "object" ? data.settings : {};
    const games = (Array.isArray(data?.games) ? data.games : []).filter((game) => (
      !game.deletedAt && !game.completedAt && !game.preorderStore
      && !game.playing && ["wanted", "upcoming"].includes(game.section)
    )).map((game) => ({
      id: game.id, title: game.title, platform: game.platform, section: game.section,
      preorderStore: game.preorderStore || "", digital: Boolean(game.digital), dlc: Boolean(game.dlc),
      cover: game.cover || "", keyArt: game.keyArt || "", trailerUrl: game.trailerUrl || "", releaseDate: game.releaseDate || "", description: game.description || "",
      genres: Array.isArray(game.genres) ? game.genres : [], publisher: game.publisher || "",
      developer: game.developer || "", owners: Array.isArray(game.owners) ? game.owners : [],
      tags: Array.isArray(game.tags) ? game.tags : [], country: game.country || "", storeLinks: game.storeLinks || {},
      prices: publicStorePrices(game.prices), storePrices: publicStorePrices(game.storePrices),
    }));
    return json({ games, settings: {
      shelfSync: true, shelfSyncWishlist: settings.shelfSyncWishlist,
      shelfShowPreorders: settings.shelfShowPreorders, shelfDigitalGames: settings.shelfDigitalGames,
      shelfHidePrices: settings.shelfHidePrices, currency: settings.currency, language: settings.language,
      region: settings.region, stores: Array.isArray(settings.stores) ? settings.stores : [],
      twitchUser: String(settings.twitchUser || ""),
      storeSettingsVersion: settings.storeSettingsVersion,
      defaultOrder: settings.defaultOrder, shelfDefaultOrder: settings.shelfDefaultOrder,
      defaultOwner: settings.defaultOwner,
      theme: settings.theme,
      customTheme: settings.customTheme && typeof settings.customTheme === "object" ? settings.customTheme : {},
    } });
  }
  if (new URL(request.url).searchParams.get("settings") === "1") {
    return json({ settings: data?.settings || {} });
  }
  return json(data || { games: [] });
}

function publicStorePrices(value) {
  return Array.isArray(value) ? value.map((item) => ({
    store: String(item?.store || ""), price: String(item?.price || ""),
    numericPrice: Number.isFinite(Number(item?.numericPrice)) ? Number(item.numericPrice) : null,
    url: String(item?.url || ""),
  })).filter((item) => item.store) : [];
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
      settings: { ...body.settings, shelfSync: true },
      updatedAt: new Date().toISOString(),
    }));
    return json({ ok: true });
  }
  if (!body || !Array.isArray(body.games)) {
    return json({ error: "Expected { games: [], settings?: {} }" }, 400);
  }
  const collectionGame = body.collectionGame;
  if (collectionGame) {
    const linked = body.games.find((game) => game.id === collectionGame.gamelistId);
    if (!linked || linked.section !== "backlog" || linked.deletedAt || !collectionGame.id
      || linked.shelfId !== collectionGame.id
      || ((linked.digital || linked.dlc) && body.settings?.shelfDigitalGames !== true)) {
      return json({ error: "Invalid collection addition" }, 400);
    }
  }
  await env.GAMELIST.put(KV_KEY, JSON.stringify({
    games: body.games,
    settings: { ...(body.settings && typeof body.settings === "object" ? body.settings : {}), shelfSync: true },
    updatedAt: new Date().toISOString(),
  }));
  await syncBacklogGamesToShelf(env, body.games, collectionGame);
  return json({ ok: true });
}

async function syncBacklogGamesToShelf(env, allGames, collectionGame = null) {
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
  const overrides = { ...shelf.overrides };
  const additions = [];
  if (collectionGame) {
    const sourceIndex = sourceGames.findIndex((game) => game.id === collectionGame.id);
    const existingIndex = shelfGames.findIndex((game) => game.id === collectionGame.id || game.gamelistId === collectionGame.gamelistId);
    if (sourceIndex >= 0) {
      sourceGames[sourceIndex] = { ...sourceGames[sourceIndex], ...collectionGame };
      overrides[collectionGame.id] = { ...overrides[collectionGame.id], ...collectionGame };
    } else if (existingIndex >= 0) shelfGames[existingIndex] = { ...shelfGames[existingIndex], ...collectionGame };
    else additions.push(collectionGame);
    changed = true;
  }
  if (!additions.length && !changed) return;
  await env.GAMELIST.put("shelf-data", JSON.stringify({
    ...shelf,
    sourceGames,
    games: [...additions, ...shelfGames],
    overrides,
    layout: shelf.layout || null,
    favoriteGameIds: Array.isArray(shelf.favoriteGameIds) ? shelf.favoriteGameIds.slice(0, 5) : [],
    updatedAt: new Date().toISOString(),
  }));
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
