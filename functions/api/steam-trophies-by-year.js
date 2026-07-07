import { onRequestGet as steamAchievements } from "./steam-achievements.js";
import { apiUrl, countByYear, inChunks, json, latestDate, responseJson, sortByDateDesc } from "./stats-utils.js";

export async function onRequestGet({ request, env = {} }) {
  const games = [];
  let cursor = 0;
  let nextCursor = 0;
  const limit = Math.max(1, Math.min(20, Number(new URL(request.url).searchParams.get("limit")) || 20));
  while (nextCursor !== null) {
    const url = apiUrl(request, "/api/steam-achievements", { activity: "1", cursor, limit });
    const data = await responseJson(await steamAchievements({ request: new Request(url), env }));
    games.push(...(Array.isArray(data.games) ? data.games : []));
    nextCursor = data.nextCursor ?? null;
    cursor = nextCursor || 0;
  }

  const earnedAchievements = games.flatMap((game) => (Array.isArray(game.achievements) ? game.achievements : [])
    .filter((achievement) => achievement.earned)
    .map((achievement) => ({ ...achievement, game: game.name, appId: game.appId, source: "steam" })));
  const completedGames = games
    .map((game) => {
      const achievements = Array.isArray(game.achievements) ? game.achievements : [];
      const earned = achievements.filter((achievement) => achievement.earned);
      if (!achievements.length || earned.length < achievements.length) return null;
      const rawEarnedAt = latestDate(earned);
      return { title: game.name, appId: game.appId, earned: earned.length, total: achievements.length, rawEarnedAt, earnedAt: rawEarnedAt, source: "steam" };
    })
    .filter(Boolean);

  return json({
    source: "steam",
    trophiesByYear: countByYear(earnedAchievements, (achievement) => achievement.rawEarnedAt, (items) => ({
      games: new Set(items.map((item) => item.appId).filter(Boolean)).size,
    })),
    completedGamesByYear: countByYear(completedGames, (game) => game.rawEarnedAt),
    completedGames: sortByDateDesc(completedGames),
    totalTrophies: earnedAchievements.length,
    totalCompletedGames: completedGames.length,
  }, 200, true);
}
