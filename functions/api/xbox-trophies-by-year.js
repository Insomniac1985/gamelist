import { onRequestGet as xboxAchievements } from "./xbox-achievements.js";
import { apiUrl, cachedStats, countByYear, inChunks, latestDate, responseJson, sortByDateDesc } from "./stats-utils.js";

export async function onRequestGet({ request, env = {} }) {
  return cachedStats({ request, env, key: "xbox-trophies-by-year", producer: async () => {
    const data = await responseJson(await xboxAchievements({ request: new Request(apiUrl(request, "/api/xbox-achievements")), env }));
    const games = Array.isArray(data.games) ? data.games : [];
    const detailedGames = await inChunks(games.filter((game) => game.titleId && game.earned > 0), 6, async (game) => {
      const url = apiUrl(request, "/api/xbox-achievements", { titleId: game.titleId });
      const detail = await responseJson(await xboxAchievements({ request: new Request(url), env }));
      return { ...game, achievements: Array.isArray(detail.achievements) ? detail.achievements : [] };
    });
    const byTitleId = new Map(detailedGames.map((game) => [String(game.titleId), game]));
    const mergedGames = games.map((game) => byTitleId.get(String(game.titleId)) || game);
    const earnedAchievements = mergedGames.flatMap((game) => (Array.isArray(game.achievements) ? game.achievements : [])
      .filter((achievement) => achievement.earned)
      .map((achievement) => ({ ...achievement, game: game.title, titleId: game.titleId, platform: game.platform, source: "xbox" })));
    const completedGames = mergedGames
      .map((game) => {
        const achievements = Array.isArray(game.achievements) ? game.achievements : [];
        const earned = achievements.filter((achievement) => achievement.earned);
        const total = achievements.length || Number(game.total || 0);
        if (!total || Number(game.earned || earned.length) < total) return null;
        const rawEarnedAt = latestDate(earned) || "";
        return { title: game.title, titleId: game.titleId, platform: game.platform, earned: Number(game.earned || earned.length), total, rawEarnedAt, earnedAt: rawEarnedAt, source: "xbox" };
      })
      .filter(Boolean);

    return {
      source: "xbox",
      user: data.user || "",
      trophiesByYear: countByYear(earnedAchievements, (achievement) => achievement.rawEarnedAt, (items) => ({
        gamerscore: items.reduce((sum, item) => sum + Number(item.gamerscore || 0), 0),
        games: new Set(items.map((item) => item.titleId).filter(Boolean)).size,
      })),
      completedGamesByYear: countByYear(completedGames, (game) => game.rawEarnedAt),
      completedGames: sortByDateDesc(completedGames),
      totalTrophies: earnedAchievements.length,
      totalGamerscore: earnedAchievements.reduce((sum, item) => sum + Number(item.gamerscore || 0), 0),
      totalCompletedGames: completedGames.length,
    };
  } });
}
