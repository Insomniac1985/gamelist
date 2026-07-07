import { json } from "./stats-utils.js";

const KV_KEY = "shelf-data";

export async function onRequestGet({ env }) {
  if (!env.GAMELIST) return json({ source: "shelf", games: [], platforms: [], totalGames: 0 });
  const data = await env.GAMELIST.get(KV_KEY, "json") || { sourceGames: [], games: [] };
  const sourceGames = (Array.isArray(data.sourceGames) ? data.sourceGames : []).map((game) => shelfGameSummary(game, "source"));
  const games = (Array.isArray(data.games) ? data.games : []).map((game) => shelfGameSummary(game, "collection"));
  const allGames = [...sourceGames, ...games].filter((game) => game.title);
  const platforms = [...platformGroups(allGames).values()]
    .map((items) => ({ platform: items[0].platform || "Unknown", count: items.length, games: items.sort(compareTitles) }))
    .sort((a, b) => b.count - a.count || a.platform.localeCompare(b.platform));
  return json({
    source: "shelf",
    games: allGames.sort(compareTitles),
    platforms,
    totalGames: allGames.length,
    totalPlatforms: platforms.length,
    updatedAt: data.updatedAt || "",
  });
}

function shelfGameSummary(game = {}, origin) {
  return {
    id: game.id || "",
    title: game.title || "",
    platform: game.platform || "",
    country: game.country || "",
    region: game.region || "",
    category: game.category || "",
    condition: conditionLabel(game),
    owners: Array.isArray(game.owners) ? game.owners : [],
    cover: game.cover || "",
    source: origin,
    gamelistId: game.gamelistId || "",
  };
}

function platformGroups(games) {
  const groups = new Map();
  for (const game of games) {
    const key = String(game.platform || "Unknown").trim().toLowerCase();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(game);
  }
  return groups;
}

function conditionLabel(game = {}) {
  if (game.sealed) return "Sealed";
  const parts = ["game", "box", "manual", "other"].filter((key) => game[key]);
  if (parts.length >= 4) return "Complete +";
  if (game.game && game.box && game.manual) return "Complete";
  if (game.game && game.box) return "Game + Box";
  if (game.game) return "Loose";
  return "";
}

function compareTitles(a, b) {
  return String(a.title).localeCompare(String(b.title));
}
