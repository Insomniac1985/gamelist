import { isEditorRequest } from "./editor-auth.js";
import { syncShelfGamesToBacklog } from "./shelf.js";

const KV_KEY = "shelf-data";
const MAX_GAMES = 1000;

export async function onRequestPost({ request, env }) {
  if (!env.GAMELIST) return json({ error: "Missing GAMELIST KV binding" }, 501);
  if (!env.EDIT_PASSWORD) return json({ error: "Missing EDIT_PASSWORD secret" }, 503);
  if (!await isEditorRequest(request, env)) return json({ error: "Unauthorized" }, 401);

  const body = await request.json().catch(() => null);
  if (!body || (typeof body !== "object" && !Array.isArray(body))) {
    return json({ error: "Expected { games: [] }, { ids: [] }, or { acceptPending: true }" }, 400);
  }

  const incomingGames = Array.isArray(body) ? body : Array.isArray(body.games) ? body.games : [];
  const requestedIds = new Set((Array.isArray(body.ids) ? body.ids : []).map((id) => String(id || "").trim()).filter(Boolean));
  const acceptPending = Boolean(body.acceptPending);
  if (!incomingGames.length && !requestedIds.size && !acceptPending) {
    return json({ error: "No games or pending additions were provided" }, 400);
  }

  const existing = await env.GAMELIST.get(KV_KEY, "json") || {};
  const sourceGames = Array.isArray(existing.sourceGames) ? existing.sourceGames : [];
  const overrides = existing.overrides && typeof existing.overrides === "object" ? existing.overrides : {};
  const favoriteGameIds = Array.isArray(existing.favoriteGameIds) ? existing.favoriteGameIds.slice(0, 5) : [];
  const previousGames = Array.isArray(existing.games) ? existing.games : [];
  const previousIds = new Set([...sourceGames, ...previousGames].map((game) => game?.id).filter(Boolean));
  const now = new Date().toISOString();
  let accepted = 0;
  let updated = 0;

  const games = previousGames.map((game) => {
    if (!game?.pendingCollection) return game;
    if (!acceptPending && !requestedIds.has(game.id)) return game;
    accepted += 1;
    updated += 1;
    return { ...game, pendingCollection: false, updatedAt: now };
  });

  const additions = [];
  const gamesById = new Map(games.map((game, index) => [game.id, index]));
  for (const rawGame of incomingGames) {
    const game = normalizeGame(rawGame, previousIds, now);
    if (!game) continue;
    previousIds.add(game.id);
    if (gamesById.has(game.id)) {
      const index = gamesById.get(game.id);
      games[index] = { ...games[index], ...game, updatedAt: now };
      updated += 1;
    } else {
      additions.push(game);
      gamesById.set(game.id, games.length + additions.length - 1);
    }
  }

  const nextGames = [...additions, ...games].slice(0, MAX_GAMES);
  const data = {
    sourceGames,
    games: nextGames,
    overrides,
    layout: existing.layout || null,
    favoriteGameIds,
    updatedAt: now,
  };

  await env.GAMELIST.put(KV_KEY, JSON.stringify(data));
  await syncShelfGamesToBacklog(env, nextGames, additions);
  return json({ ok: true, added: additions.length, accepted, updated, total: nextGames.length, updatedAt: now });
}

function normalizeGame(rawGame, usedIds, now) {
  if (!rawGame || typeof rawGame !== "object") return null;
  const title = String(rawGame.title || "").trim();
  if (!title) return null;
  const id = uniqueId(String(rawGame.id || "").trim() || slugId(title, rawGame.platform), usedIds);
  return {
    ...rawGame,
    id,
    title,
    platform: String(rawGame.platform || "").trim(),
    country: rawGame.country || rawGame.region || "",
    pendingCollection: false,
    createdAt: rawGame.createdAt || now,
    updatedAt: now,
    recordType: rawGame.recordType || "Owned",
    releaseType: rawGame.releaseType || "Official",
  };
}

function uniqueId(id, usedIds) {
  let value = cleanId(id) || generatedId();
  if (!usedIds.has(value)) return value;
  let index = 2;
  while (usedIds.has(`${value}-${index}`)) index += 1;
  return `${value}-${index}`;
}

function slugId(title, platform) {
  const base = [title, platform].map((value) => String(value || "").trim()).filter(Boolean).join("-");
  return `shelf-api-${base}`;
}

function cleanId(value) {
  return String(value || "").trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

function generatedId() {
  if (globalThis.crypto?.randomUUID) return `shelf-api-${globalThis.crypto.randomUUID()}`;
  return `shelf-api-${Date.now()}`;
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}
