import crypto from "node:crypto";
import fs from "node:fs/promises";

const DATA_FILE = new URL("../data/seed-games.json", import.meta.url);
const HLTB_BASE = "https://howlongtobeat.com";
const WIKIDATA_SEARCH = "https://www.wikidata.org/w/api.php?action=wbsearchentities&language=en&format=json&limit=5";
const WIKIDATA_ENTITY = "https://www.wikidata.org/wiki/Special:EntityData/";

const data = JSON.parse(await fs.readFile(DATA_FILE, "utf8"));
const hltb = await createHltbClient();
const cache = new Map();

let checked = 0;
let updated = 0;

for (const game of data.games) {
  checked += 1;
  const key = cleanTitle(game.title);
  const found = cache.get(key) || await findCover(game, hltb);
  cache.set(key, found);

  if (found?.url && game.cover !== found.url) {
    game.cover = found.url;
    game.coverSource = found.source;
    if (found.title) game.hltbTitle = found.title;
    if (found.title && normalize(game.title) === normalize(found.title)) game.title = found.title;
    if (found.id) game.hltbId = found.id;
    if (!game.lengthHours && found.lengthHours) game.lengthHours = found.lengthHours;
    game.updatedAt = new Date().toISOString();
    updated += 1;
    console.log(`cover ${updated}: ${game.title} -> ${found.source}`);
  }

  await wait(140);
}

await fs.writeFile(DATA_FILE, `${JSON.stringify(data, null, 2)}\n`, "utf8");
console.log(`Checked ${checked} games. Updated ${updated} covers.`);

async function findCover(game, hltb) {
  const hltbCover = await findHltbCover(game, hltb);
  if (hltbCover) return hltbCover;
  return findWikidataCover(game.title);
}

async function createHltbClient() {
  const init = await getJson(`${HLTB_BASE}/api/bleed/init?t=${Date.now()}`, hltbHeaders());
  return {
    token: init.token || "",
    hpKey: init.hpKey || "",
    hpVal: init.hpVal || "",
  };
}

