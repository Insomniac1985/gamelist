import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const BASE_URL = "https://gamelist.shabiimitjans.workers.dev";
const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const COVER_STATE_PATH = join(SCRIPT_DIR, ".discord-widget-cover-state.json");
const FALLBACK_IMAGE = `${BASE_URL}/assets/Icon.png`;
const STAT_IMAGES = {
  playing: `${BASE_URL}/assets/Icon.png`,
  finished: `${BASE_URL}/assets/discord/finished.png`,
  backlog: `${BASE_URL}/assets/app-Icon.png`,
  shelf: `${BASE_URL}/assets/discord/shelf.png`,
};
const PLATFORM_IMAGES = {
  playstation: `${BASE_URL}/assets/platforms/playstation.png`,
  playstationModern: `${BASE_URL}/assets/platforms/playstation_modern.png`,
  playstationRetro: `${BASE_URL}/assets/platforms/playstation_retro.png`,
  steam: `${BASE_URL}/assets/platforms/steam.png`,
  switch: `${BASE_URL}/assets/platforms/switch.png`,
  xbox: `${BASE_URL}/assets/platforms/xbox.png`,
  xbox360: `${BASE_URL}/assets/platforms/xbox360.png`,
  xboxRetro: `${BASE_URL}/assets/platforms/xbox_retro.png`,
  wii: `${BASE_URL}/assets/platforms/wii.png`,
  wiiu: `${BASE_URL}/assets/platforms/wiiu.png`,
  gamecube: `${BASE_URL}/assets/platforms/gc.png`,
  n64: `${BASE_URL}/assets/platforms/n64.png`,
  snes: `${BASE_URL}/assets/platforms/snes.png`,
  nes: `${BASE_URL}/assets/platforms/nes.png`,
  ds: `${BASE_URL}/assets/platforms/nds.png`,
  threeDs: `${BASE_URL}/assets/platforms/3ds.png`,
  gba: `${BASE_URL}/assets/platforms/gba.png`,
  gbc: `${BASE_URL}/assets/platforms/gbc.png`,
  gb: `${BASE_URL}/assets/platforms/gb.png`,
  gamegear: `${BASE_URL}/assets/platforms/gamegear.png`,
  dreamcast: `${BASE_URL}/assets/platforms/dreamcast.png`,
  sega: `${BASE_URL}/assets/platforms/sega.png`,
};

async function getJson(path) {
  const response = await fetch(`${BASE_URL}${path}`, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`${path} returned ${response.status}`);
  return response.json();
}

async function maybeGetJson(path) {
  try {
    return await getJson(path);
  } catch {
    return null;
  }
}

function playingGames(syncData) {
  return (syncData.games || [])
    .filter((game) => !game.deletedAt && game.playing)
    .sort((a, b) => startedSortValue(a) - startedSortValue(b) || String(a.title || "").localeCompare(String(b.title || "")));
}

