const HLTB_BASE = "https://howlongtobeat.com";
const HLTB_RESULT_LIMIT = 8;
const IGDB_BASE = "https://api.igdb.com/v4";
const TWITCH_TOKEN_URL = "https://id.twitch.tv/oauth2/token";

let hltbClientPromise;
let igdbTokenCache;

export async function onRequestGet({ request, env = {} }) {
  const url = new URL(request.url);
  const lookup = parseLookup(url.searchParams.get("q") || "");
  const query = cleanTitle(lookup.query || "");
  if (!query) return json({ results: [] });

  const igdb = igdbCredentials(env);
  if (igdb) {
    try {
      const results = await igdbSearch(query, igdb, lookup);
      if (results.length) return json({ results });
    } catch {
      // Fall through to HowLongToBeat when IGDB credentials or API are unavailable.
    }
  }

  try {
    const hltb = await getHltbClient();
    const results = await hltbSearch(query, hltb);
    return json({ results });
  } catch (error) {
    return json({ results: [], error: "HowLongToBeat lookup unavailable" }, 503);
  }
}

function parseLookup(value) {
  const raw = String(value || "").trim();
  try {
    const url = new URL(raw);
    const host = url.hostname.replace(/^www\./, "");
    if (host === "igdb.com") {
      const parts = url.pathname.split("/").filter(Boolean);
      const gameIndex = parts.indexOf("games");
      const slug = gameIndex >= 0 ? parts[gameIndex + 1] || "" : "";
      if (slug) {
        return {
          raw,
          igdbSlug: slug,
          query: titleFromSlug(slug),
          igdbUrl: `https://www.igdb.com/games/${slug}`,
        };
      }
    }
  } catch {
    // Plain title search.
  }
  return { raw, query: raw, igdbSlug: "", igdbUrl: "" };
}

function igdbCredentials(env) {
  const clientId = env.IGDB_CLIENT_ID || globalThis.process?.env?.IGDB_CLIENT_ID || "";
  const clientSecret = env.IGDB_CLIENT_SECRET || globalThis.process?.env?.IGDB_CLIENT_SECRET || "";
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

export { firstPlatform, igdbCredentials };

export async function igdbLookup(rawQuery, credentials) {
  const lookup = parseLookup(rawQuery || "");
  const query = cleanTitle(lookup.query || "");
  if (!query) return [];
  return igdbSearch(query, credentials, lookup);
}

async function igdbSearch(query, credentials, lookup = {}) {
  const token = await getIgdbToken(credentials);
  const fields = "fields name,slug,summary,storyline,first_release_date,cover.image_id,genres.name,hypes,total_rating,total_rating_count,involved_companies.company.name,involved_companies.developer,involved_companies.publisher,platforms.name,release_dates.date,release_dates.platform.name,websites.url,websites.category,videos.name,videos.video_id;";
  const slugBody = lookup.igdbSlug ? [
    fields,
    `where slug = "${escapeIgdbString(lookup.igdbSlug)}";`,
    "limit 1;",
  ].join(" ") : "";
  const body = [
    fields,
    `search "${escapeIgdbString(searchAlias(query))}";`,
    "where version_parent = null;",
    "limit 10;",
  ].join(" ");
  const response = await fetchWithTimeout(`${IGDB_BASE}/games`, {
    method: "POST",
    timeoutMs: 16000,
    headers: {
      Accept: "application/json",
      "Content-Type": "text/plain",
      "Client-ID": credentials.clientId,
      Authorization: `Bearer ${token}`,
    },
    body: slugBody || body,
  });
  if (!response.ok) return [];
  const games = await response.json();
  if (slugBody && !games.length) return igdbSearch(query, credentials, { ...lookup, igdbSlug: "" });
  const hltbResults = await safeHltbResults(query);
  const results = await Promise.all(games
    .map((game) => igdbResult(game, query, hltbResults, lookup)));
  return results
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .map(({ score, ...game }) => game);
}

async function getIgdbToken({ clientId, clientSecret }) {
  if (igdbTokenCache && Date.now() < igdbTokenCache.expiresAt) return igdbTokenCache.token;
  const tokenUrl = new URL(TWITCH_TOKEN_URL);
  tokenUrl.searchParams.set("client_id", clientId);
  tokenUrl.searchParams.set("client_secret", clientSecret);
  tokenUrl.searchParams.set("grant_type", "client_credentials");
  const response = await fetchWithTimeout(tokenUrl.toString(), { method: "POST", timeoutMs: 16000 });
  if (!response.ok) throw new Error("IGDB token failed");
  const data = await response.json();
  igdbTokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + Math.max(60, Number(data.expires_in || 3600) - 300) * 1000,
  };
  return igdbTokenCache.token;
}

