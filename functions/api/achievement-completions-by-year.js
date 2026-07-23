import { onRequestGet as psnTrophiesByYear } from "./psn-trophies-by-year.js";
import { onRequestGet as steamTrophiesByYear } from "./steam-trophies-by-year.js";
import { onRequestGet as xboxTrophiesByYear } from "./xbox-trophies-by-year.js";
import { apiUrl, cachedStats, responseJson, sortByDateDesc, yearFromDate } from "./stats-utils.js";

const PROVIDERS = [
  {
    source: "psn",
    platform: "PlayStation",
    path: "/api/psn-trophies-by-year",
    handler: psnTrophiesByYear,
    games: (data) => data.platinums || [],
    years: (data) => data.platinumsByYear || [],
    total: (data, games) => Number(data.totalPlatinums || games.length || 0),
  },
  {
    source: "steam",
    platform: "Steam",
    path: "/api/steam-trophies-by-year",
    handler: steamTrophiesByYear,
    games: (data) => data.completedGames || [],
    years: (data) => data.completedGamesByYear || [],
    total: (data, games) => Number(data.totalCompletedGames || games.length || 0),
  },
  {
    source: "xbox",
    platform: "Xbox",
    path: "/api/xbox-trophies-by-year",
    handler: xboxTrophiesByYear,
    games: (data) => data.completedGames || [],
    years: (data) => data.completedGamesByYear || [],
    total: (data, games) => Number(data.totalCompletedGames || games.length || 0),
  },
];

export async function onRequestGet({ request, env = {} }) {
  return cachedStats({ request, env, key: "achievement-completions-by-year", producer: async () => {
    const platforms = await Promise.all(PROVIDERS.map((provider) => providerSummary(provider, request, env)));
    const completedGames = platforms.flatMap((provider) => provider.completedGames);

    return {
      source: "achievement-completions",
      platforms,
      completedGamesByYear: aggregateYears(platforms),
      completedGames: sortByDateDesc(completedGames),
      totalCompletedGames: completedGames.length,
      errors: platforms.filter((provider) => provider.error).map(({ platform, source, error }) => ({ platform, source, error })),
    };
  } });
}

async function providerSummary(provider, request, env) {
  try {
    const data = await responseJson(await provider.handler({ request: new Request(apiUrl(request, provider.path)), env }));
    const completedGames = provider.games(data)
      .map((game) => ({
        ...game,
        source: provider.source,
        platform: game.platform || provider.platform,
      }));

    return {
      source: provider.source,
      platform: provider.platform,
      completedGames,
      completedGamesByYear: provider.years(data),
      totalCompletedGames: provider.total(data, completedGames),
    };
  } catch (error) {
    return {
      source: provider.source,
      platform: provider.platform,
      completedGames: [],
      completedGamesByYear: [],
      totalCompletedGames: 0,
      error: error.message || String(error),
    };
  }
}

function aggregateYears(platforms) {
  const counts = new Map();
  for (const provider of platforms) {
    for (const game of provider.completedGames) {
      const year = yearFromDate(game.rawEarnedAt || game.earnedAt);
      if (!year) continue;
      counts.set(year, (counts.get(year) || 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([year, count]) => ({ year, count }))
    .sort((a, b) => String(b.year).localeCompare(String(a.year)));
}