function randomGames(games, count = games.length) {
  return [...games]
    .map((game) => ({ game, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .slice(0, count)
    .map(({ game }) => game);
}

async function randomCoverGame(games) {
  const candidates = games.filter((game) => game.cover);
  if (!candidates.length) return null;
  let previousKey = "";
  try {
    previousKey = JSON.parse(await readFile(COVER_STATE_PATH, "utf8"))?.key || "";
  } catch {
    previousKey = "";
  }
  const available = candidates.length > 1
    ? candidates.filter((game) => coverKey(game) !== previousKey)
    : candidates;
  const selected = randomGames(available, 1)[0] || candidates[0];
  await writeFile(COVER_STATE_PATH, JSON.stringify({ key: coverKey(selected), updatedAt: new Date().toISOString() }, null, 2), "utf8").catch(() => {});
  return selected;
}

function coverKey(game) {
  return [game?.id, game?.title, game?.platform, game?.cover].filter(Boolean).join("|");
}

function startedSortValue(game) {
  return game.startedAt ? new Date(`${game.startedAt}T00:00:00Z`).getTime() : Number.POSITIVE_INFINITY;
}

function backlogCount(listsData) {
  return (listsData.lists || []).find((item) => item.list === "backlog")?.count || 0;
}

function completedCount(completedData) {
  return Number(completedData.totalCompleted || 0)
    || (completedData.years || []).reduce((sum, year) => sum + Number(year.count || 0), 0);
}

function finishedThisYear(completedData) {
  const year = String(new Date().getFullYear());
  return (completedData.years || []).find((item) => item.year === year)?.count || 0;
}

function latestCompletedCover(completedData) {
  return (completedData.years || [])
    .flatMap((year) => year.games || [])
    .find((game) => game.cover)?.cover || "";
}

function platformIconUrl(platform) {
  const value = String(platform || "").toLowerCase();
  if (hasPlatform(value, "steam", "pc", "windows")) return PLATFORM_IMAGES.steam;
  if (hasPlatform(value, "switch")) return PLATFORM_IMAGES.switch;
  if (hasPlatform(value, "wii u", "wiiu")) return PLATFORM_IMAGES.wiiu;
  if (hasPlatform(value, "wii")) return PLATFORM_IMAGES.wii;
  if (hasPlatform(value, "gamecube", "game cube")) return PLATFORM_IMAGES.gamecube;
  if (hasPlatform(value, "n64", "nintendo 64")) return PLATFORM_IMAGES.n64;
  if (hasPlatform(value, "snes", "super nintendo")) return PLATFORM_IMAGES.snes;
  if (hasPlatform(value, "nes", "nintendo entertainment")) return PLATFORM_IMAGES.nes;
  if (hasPlatform(value, "3ds")) return PLATFORM_IMAGES.threeDs;
  if (hasPlatform(value, "ds")) return PLATFORM_IMAGES.ds;
  if (hasPlatform(value, "gba", "game boy advance")) return PLATFORM_IMAGES.gba;
  if (hasPlatform(value, "gbc", "game boy color")) return PLATFORM_IMAGES.gbc;
  if (hasPlatform(value, "game boy", "gameboy", "gb")) return PLATFORM_IMAGES.gb;
  if (hasPlatform(value, "game gear")) return PLATFORM_IMAGES.gamegear;
  if (hasPlatform(value, "dreamcast")) return PLATFORM_IMAGES.dreamcast;
  if (hasPlatform(value, "genesis", "mega drive", "sega")) return PLATFORM_IMAGES.sega;
  if (hasPlatform(value, "xbox 360", "x360")) return PLATFORM_IMAGES.xbox360;
  if (hasPlatform(value, "original xbox", "classic xbox")) return PLATFORM_IMAGES.xboxRetro;
  if (hasPlatform(value, "xbox")) return PLATFORM_IMAGES.xbox;
  if (hasPlatform(value, "ps5", "playstation 5")) return PLATFORM_IMAGES.playstation;
  if (hasPlatform(value, "ps1", "ps2", "playstation 1", "playstation 2")) return PLATFORM_IMAGES.playstation;
  if (hasPlatform(value, "playstation", "ps3", "ps4", "psp", "vita")) return PLATFORM_IMAGES.playstation;
  return FALLBACK_IMAGE;
}

function hasPlatform(value, ...needles) {
  return needles.some((needle) => value.includes(needle));
}

async function trophyProgressForGame(game, activityData) {
  if (!game) return "";
  const direct = await directTrophyProgress(game);
  if (direct) return direct;
  return activityTrophyProgress(game, activityData);
}

async function directTrophyProgress(game) {
  const psnId = String(game.npCommunicationId || "").trim();
  if (psnId) {
    const params = new URLSearchParams({ id: psnId });
    if (game.npServiceName) params.set("service", game.npServiceName);
    return progressFromPayload(await maybeGetJson(`/api/trophies?${params}`), "trophies");
  }

  const steamAppId = cleanSteamAppId(game.steamAppId) || steamAppIdFromUrl(game.storeLinks?.steam);
  if (steamAppId) {
    return progressFromPayload(await maybeGetJson(`/api/steam-achievements?${new URLSearchParams({ appId: steamAppId })}`), "achievements");
  }

  const titleId = String(game.titleId || "").replace(/\D/g, "").slice(0, 20);
  if (titleId) {
    return progressFromPayload(await maybeGetJson(`/api/xbox-achievements?${new URLSearchParams({ titleId })}`), "achievements");
  }

  return "";
}

function progressFromPayload(data, itemKey) {
  if (!data) return "";
  const items = Array.isArray(data[itemKey]) ? data[itemKey] : [];
  const total = Number(data.count || items.length || 0);
  const earned = Number.isFinite(Number(data.earnedCount))
    ? Number(data.earnedCount)
    : items.filter((item) => item.earned).length;
  if (!total) return "";
  return `${earned}/${total} trophies⠀`;
}

function activityTrophyProgress(game, activityData) {
  const match = (activityData.games || []).find((item) => titleMatch(game.trophyName || game.title, item.title));
  const text = String(match?.game || "");
  const progress = text.match(/(\d+)\s*\/\s*(\d+)\s*(?:trophies|achievements)?/i);
  if (!progress) return "";
  return `${progress[1]}/${progress[2]} trophies⠀`;
}

function gameNameForSubtitle(game) {
  if (!game) return " ";
  return game.title || "Untitled game";
}

function trophyTextForSubtitle(trophyProgress) {
  return trophyProgress || " ";
}

function titleMatch(left, right) {
  const a = normalizeTitle(left);
  const b = normalizeTitle(right);
  return Boolean(a && b && (a.includes(b) || b.includes(a)));
}

function normalizeTitle(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\biii\b/g, "3")
    .replace(/\bii\b/g, "2")
    .replace(/\biv\b/g, "4")
    .replace(/\bvi\b/g, "6")
    .replace(/\bv\b/g, "5")
    .replace(/\bix\b/g, "9")
    .replace(/\bviii\b/g, "8")
    .replace(/\bvii\b/g, "7")
    .replace(/\bx\b/g, "10")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function cleanSteamAppId(value) {
  return String(value || "").replace(/\D/g, "").slice(0, 12);
}

function steamAppIdFromUrl(value) {
  try {
    const url = new URL(String(value || ""));
    if (!/store\.steampowered\.com$/i.test(url.hostname)) return "";
    const parts = url.pathname.split("/").filter(Boolean);
    const appIndex = parts.indexOf("app");
    return cleanSteamAppId(appIndex >= 0 ? parts[appIndex + 1] : "");
  } catch {
    return "";
  }
}

function absoluteImageUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    return new URL(raw, BASE_URL).toString();
  } catch {
    return "";
  }
}

function textField(name, value) {
  return { name, type: 1, value: String(value || "").slice(0, 120) };
}

function numberField(name, value) {
  return { name, type: 2, value: Number(value || 0) };
}

function imageField(name, url) {
  return { name, type: 3, value: { url: absoluteImageUrl(url) || FALLBACK_IMAGE } };
}

export async function buildWidgetData() {
  const [lists, completed, shelf, sync, activity] = await Promise.all([
    getJson("/api/gamelist-games-by-list"),
    getJson("/api/completed-games-by-year"),
    getJson("/api/shelf-games-platforms"),
    getJson("/api/sync"),
    maybeGetJson("/api/achievements"),
  ]);

  const playing = playingGames(sync);
  const selectedGames = randomGames(playing, 3);
  const coverGame = await randomCoverGame(playing) || selectedGames[0] || null;
  const trophyProgress = await Promise.all(selectedGames.map((game) => trophyProgressForGame(game, activity || {})));
  const cover = coverGame?.cover || latestCompletedCover(completed) || FALLBACK_IMAGE;
  const subtitles = [0, 1, 2].map((index) => gameNameForSubtitle(selectedGames[index]));
  const subtitleTrophies = [0, 1, 2].map((index) => trophyTextForSubtitle(trophyProgress[index]));
  const subtitleIcons = [0, 1, 2].map((index) => platformIconUrl(selectedGames[index]?.platform));

  return {
    data: {
      dynamic: [
        imageField("game_cover_image", cover),
        textField("game_title", "Currently Playing"),
        imageField("platform_icon_image", subtitleIcons[0]),
        imageField("game_subtitle_1_image", subtitleIcons[0]),
        textField("game_subtitle_1", subtitles[0]),
        textField("game_subtitle_1_trophies", subtitleTrophies[0]),
        imageField("game_subtitle_2_image", subtitleIcons[1]),
        textField("game_subtitle_2", subtitles[1]),
        textField("game_subtitle_2_trophies", subtitleTrophies[1]),
        imageField("game_subtitle_3_image", subtitleIcons[2]),
        textField("game_subtitle_3", subtitles[2]),
        textField("game_subtitle_3_trophies", subtitleTrophies[2]),
        textField("currently_playing_count", playing.length),
        imageField("currently_playing_image", STAT_IMAGES.playing),
        textField("finished_this_year", finishedThisYear(completed)),
        imageField("finished_this_year_image", STAT_IMAGES.finished),
        textField("backlog_games", backlogCount(lists)),
        imageField("backlog_image", STAT_IMAGES.backlog),
        textField("shelf_games", Number(shelf.totalGames || 0)),
        imageField("shelf_image", STAT_IMAGES.shelf),
        numberField("completed_games", completedCount(completed)),
        textField("rotation_note", playing.length > 1 ? `Randomized from ${playing.length} games on each update` : ""),
      ],
    },
    username: "Shabii",
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(JSON.stringify(await buildWidgetData(), null, 2));
}
