import { gameSummary, groupByYear, json, sortByDateDesc } from "./stats-utils.js";

const KV_KEY = "gamelist-data";

export async function onRequestGet({ env }) {
  if (!env.GAMELIST) return json({ source: "gamelist", years: [], totalCompleted: 0 });
  const data = await env.GAMELIST.get(KV_KEY, "json") || { games: [] };
  const completed = (Array.isArray(data.games) ? data.games : [])
    .filter((game) => !game.deletedAt && game.completedAt)
    .map(gameSummary);
  const years = groupByYear(completed, (game) => game.completedAt, (game) => game)
    .map((year) => ({ ...year, games: sortByDateDesc(year.items, "completedAt"), items: undefined }))
    .map(({ items, ...year }) => year);
  return json({ source: "gamelist", years, totalCompleted: completed.length, updatedAt: data.updatedAt || "" });
}
