const DEFAULT_USER = "ShabiiEXE";
const PSNP_BASE = "https://psnprofiles.com";

export async function onRequestGet({ request, env = {} }) {
  const url = new URL(request.url);
  const user = cleanUser(url.searchParams.get("user") || env.PSN_PROFILE_USER || DEFAULT_USER);
  const sourceUrl = `${PSNP_BASE}/${encodeURIComponent(user)}`;
  if (!user) return json({ user: DEFAULT_USER, achievements: [], sourceUrl: `${PSNP_BASE}/${DEFAULT_USER}` });

  try {
    const response = await fetch(sourceUrl, {
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
        "User-Agent": "Mozilla/5.0 (compatible; GameList/1.0)",
      },
      cf: { cacheTtl: 900, cacheEverything: true },
    });
    const html = await response.text();
    const blocked = isBlocked(html);
    if (!response.ok || blocked) {
      return json({ user, sourceUrl, achievements: [], blocked: true, status: response.status });
    }
    return json({ user, sourceUrl, achievements: parseAchievements(html, sourceUrl), blocked: false });
  } catch {
    return json({ user, sourceUrl, achievements: [], blocked: true });
  }
}

function parseAchievements(html, sourceUrl) {
  const candidates = [];
  const rows = html.match(/<(?:tr|li|div|article)\b[^>]*(?:trophy|recent|earned|activity)[^>]*>[\s\S]*?<\/(?:tr|li|div|article)>/gi) || [];
  for (const row of rows) {
    const text = cleanText(stripTags(row));
    if (!text || text.length < 8) continue;
    const title = attr(row, "title") || firstHeading(row) || text.split(/\s{2,}| • | - /)[0];
    const game = firstMatch(text, /(?:in|from)\s+(.+?)(?:\s+earned|\s+\d|\s+platinum|\s+gold|\s+silver|\s+bronze|$)/i);
    const earnedAt = firstMatch(text, /(\d{1,2}\s+\w+\s+\d{4}|\w+\s+\d{1,2},\s+\d{4}|\d{1,2}\/\d{1,2}\/\d{2,4}|[0-9]+\s+(?:minute|hour|day|week|month)s?\s+ago)/i);
    const rarity = firstMatch(text, /(platinum|gold|silver|bronze|ultra rare|very rare|rare|common)/i);
    const icon = absoluteUrl(attr(row, "src"), sourceUrl);
    const link = absoluteUrl(attr(row, "href"), sourceUrl);
    if (title && !/profile|leaderboard|guide|session/i.test(title)) {
      candidates.push({ title: title.slice(0, 90), game, earnedAt, rarity, icon, url: link || sourceUrl });
    }
  }
  return uniqueAchievements(candidates).slice(0, 6);
}

function firstHeading(html) {
  return cleanText(stripTags(firstMatch(html, /<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/i)
    || firstMatch(html, /<(?:strong|b|a)[^>]*>([\s\S]*?)<\/(?:strong|b|a)>/i)));
}

function attr(html, name) {
  const match = html.match(new RegExp(`${name}=["']([^"']+)["']`, "i"));
  return match ? decode(match[1]) : "";
}

function firstMatch(value, pattern) {
  const match = String(value || "").match(pattern);
  return match ? cleanText(match[1]) : "";
}

function stripTags(value) {
  return String(value || "").replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ");
}

function cleanText(value) {
  return decode(String(value || "").replace(/\s+/g, " ").trim());
}

function decode(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function absoluteUrl(value, base) {
  if (!value || value.startsWith("data:")) return "";
  try {
    return new URL(value, base).toString();
  } catch {
    return "";
  }
}

function uniqueAchievements(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = `${item.title}|${item.game}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function cleanUser(value) {
  return String(value || "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 32);
}

function isBlocked(html) {
  return /Attention Required|Just a moment|cf-error|challenge-platform|Cloudflare/i.test(html);
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=900",
    },
  });
}
