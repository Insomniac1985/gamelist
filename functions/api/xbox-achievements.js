const OPENXBL_BASE = "https://api.xbl.io";
const XBOX_CACHE_SECONDS = 60 * 60;

export async function onRequestGet({ request, env = {} }) {
  const apiKey = String(env.OPENXBL_API_KEY || globalThis.process?.env?.OPENXBL_API_KEY || "").trim();
  const requestUrl = new URL(request?.url || "https://local/api/xbox-achievements");
  const requestedUser = cleanXboxUser(requestUrl.searchParams.get("user"));
  const fallbackUser = cleanXboxUser(env.XBOX_GAMERTAG || globalThis.process?.env?.XBOX_GAMERTAG);
  const targetUser = requestedUser || fallbackUser;
  const titleId = String(requestUrl.searchParams.get("titleId") || "").replace(/\D/g, "").slice(0, 20);
  if (!apiKey) {
    return json({ achievements: [], games: [], completed: [], needsSetup: true, error: "Missing OPENXBL_API_KEY" }, 200, false);
  }

  try {
    const identity = await resolveXboxIdentity(targetUser, apiKey);
    if (titleId) return await xboxTitleAchievements(identity, titleId, apiKey);
    const titlePath = identity.xuid ? `/v2/titles/${encodeURIComponent(identity.xuid)}` : "/v2/titles";
    const titleData = await openXblGet(titlePath, apiKey);
    const titleHistory = contentOf(titleData)?.titles || [];
    const titles = titleHistory.map((title) => normalizeXboxTitle(title, title));
    const recentTitles = titles
      .filter((title) => title.titleId && title.earned > 0)
      .sort((a, b) => Date.parse(b.lastPlayedAt || "") - Date.parse(a.lastPlayedAt || ""))
      .slice(0, 8);
    const recentDetails = await Promise.allSettled(recentTitles.map((title) => fetchXboxTitleAchievementData(identity, title.titleId, apiKey)));
    recentDetails.forEach((result, index) => {
      if (result.status !== "fulfilled") return;
      const title = recentTitles[index];
      const achievements = result.value;
      title.achievements = achievements;
      title.earned = achievements.filter((achievement) => achievement.earned).length;
      title.total = achievements.length;
      title.latestEarnedAt = achievements.filter((achievement) => achievement.earned).sort(compareEarned)[0]?.earnedAt || "";
      title.latestRawEarnedAt = achievements.filter((achievement) => achievement.earned).sort(compareEarned)[0]?.rawEarnedAt || "";
    });
    const achievements = titles.flatMap((title) => title.achievements
      .filter((achievement) => achievement.earned)
      .map((achievement) => ({ ...achievement, game: title.title, titleId: title.titleId, platform: title.platform, url: xboxProfileUrl(identity.gamertag) })))
      .sort(compareEarned);
    const completed = titles.filter((title) => title.progress >= 100 || (title.total > 0 && title.earned >= title.total)).map((title) => ({
      title: title.title,
      cover: title.cover,
      trophyName: "100% Achievements",
      trophyIcon: title.cover || title.achievements.find((achievement) => achievement.earned)?.icon || "",
      earnedAt: title.latestEarnedAt,
      rawEarnedAt: title.latestRawEarnedAt,
      platform: title.platform,
      url: xboxProfileUrl(identity.gamertag),
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
        progress: title.progress,
        achievements: title.achievements,
      })),
      completed,
      totalEarned: titles.reduce((sum, title) => sum + title.earned, 0),
      sourceUrl: xboxProfileUrl(identity.gamertag),
      user: identity.gamertag || targetUser,
      xuid: identity.xuid,
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

async function xboxTitleAchievements(identity, titleId, apiKey) {
  if (!identity.xuid) throw new Error("A Microsoft account is required for Xbox achievement details");
  const achievements = await fetchXboxTitleAchievementData(identity, titleId, apiKey);
  return json({
    source: "xbox",
    titleId,
    user: identity.gamertag,
    xuid: identity.xuid,
    achievements,
    earnedCount: achievements.filter((achievement) => achievement.earned).length,
    count: achievements.length,
    sourceUrl: xboxProfileUrl(identity.gamertag),
  });
}

async function fetchXboxTitleAchievementData(identity, titleId, apiKey) {
  let data;
  try {
    data = await openXblGet(`/v2/achievements/player/${encodeURIComponent(identity.xuid)}/${encodeURIComponent(titleId)}`, apiKey);
  } catch {
    data = await openXblGet(`/v2/achievements/player/${encodeURIComponent(identity.xuid)}/title/${encodeURIComponent(titleId)}`, apiKey);
  }
  const content = contentOf(data);
  const rawAchievements = firstAchievementArray(content);
  return rawAchievements.map(normalizeXboxAchievement);
}

function firstAchievementArray(content) {
  const candidates = [
    content?.achievements,
    content?.title?.achievements,
    content?.titles?.[0]?.achievements,
    content?.items,
    Array.isArray(content) ? content : null,
  ];
  return candidates.find(Array.isArray) || [];
}

async function resolveXboxIdentity(user, apiKey) {
  if (!user) return { gamertag: "", xuid: "" };
  if (/^\d{12,20}$/.test(user)) return { gamertag: "", xuid: user };
  const data = await openXblGet(`/v2/search/${encodeURIComponent(user)}`, apiKey);
  const people = Array.isArray(contentOf(data)?.people) ? contentOf(data).people : [];
  const exact = people.find((person) => String(person.gamertag || "").toLowerCase() === user.toLowerCase());
  const match = exact || people[0];
  if (!match?.xuid) throw new Error(`Xbox account not found: ${user}`);
  return { gamertag: String(match.gamertag || user), xuid: String(match.xuid) };
}

function cleanXboxUser(value) {
  return String(value || "").trim().replace(/[<>]/g, "").slice(0, 64);
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
  const summary = title.achievement || history?.achievement || {};
  const earned = Number.isFinite(Number(title.currentAchievements ?? summary.currentAchievements))
    ? Number(title.currentAchievements ?? summary.currentAchievements)
    : earnedAchievements.length;
  const total = achievements.length || Number(title.totalAchievements || summary.totalAchievements || 0);
  const progress = Number(summary.progressPercentage || (total ? (earned / total) * 100 : 0));
  return {
    titleId: String(title.titleId || history?.titleId || ""),
    title: String(title.name || history?.name || "Xbox game"),
    platform: xboxPlatform(history?.devices || title.platforms || []),
    cover: xboxCover(history, title),
    achievements,
    earned,
    total,
    progress: Number.isFinite(progress) ? Math.max(0, Math.min(100, Math.round(progress))) : 0,
    lastPlayedAt: String(title.titleHistory?.lastTimePlayed || history?.titleHistory?.lastTimePlayed || ""),
    latestEarnedAt: earnedAchievements[0]?.earnedAt || formatXboxDate(title.titleHistory?.lastTimePlayed || history?.titleHistory?.lastTimePlayed || ""),
    latestRawEarnedAt: earnedAchievements[0]?.rawEarnedAt || String(title.titleHistory?.lastTimePlayed || history?.titleHistory?.lastTimePlayed || ""),
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
  return secureXboxImageUrl(
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
  const candidates = [
    ...images.filter((image) => /boxart|poster/i.test(image.type || "")).map((image) => image.url),
    history.displayImage,
    title.displayImage,
    ...images.map((image) => image.url),
  ];
  return candidates.map(secureXboxCoverUrl).find(Boolean) || "";
}

function secureXboxImageUrl(value) {
  const url = String(value || "").trim();
  if (!url) return "";
  if (/^https?:\/\/images-eds\.xboxlive\.com/i.test(url)) {
    return url.replace(/^https?:\/\/images-eds\.xboxlive\.com/i, "https://images-eds-ssl.xboxlive.com");
  }
  return url.replace(/^http:\/\//i, "https://");
}

function secureXboxCoverUrl(value) {
  const url = String(value || "").trim();
  if (!url || /^https?:\/\/images-eds\.xboxlive\.com/i.test(url)) return "";
  return secureXboxImageUrl(url);
}

function xboxPlatform(devices) {
  const value = (Array.isArray(devices) ? devices : [devices]).join(" ").toLowerCase();
  if (/xbox\s*360|xbox360/.test(value)) return "X360";
  if (/win32|windows|pc/.test(value)) return "Xbox PC";
  if (/xbox\s*series|scarlett/.test(value)) return "Xbox Series";
  if (/xbox\s*one|xboxone/.test(value)) return "XOne";
  return "Xbox Series";
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
