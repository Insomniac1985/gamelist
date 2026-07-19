import fs from "node:fs/promises";

const DATA_FILE = new URL("../data/seed-games.json", import.meta.url);
const SEARCH = "https://www.wikidata.org/w/api.php?action=wbsearchentities&language=en&format=json&limit=5";

const data = JSON.parse(await fs.readFile(DATA_FILE, "utf8"));
let checked = 0;
let renamed = 0;

for (const game of data.games) {
  checked += 1;
  const canonical = await findCanonicalName(game.title);
  if (canonical && shouldRename(game.title, canonical)) {
    console.log(`${game.title} -> ${canonical}`);
    game.title = canonical;
    game.updatedAt = new Date().toISOString();
    renamed += 1;
  }
  await wait(120);
}

await fs.writeFile(DATA_FILE, `${JSON.stringify(data, null, 2)}\n`, "utf8");
console.log(`Checked ${checked} games. Renamed ${renamed}.`);

async function findCanonicalName(title) {
  const response = await fetchWithTimeout(`${SEARCH}&search=${encodeURIComponent(cleanTitle(title))}`);
  if (!response.ok) return "";
  const data = await response.json();
  const results = data.search || [];
  const match = results.find((item) => (item.description || "").toLowerCase().includes("video game"));
  return match?.label || "";
}

function shouldRename(current, canonical) {
  const a = normalize(current);
  const b = normalize(canonical);
  if (!a || !b || a === b) return false;
  const currentTokens = new Set(a.split(" "));
  const canonicalTokens = new Set(b.split(" "));
  const overlap = [...currentTokens].filter((token) => canonicalTokens.has(token)).length;
  const coverage = overlap / Math.max(currentTokens.size, canonicalTokens.size);
  return coverage >= 0.72;
}

function cleanTitle(title) {
  return title
    .replace(/\([^)]*\)/g, "")
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

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "GameList/1.0 (local personal project)" },
    });
  } finally {
    clearTimeout(timeout);
  }
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