async function findHltbCover(game, hltb) {
  if (!hltb.token) return null;
  const body = {
    searchType: "games",
    searchTerms: cleanTitle(game.title).split(" ").filter(Boolean),
    searchPage: 1,
    size: 10,
    searchOptions: {
      games: {
        userId: 0,
        platform: "",
        sortCategory: "popular",
        rangeCategory: "main",
        rangeTime: { min: null, max: null },
        gameplay: { perspective: "", flow: "", genre: "", difficulty: "" },
        rangeYear: { min: "", max: "" },
        modifier: "",
      },
      users: { sortCategory: "postcount" },
      lists: { sortCategory: "follows" },
      filter: "",
      sort: 0,
      randomizer: 0,
    },
    useCache: true,
  };
  if (hltb.hpKey) body[hltb.hpKey] = hltb.hpVal;

  const response = await fetchWithTimeout(`${HLTB_BASE}/api/bleed`, {
    method: "POST",
    headers: {
      ...hltbHeaders(),
      "Content-Type": "application/json",
      "x-auth-token": hltb.token,
      "x-hp-key": hltb.hpKey,
      "x-hp-val": hltb.hpVal,
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) return null;
  const results = await response.json();
  const match = bestHltbMatch(game, results.data || []);
  if (!match?.game_image) return null;
  return {
    id: match.game_id,
    title: match.game_name,
    source: "HowLongToBeat",
    url: `${HLTB_BASE}/games/${match.game_image}`,
    lengthHours: secondsToHours(match.comp_main),
  };
}

function bestHltbMatch(game, results) {
  const scored = results
    .map((result) => ({ result, score: matchScore(game, result) }))
    .filter((entry) => entry.score >= 0.62)
    .sort((a, b) => b.score - a.score || (b.result.profile_popular || 0) - (a.result.profile_popular || 0));
  return scored[0]?.result || null;
}

function matchScore(game, result) {
  const wanted = normalize(cleanTitle(game.title));
  const found = normalize(result.game_name);
  if (!wanted || !found) return 0;
  let score = 0;
  if (wanted === found) score += 0.78;
  if (found.includes(wanted) || wanted.includes(found)) score += 0.18;

  const wantedTokens = wanted.split(" ").filter((token) => token.length > 1);
  const foundTokens = new Set(found.split(" "));
  const overlap = wantedTokens.filter((token) => foundTokens.has(token)).length;
  score += (overlap / Math.max(1, wantedTokens.length)) * 0.45;

  const platforms = normalize(result.profile_platform || "");
  if (platforms && platformMatches(game.platform, platforms)) score += 0.12;
  return Math.min(score, 1);
}

function platformMatches(platform, hltbPlatforms) {
  const value = normalize(platform);
  if (!value) return false;
  if (value.includes("switch")) return hltbPlatforms.includes("nintendo switch");
  if (value.includes("ps5")) return hltbPlatforms.includes("playstation 5");
  if (value.includes("ps4")) return hltbPlatforms.includes("playstation 4");
  if (value.includes("pc")) return hltbPlatforms.includes("pc");
  if (value.includes("xbox")) return hltbPlatforms.includes("xbox");
  return hltbPlatforms.includes(value);
}

async function findWikidataCover(title) {
  const entity = await findWikidataEntity(title);
  if (!entity) return null;
  const steam = steamCoverFromEntity(entity);
  if (steam && await urlExists(steam.url)) return steam;
  const commons = commonsCoverFromEntity(entity);
  if (commons) return commons;
  return null;
}

async function findWikidataEntity(title) {
  const search = await getJson(`${WIKIDATA_SEARCH}&search=${encodeURIComponent(cleanTitle(title))}`);
  const result = (search.search || []).find((item) => (item.description || "").toLowerCase().includes("video game"));
  if (!result?.id) return null;
  const entityData = await getJson(`${WIKIDATA_ENTITY}${result.id}.json`);
  return entityData.entities?.[result.id] || null;
}

function steamCoverFromEntity(entity) {
  const appId = claimValue(entity, "P1733");
  if (!appId) return null;
  return {
    source: "Steam",
    url: `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/library_600x900.jpg`,
  };
}

function commonsCoverFromEntity(entity) {
  const file = claimValue(entity, "P18");
  if (!file) return null;
  return {
    source: "Wikimedia Commons",
    url: commonsUrl(file),
  };
}

function claimValue(entity, property) {
  const claim = entity.claims?.[property]?.[0]?.mainsnak?.datavalue?.value;
  if (!claim) return "";
  return typeof claim === "string" ? claim : claim.id || "";
}

function commonsUrl(file) {
  const normalized = file.replace(/ /g, "_");
  const hash = crypto.createHash("md5").update(normalized).digest("hex");
  return `https://upload.wikimedia.org/wikipedia/commons/${hash[0]}/${hash.slice(0, 2)}/${encodeURIComponent(normalized)}`;
}

function cleanTitle(title) {
  return title
    .replace(/\([^)]*\)/g, "")
    .replace(/\s+/g, " ")
    .replace(/[™®]/g, "")
    .trim();
}

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function secondsToHours(seconds) {
  if (!seconds) return null;
  return Math.round((seconds / 3600) * 2) / 2;
}

async function getJson(url, headers = genericHeaders()) {
  const response = await fetchWithTimeout(url, { headers });
  if (!response.ok) return {};
  return response.json();
}

async function urlExists(url) {
  const response = await fetchWithTimeout(url, { method: "HEAD", headers: genericHeaders() });
  return response.ok && Number(response.headers.get("content-length") || 0) > 1000;
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        ...genericHeaders(),
        ...(options.headers || {}),
      },
    });
  } finally {
    clearTimeout(timeout);
  }
}

function genericHeaders() {
  return {
    "Accept": "application/json,text/html;q=0.8",
    "User-Agent": "Mozilla/5.0 (compatible; GameList/1.0)",
  };
}

function hltbHeaders() {
  return {
    ...genericHeaders(),
    "Referer": HLTB_BASE + "/",
    "Origin": HLTB_BASE,
  };
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