async function igdbResult(game, query, hltbResults, lookup = {}) {
  const title = game.name || "";
  const textScore = lookup.igdbSlug && game.slug === lookup.igdbSlug ? 1 : matchScore(query, title);
  if (!title || textScore < 0.28) return null;
  const hltbMatch = bestExternalMatch(title, hltbResults);
  const companies = game.involved_companies || [];
  const release = bestIgdbRelease(game.release_dates) || unixDate(game.first_release_date);
  const score = textScore + igdbQualityScore(game, hltbMatch);
  const storeLinks = storeLinksFromWebsites(game.websites);
  const steamTrailerUrl = await steamTrailer(storeLinks.steam);
  return {
    id: game.id ? `igdb:${game.id}` : title,
    igdbId: game.id || null,
    hltbId: hltbMatch?.hltbId || null,
    igdbUrl: lookup.igdbUrl || (game.slug ? `https://www.igdb.com/games/${game.slug}` : ""),
    title,
    releaseDate: release.date,
    releaseText: release.text,
    cover: igdbCover(game.cover?.image_id) || hltbMatch?.cover || "",
    platform: firstPlatform((game.platforms || []).map((platform) => platform.name).join(", ")),
    platforms: (game.platforms || []).map((platform) => platform.name).filter(Boolean),
    genres: cleanGenreLabels((game.genres || []).map((genre) => genre.name).filter(Boolean)),
    developer: companyName(companies, "developer"),
    publisher: companyName(companies, "publisher"),
    description: fullDescription(game.summary || game.storyline || ""),
    trailerUrl: steamTrailerUrl || igdbTrailer(game.videos),
    storeLinks,
    lengthHours: hltbMatch?.lengthHours || null,
    source: "IGDB",
    score,
  };
}

