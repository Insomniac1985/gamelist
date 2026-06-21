const OPENXBL_BASE = "https://api.xbl.io";
const XBOX_CACHE_SECONDS = 60 * 60;

export async function onRequestGet({ env = {} }) {
  const apiKey = String(env.OPENXBL_API_KEY || globalThis.process?.env?.OPENXBL_API_KEY || "").trim();
  const gamertag = String(env.XBOX_GAMERTAG || globalThis.process?.env?.XBOX_GAMERTAG || "").trim();
  if (!apiKey) {
    return json({ achievements: [], games: [], completed: [], needsSetup: true, error: "Missing OPENXBL_API_KEY" }, 200, false);
  }

  try {
    const [achievementData, titleData] = await Promise.all([
      openXblGet("/v2/achievements", apiKey),
      openXblGet("/v2/titles", apiKey),
    ]);
    const titleHistory = contentOf(titleData)?.titles || [];
    const historyById = new Map(titleHistory.map((title) => [String(title.titleId || ""), title]));
    const titles = (contentOf(achievementData)?.titles || []).map((title) => normalizeXboxTitle(title, historyById.get(String(title.titleId || ""))));
    const achievements = titles.flatMap((title) => title.achievements
      .filter((achievement) => achievement.earned)
      .map((achievement) => ({ ...achievement, game: title.title, titleId: title.titleId, platform: title.platform, url: xboxProfileUrl(gamertag) })))
      .sort(compareEarned);
    const completed = titles.filter((title) => title.total > 0 && title.earned >= title.total).map((title) => ({
      title: title.title,
      cover: title.cover,
      trophyName: "100% Achievements",
      trophyIcon: title.cover || title.achievements.find((achievement) => achievement.earned)?.icon || "",
      earnedAt: title.latestEarnedAt,
      rawEarnedAt: title.latestRawEarnedAt,
      platform: title.platform,
      url: xboxProfileUrl(gamertag),
      source: "xbox",
      titleId: title.titleId,
      earned: title.earned,
      total: title.total,
    }));
    return json({
      source: "xbox",
      achievements,
      games: titles.map((title) => ({
        title: title.title,
        titleId: title.titleId,
        platform: title.platform,
        cover: title.cover,
        earned: title.earned,
        total: title.total,
        progress: title.total ? Math.round((title.earned / title.total) * 100) : 0,
        achievements: title.achievements,
      })),
      completed,
      totalEarned: titles.reduce((sum, title) => sum + title.earned, 0),
      sourceUrl: xboxProfileUrl(gamertag),
    });
  } catch (error) {
    return json({
      achievements: [],
      games: [],
      completed: [],
      authError: true,
      error: error?.message || "Xbox achievements request failed",
    }, 200, false);
  }
}

async function openXblGet(path, apiKey) {
  const response = await fetch(`${OPENXBL_BASE}${path}`, {
    headers: {
      "Accept": "application/json",
      "Accept-Language": "en-US",
      "X-Authorization": apiKey,
    },
    cf: { cacheTtl: XBOX_CACHE_SECONDS, cacheEverything: true },
  });
  if (!response.ok) throw new Error(`OpenXBL request failed (${response.status})`);
  return response.json();
}

function contentOf(data) {
  return data?.content && typeof data.content === "object" ? data.content : data || {};
}

function normalizeXboxTitle(title = {}, history = {}) {
  const achievements = (Array.isArray(title.achievements) ? title.achievements : []).map(normalizeXboxAchievement);
  const earnedAchievements = achievements.filter((achievement) => achievement.earned).sort(compareEarned);
  const earned = Number.isFinite(Number(title.currentAchievements)) ? Number(title.currentAchievements) : earnedAchievements.length;
  const total = achievements.length || Number(title.totalAchievements || history?.achievement?.totalAchievements || 0);
  return {
    titleId: String(title.titleId || history?.titleId || ""),
    title: String(title.name || history?.name || "Xbox game"),
    platform: xboxPlatform(history?.devices || title.platforms || []),
    cover: xboxCover(history, title),
    achievements,
    earned,
    total,
    latestEarnedAt: earnedAchievements[0]?.earnedAt || "",
    latestRawEarnedAt: earnedAchievements[0]?.rawEarnedAt || "",
  };
}

function normalizeXboxAchievement(achievement = {}, index = 0) {
  const earned = achievement.isUnlocked === true
    || String(achievement.progressState || "").toLowerCase() === "achieved"
    || Number(achievement.progressPercentage || 0) >= 100;
  const rawEarnedAt = earned
    ? String(achievement.timeUnlocked || achievement.progression?.timeUnlocked || achievement.unlockedAt || "")
    : "";
  return {
    trophyId: String(achievement.id ?? index),
    order: index,
    title: String(achievement.name || "Achievement"),
    description: String(achievement.description || achievement.lockedDescription || ""),
    earned,
    earnedAt: formatXboxDate(rawEarnedAt),
    rawEarnedAt,
    rarity: "Xbox",
    type: "achievement",
    icon: xboxAchievementIcon(achievement),
    gamerscore: Number(achievement.gamerscore || achievement.rewards?.find?.((reward) => reward.type === "Gamerscore")?.value || 0),
    source: "xbox",
  };
}

function xboxAchievementIcon(achievement) {
  return String(
    achievement.image
    || achievement.icon
    || achievement.displayImage
    || achievement.mediaAssets?.find?.((asset) => asset.type === "Icon")?.url
    || achievement.mediaAssets?.[0]?.url
    || ""
  );
}

function xboxCover(history = {}, title = {}) {
  const images = [...(Array.isArray(history.images) ? history.images : []), ...(Array.isArray(title.images) ? title.images : [])];
  return String(history.displayImage || title.displayImage || images.find((image) => /boxart|poster/i.test(image.type || ""))?.url || images[0]?.url || "");
}

function xboxPlatform(devices) {
  const value = (Array.isArray(devices) ? devices : [devices]).join(" ").toLowerCase();
  if (/xbox\s*360|xbox360/.test(value)) return "X360";
  if (/win32|windows|pc/.test(value)) return "Xbox PC";
  if (/xbox\s*one|xboxone/.test(value)) return "XOne";
  return "Xbox";
}

function compareEarned(a, b) {
  return Date.parse(b.rawEarnedAt || b.earnedAt || "") - Date.parse(a.rawEarnedAt || a.earnedAt || "");
}

function formatXboxDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function xboxProfileUrl(gamertag) {
  return gamertag ? `https://www.xbox.com/play/user/${encodeURIComponent(gamertag)}` : "https://www.xbox.com/";
}

function json(payload, status = 200, cache = true) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": cache ? `public, max-age=${XBOX_CACHE_SECONDS}` : "no-store",
    },
  });
}
