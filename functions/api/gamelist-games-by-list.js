import { gameSummary, json } from "./stats-utils.js";

const KV_KEY = "gamelist-data";

export async function onRequestGet({ env }) {
  if (!env.GAMELIST) return json({ source: "gamelist", lists: [], total: 0 });
  const data = await env.GAMELIST.get(KV_KEY, "json") || { games: [] };
  const games = (Array.isArray(data.games) ? data.games : []).filter((game) => !game.deletedAt);
  const grouped = new Map();
  for (const game of games) {
    const key = String(game.section || "uncategorized").trim() || "uncategorized";
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(gameSummary(game));
  }
  const lists = [...grouped.entries()]
    .map(([list, items]) => ({ list, label: listLabel(list), count: items.length, games: items.sort(compareTitles) }))
    .sort((a, b) => listOrder(a.list) - listOrder(b.list) || a.label.localeCompare(b.label));
  return json({ source: "gamelist", lists, total: games.length, updatedAt: data.updatedAt || "" });
}

function listLabel(value) {
  const labels = { new: "New additions", backlog: "Backlog", upcoming: "Upcoming", preorder: "Preorders", completed: "Completed" };
  return labels[value] || value.replace(/[-_]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function listOrder(value) {
  return ["new", "backlog", "upcoming", "preorder", "completed", "uncategorized"].indexOf(value) + 1 || 99;
}

function compareTitles(a, b) {
  return String(a.title).localeCompare(String(b.title));
}