function fullDescription(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function igdbQualityScore(game, hltbMatch) {
  let score = 0;
  if (hltbMatch) score += 0.22;
  if (game.cover?.image_id) score += 0.08;
  if ((game.platforms || []).length > 1) score += 0.08;
  if ((game.involved_companies || []).some((entry) => entry.developer || entry.publisher)) score += 0.08;
  score += Math.min(0.18, Math.log10(Number(game.total_rating_count || 0) + 1) * 0.06);
  score += Math.min(0.12, Math.log10(Number(game.hypes || 0) + 1) * 0.04);
  if ((game.platforms || []).length === 1 && /game boy|nes|atari|commodore/i.test(game.platforms[0]?.name || "")) score -= 0.1;
  return score;
}

async function safeHltbResults(query) {
  try {
    const hltb = await getHltbClient();
    return await hltbSearch(query, hltb);
  } catch {
    return [];
  }
}

function bestExternalMatch(title, results) {
  return (results || [])
    .map((result) => ({ result, score: matchScore(title, result.title) }))
    .filter((entry) => entry.score >= 0.62)
    .sort((a, b) => b.score - a.score)[0]?.result || null;
}

function companyName(companies, role) {
  const match = companies.find((entry) => Boolean(entry[role]));
  return match?.company?.name || "";
}

function igdbCover(imageId) {
  return imageId ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${imageId}.jpg` : "";
}

function igdbTrailer(videos = []) {
  const list = Array.isArray(videos) ? videos : [];
  const trailer = list.find((video) => /trailer|launch|announcement|reveal/i.test(video.name || "")) || list[0];
  return trailer?.video_id ? `https://www.youtube.com/watch?v=${trailer.video_id}` : "";
}

async function steamTrailer(storeUrl) {
  const appId = steamAppId(storeUrl);
  if (!appId) return "";
  try {
    const api = new URL("https://store.steampowered.com/api/appdetails");
    api.searchParams.set("appids", appId);
    api.searchParams.set("l", "english");
    const data = await getJson(api.toString());
    const app = data?.[appId];
    if (!app?.success || !app?.data) return "";
    return bestSteamMovieUrl(app.data.movies || []);
  } catch {
    return "";
  }
}

function steamAppId(storeUrl) {
  const raw = String(storeUrl || "").trim();
  if (!raw) return "";
  try {
    const url = new URL(raw);
    if (!/store\.steampowered\.com$/i.test(url.hostname)) return "";
    const parts = url.pathname.split("/").filter(Boolean);
    const appIndex = parts.indexOf("app");
    return appIndex >= 0 ? String(parts[appIndex + 1] || "") : "";
  } catch {
    return "";
  }
}

function bestSteamMovieUrl(movies = []) {
  const preferred = (Array.isArray(movies) ? movies : [])
    .find((movie) => /trailer|launch|announce|gameplay/i.test(movie?.name || ""));
  const movie = preferred || (Array.isArray(movies) ? movies[0] : null);
  if (!movie) return "";
  return movie?.mp4?.max || movie?.mp4?.["480"] || movie?.webm?.max || movie?.webm?.["480"] || "";
}

function storeLinksFromWebsites(websites = []) {
  const links = { playstation: "", nintendo: "", steam: "" };
  for (const website of websites || []) {
    const url = String(website.url || "");
    const normalized = url.toLowerCase();
    if (!links.steam && normalized.includes("store.steampowered.com")) links.steam = url;
    if (!links.playstation && normalized.includes("store.playstation.com")) links.playstation = url;
    if (!links.nintendo && (normalized.includes("nintendo.com") || normalized.includes("nintendo.es"))) links.nintendo = url;
  }
  return links;
}

function bestIgdbRelease(releaseDates = []) {
  const dated = releaseDates
    .filter((release) => release.date)
    .sort((a, b) => a.date - b.date);
  return unixDate(dated[0]?.date);
}

function unixDate(seconds) {
  if (!seconds) return { date: "", text: "" };
  const date = new Date(Number(seconds) * 1000);
  if (Number.isNaN(date.getTime())) return { date: "", text: "" };
  return { date: date.toISOString().slice(0, 10), text: String(date.getUTCFullYear()) };
}

function escapeIgdbString(value) {
  return String(value || "").replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

async function getHltbClient() {
  hltbClientPromise ||= createHltbClient();
  try {
    return await hltbClientPromise;
  } catch (error) {
    hltbClientPromise = null;
    throw error;
  }
}

async function createHltbClient() {
  const response = await fetchWithTimeout(`${HLTB_BASE}/api/bleed/init?t=${Date.now()}`, {
    headers: hltbHeaders(),
  });
  if (!response.ok) throw new Error("HLTB init failed");
  const init = await response.json();
  return {
    token: init.token || "",
    hpKey: init.hpKey || "",
    hpVal: init.hpVal || "",
  };
}

async function hltbSearch(query, hltb) {
  if (!hltb.token) return [];
  const terms = searchTerms(query);

  const body = {
    searchType: "games",
    searchTerms: terms,
    searchPage: 1,
    size: HLTB_RESULT_LIMIT,
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
  if (!response.ok) return [];

  const data = await response.json();
  const results = (data.data || [])
    .map((game) => hltbResult(game, query))
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .map(({ score, ...game }) => game);
  return Promise.all(results.map(enrichMetadata));
}

function hltbResult(game, query) {
  const title = game.game_name || "";
  if (!title) return null;
  const score = matchScore(query, title);
  if (score < 0.28) return null;

  return {
    id: game.game_id ? `hltb:${game.game_id}` : title,
    hltbId: game.game_id || null,
    title,
    releaseDate: hltbDate(game.release_world || game.release_na || game.release_eu || game.release_jp),
    releaseText: hltbReleaseText(game),
    cover: game.game_image ? `${HLTB_BASE}/games/${game.game_image}` : "",
    platform: firstPlatform(game.profile_platform),
    platforms: splitList(game.profile_platform),
    genres: splitList(game.gameplay_genre || game.profile_genre || game.genres),
    developer: firstValue(game.profile_dev || game.developer || game.game_developer),
    publisher: firstValue(game.profile_pub || game.publisher || game.game_publisher),
    lengthHours: secondsToHours(game.comp_main),
    source: "HowLongToBeat",
    score,
  };
}

function matchScore(query, title) {
  const wanted = normalize(searchAlias(query));
  const found = normalize(title);
  if (!wanted || !found) return 0;
  if (wanted === found) return 1;

  let score = 0;
  if (found.startsWith(wanted)) score += 0.42;
  if (found.includes(wanted) || wanted.includes(found)) score += 0.32;

  const wantedTokens = wanted.split(" ").filter((token) => token.length > 1);
  const foundTokens = new Set(found.split(" "));
  const overlap = wantedTokens.filter((token) => foundTokens.has(token)).length;
  score += (overlap / Math.max(1, wantedTokens.length)) * 0.55;
  return Math.min(score, 1);
}

function searchTerms(query) {
  const normalized = normalize(searchAlias(query));
  return normalized.split(" ").filter(Boolean);
}

function searchAlias(query) {
  const value = String(query || "");
  const key = normalize(value).replace(/\s+/g, "");
  const aliases = {
    baldursgate3: "Baldur's Gate 3",
    tmntshreddersrevenge: "Teenage Mutant Ninja Turtles Shredder's Revenge",
    diofieldchronicles: "The DioField Chronicle",
    monsterhunterstories1: "Monster Hunter Stories",
    octopathtraveller0: "Octopath Traveler 0",
    octopathtraveler0: "Octopath Traveler 0",
    shuttenorder: "Shuten Order",
    finalfantasy12zodiacage: "Final Fantasy XII The Zodiac Age",
    dishonored1: "Dishonored",
    steinsgatereboot: "Steins Gate Re Boot",
    intergalacticthehereticproject: "Intergalactic The Heretic Prophet",
    okamiii: "Okami 2",
  };
  if (aliases[key]) return aliases[key];
  if (/\.?\s*hack\s*\/{0,2}\s*g\.?\s*u\.?/i.test(value)) return "hack g u last recode";
  return value
    .replace(/\.hack\/{2}\s*/i, "hack gu ")
    .replace(/\.hack\s*g\s*u/i, "hack gu")
    .replace(/007:\s*First\s*Light/i, "007 First Light")
    .replace(/FirstLight/g, "First Light")
    .replace(/([a-z])([A-Z])/g, "$1 $2");
}

function titleFromSlug(slug) {
  return String(slug || "")
    .replace(/--\d+$/g, "")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function enrichMetadata(result) {
  if (result.genres.length && result.developer && result.publisher) return result;
  const metadata = await wikidataMetadata(result.title);
  const inferred = inferMetadata(result.title);
  return {
    ...result,
    genres: result.genres.length ? result.genres : (metadata.genres.length ? metadata.genres : inferred.genres),
    developer: result.developer || metadata.developer || inferred.developer,
    publisher: result.publisher || metadata.publisher || inferred.publisher,
  };
}

function inferMetadata(title) {
  const value = normalize(title);
  const rules = [
    [/bayonetta/, ["Hack and Slash", "Action Adventure"], "PlatinumGames", "Nintendo"],
    [/ninja gaiden|devil may cry/, ["Hack and Slash", "Action"], "", ""],
    [/hack g u|last recode/, ["Action RPG"], "CyberConnect2", "Bandai Namco Entertainment"],
    [/007 first light|james bond/, ["Stealth", "Action Adventure"], "IO Interactive", "IO Interactive"],
    [/no rest for the wicked/, ["Action RPG"], "Moon Studios", "Private Division"],
    [/metroid prime/, ["FPS", "Metroidvania", "Action Adventure"], "Retro Studios", "Nintendo"],
    [/deltarune|undertale/, ["RPG", "Adventure"], "Toby Fox", "Toby Fox"],
    [/resident evil|silent hill/, ["Survival Horror", "Action Adventure"], "", ""],
    [/final fantasy|dragon quest|persona|fire emblem|xenoblade|octopath|bravely/, ["RPG"], "", ""],
    [/ace attorney|famicom detective|zero escape|steins gate|urban myth/, ["Visual Novel", "Adventure"], "", ""],
    [/mario|kirby|donkey kong|sonic|yooka laylee/, ["Platformer", "Adventure"], "", ""],
    [/zelda|okami|tunic|hollow knight|silksong/, ["Action Adventure"], "", ""],
    [/doom|metroid prime|bioshock/, ["FPS"], "", ""],
    [/yakuza|like a dragon/, ["Action Adventure", "RPG"], "Ryu Ga Gotoku Studio", "Sega"],
  ];
  const match = rules.find(([pattern]) => pattern.test(value));
  if (!match) return emptyMetadata();
  return { genres: match[1], developer: match[2], publisher: match[3] };
}

async function wikidataMetadata(title) {
  try {
    const search = new URL("https://www.wikidata.org/w/api.php");
    search.searchParams.set("action", "wbsearchentities");
    search.searchParams.set("search", title);
    search.searchParams.set("language", "en");
    search.searchParams.set("format", "json");
    search.searchParams.set("limit", "4");
    const searchData = await getJson(search.toString());
    const candidate = bestWikidataCandidate(title, searchData.search || []);
    if (!candidate?.id) return emptyMetadata();
    const entityData = await getJson(`https://www.wikidata.org/wiki/Special:EntityData/${candidate.id}.json`);
    const entity = entityData.entities?.[candidate.id];
    if (!entity) return emptyMetadata();
    const ids = [
      ...claimIds(entity, "P178"),
      ...claimIds(entity, "P123"),
      ...claimIds(entity, "P136"),
    ];
    const labels = await wikidataLabels(ids);
    return {
      developer: claimLabels(entity, labels, "P178")[0] || "",
      publisher: claimLabels(entity, labels, "P123")[0] || "",
      genres: cleanGenreLabels(claimLabels(entity, labels, "P136")).slice(0, 4),
    };
  } catch {
    return emptyMetadata();
  }
}

function bestWikidataCandidate(title, results) {
  const wanted = normalize(title);
  const gameResults = results.filter((item) => isVideoGameDescription(item.description));
  return gameResults.find((item) => normalize(item.label) === wanted)
    || gameResults[0]
    || results.find((item) => normalize(item.label) === wanted && isLikelyGameLabel(item.label))
    || results[0];
}

function isVideoGameDescription(description) {
  const value = String(description || "").toLowerCase();
  return value.includes("video game") || value.includes("computer game") || value.includes("console game");
}

function isLikelyGameLabel(label) {
  return /\b(game|chapter|recode|remake|remaster|collection|trilogy)\b/i.test(label);
}

function cleanGenreLabels(genres) {
  const aliases = new Map([
    ["action adventure game", "Action Adventure"],
    ["action role playing game", "Action RPG"],
    ["role playing video game", "RPG"],
    ["role playing game", "RPG"],
    ["japanese role playing video game", "JRPG"],
    ["first person shooter", "FPS"],
    ["third person shooter", "Third Person Shooter"],
    ["hack and slash", "Hack and Slash"],
    ["beat em up", "Beat 'em Up"],
    ["platform game", "Platformer"],
    ["puzzle video game", "Puzzle"],
    ["adventure game", "Adventure"],
    ["visual novel", "Visual Novel"],
    ["strategy video game", "Strategy"],
    ["stealth game", "Stealth"],
    ["survival horror", "Survival Horror"],
    ["metroidvania", "Metroidvania"],
  ]);
  const cleaned = genres
    .map((genre) => {
      const key = normalize(genre);
      return aliases.get(key) || titleCase(genre.replace(/\bvideo game\b/gi, "").replace(/\bgame\b/gi, "").trim());
    })
    .filter(Boolean);
  return [...new Set(cleaned)];
}

function titleCase(value) {
  return String(value || "")
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.length <= 3 && word === word.toUpperCase() ? word : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function claimIds(entity, property) {
  return (entity.claims?.[property] || [])
    .map((claim) => claim.mainsnak?.datavalue?.value?.id)
    .filter(Boolean);
}

function claimLabels(entity, labels, property) {
  return claimIds(entity, property)
    .map((id) => labels[id])
    .filter(Boolean);
}

async function wikidataLabels(ids) {
  const uniqueIds = [...new Set(ids)].slice(0, 30);
  if (!uniqueIds.length) return {};
  const api = new URL("https://www.wikidata.org/w/api.php");
  api.searchParams.set("action", "wbgetentities");
  api.searchParams.set("ids", uniqueIds.join("|"));
  api.searchParams.set("props", "labels");
  api.searchParams.set("languages", "en");
  api.searchParams.set("format", "json");
  const data = await getJson(api.toString());
  return Object.fromEntries(Object.entries(data.entities || {}).map(([id, entity]) => [id, entity.labels?.en?.value || ""]));
}


function emptyMetadata() {
  return { developer: "", publisher: "", genres: [] };
}

async function getJson(url) {
  const response = await fetchWithTimeout(url, { headers: genericHeaders(), timeoutMs: 22000 });
  if (!response.ok) return {};
  return response.json();
}

function hltbDate(value) {
  if (!value) return "";
  if (typeof value === "string") {
    const iso = value.match(/(\d{4}-\d{2}-\d{2})/);
    if (iso) return iso[1];
    const year = value.match(/\b(19|20)\d{2}\b/);
    return year ? "" : "";
  }

  if (typeof value === "number") {
    if (value <= 0) return "";
    const date = new Date(value > 10000000000 ? value : value * 1000);
    if (Number.isNaN(date.getTime()) || date.getFullYear() < 1990) return "";
    return date.toISOString().slice(0, 10);
  }

  return "";
}

function hltbReleaseText(game) {
  const value = game.release_world || game.release_na || game.release_eu || game.release_jp || "";
  const text = String(value);
  const year = text.match(/\b(19|20)\d{2}\b/);
  return year && !hltbDate(value) ? year[0] : "";
}

function splitList(value) {
  if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean);
  return String(value || "")
    .split(/,\s*|\s*\|\s*/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function firstValue(value) {
  return splitList(value)[0] || "";
}

function firstPlatform(value) {
  const platforms = splitList(value);
  const preferred = [
    [/playstation 5|ps5/i, "PS5"],
    [/switch 2/i, "Switch 2"],
    [/nintendo switch/i, "Switch"],
    [/playstation 4|ps4/i, "PS4"],
    [/windows|\bpc\b/i, "PC"],
  ];
  for (const [pattern, label] of preferred) {
    if (platforms.some((platform) => pattern.test(platform))) return label;
  }
  return platforms[0] || "";
}

function cleanTitle(title) {
  return title
    .replace(/\([^)]*\)/g, "")
    .replace(/FirstLight/g, "First Light")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[™®]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalize(value) {
  return cleanTitle(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function secondsToHours(seconds) {
  if (!seconds) return null;
  return Math.round((Number(seconds) / 3600) * 2) / 2;
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs || 12000);
  try {
    const { timeoutMs, ...fetchOptions } = options;
    return await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
      headers: {
        ...genericHeaders(),
        ...(fetchOptions.headers || {}),
      },
    });
  } finally {
    clearTimeout(timeout);
  }
}

function genericHeaders() {
  return {
    Accept: "application/json,text/html;q=0.8",
    "User-Agent": "Mozilla/5.0 (compatible; GameList/1.0)",
  };
}

function hltbHeaders() {
  return {
    ...genericHeaders(),
    Origin: HLTB_BASE,
    Referer: `${HLTB_BASE}/`,
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
