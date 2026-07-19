import { onRequestGet as psnActivity } from "./achievements.js";
import { onRequestGet as psnTrophies } from "./trophies.js";
import { apiUrl, cachedStats, countByYear, inChunks, responseJson, sortByDateDesc } from "./stats-utils.js";

export async function onRequestGet({ request, env = {} }) {
  return cachedStats({ request, env, key: "psn-trophies-by-year", producer: async () => {
    const activity = await responseJson(await psnActivity({ request: new Request(apiUrl(request, "/api/achievements")), env }));
    const games = (Array.isArray(activity.games) ? activity.games : []).filter((game) => game.npCommunicationId);
    const trophyGroups = await inChunks(games, 5, async (game) => {
      const url = apiUrl(request, "/api/trophies", { id: game.npCommunicationId, service: game.npServiceName });
      const data = await responseJson(await psnTrophies({ request: new Request(url), env }));
      return (Array.isArray(data.trophies) ? data.trophies : [])
        .filter((trophy) => trophy.earned)
        .map((trophy) => ({ ...trophy, game: game.title, npCommunicationId: game.npCommunicationId, platform: game.rarity, source: "psn" }));
    });
    const earnedTrophies = trophyGroups.flat();
    const platinums = Array.isArray(activity.platinums) ? activity.platinums : [];

    return {
      source: "psn",
      user: activity.user || "",
      trophiesByYear: countByYear(earnedTrophies, (trophy) => trophy.rawEarnedAt, (items) => ({
        games: new Set(items.map((item) => item.npCommunicationId).filter(Boolean)).size,
        platinum: items.filter((item) => String(item.type || item.title || "").toLowerCase().includes("platinum")).length,
        gold: items.filter((item) => String(item.type || "").toLowerCase() === "gold").length,
        silver: items.filter((item) => String(item.type || "").toLowerCase() === "silver").length,
        bronze: items.filter((item) => String(item.type || "").toLowerCase() === "bronze").length,
      })),
      platinumsByYear: countByYear(platinums, (platinum) => platinum.rawEarnedAt),
      platinums: sortByDateDesc(platinums),
      totalTrophies: earnedTrophies.length,
      totalPlatinums: platinums.length,
    };
  } });
}
