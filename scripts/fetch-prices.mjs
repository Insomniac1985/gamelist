import fs from "node:fs/promises";

const DATA_FILE = new URL("../data/seed-games.json", import.meta.url);
const PROVIDERS = [
  { store: "Amazon.es", search: (q) => `https://www.amazon.es/s?k=${encodeURIComponent(q)}`, parse: parseAmazon },
  { store: "Xtralife", search: (q) => `https://www.xtralife.com/buscar/${encodeURIComponent(q)}`, parse: parseGeneric },
  { store: "GAME.es", search: (q) => `https://www.game.es/buscar/${encodeURIComponent(q)}`, parse: parseGeneric },
];

const data = JSON.parse(await fs.readFile(DATA_FILE, "utf8"));
const games = data.games.filter((game) => !game.deletedAt && game.section !== "backlog");
let checked = 0;
let withPrices = 0;

for (const game of games) {
  const query = `${game.title} ${game.platform}`.trim();
  game.prices = await Promise.all(PROVIDERS.map((provider) => findPrice(provider, game, query)));
  game.updatedAt = new Date().toISOString();
  checked += 1;
  if (game.prices.some((price) => price.price)) withPrices += 1;
  console.log(`${checked}/${games.length}: ${game.title} (${game.prices.filter((price) => price.price).length} prices)`);
  await wait(180);
}

await fs.writeFile(DATA_FILE, `${JSON.stringify(data, null, 2)}\n`, "utf8");
console.log(`Checked ${checked} non-backlog games. ${withPrices} have at least one visible price.`);

async function findPrice(provider, game, query) {
  const url = provider.search(query);
  try {
    const response = await fetchWithTimeout(url);
    const html = await response.text();
    const result = provider.parse(html, game.title, game.platform);
    return {
      store: provider.store,
      price: result.price || "",
      numericPrice: parsePrice(result.price),
      matchedTitle: result.matchedTitle || "",
      url,
      checkedAt: new Date().toISOString(),
    };
  } catch {
    return {
      store: provider.store,
      price: "",
      numericPrice: null,
      matchedTitle: "",
      url,
      checkedAt: new Date().toISOString(),
    };
  }
}

function parseAmazon(html, title, platform) {
  const cards = html.split('data-component-type="s-search-result"').slice(1);
  const titleTokens = normalize(title).split(" ").filter((token) => token.length > 2);
  const platformValue = normalize(platform).replace("ps4", "playstation").replace("ps5", "playstation");
  let best = null;

  for (const card of cards) {
    const titleMatch = card.match(/<h2[^>]*aria-label="([^"]+)"/i) || card.match(/<h2[\s\S]*?<span>([^<]+)<\/span>/i);
    const matchedTitle = decodeHtml(titleMatch?.[1] || "");
    const normalizedMatch = normalize(matchedTitle);
    const matchingTokens = titleTokens.filter((token) => normalizedMatch.includes(token)).length;
    if (matchingTokens < Math.min(2, titleTokens.length)) continue;
    if (platformValue && !normalizedMatch.includes(platformValue) && !normalizedMatch.includes(normalize(platform))) continue;

    const priceMatch = card.match(/<span class="a-offscreen">([\d.,]+\s*(?:€|EUR))/i)
      || card.match(/data-csa-c-price-to-pay="([\d.]+)"/i);
    if (!priceMatch) continue;
    const price = priceMatch[1].includes("€") || priceMatch[1].includes("EUR")
      ? priceMatch[1].replace("EUR", "€").replace(/\s+/g, " ")
      : `${priceMatch[1].replace(".", ",")} €`;
    const numericPrice = parsePrice(price);
    if (!best || numericPrice < best.numericPrice) best = { price, numericPrice, matchedTitle };
  }
  return best || { price: "", matchedTitle: "" };
}

function parseGeneric(html) {
  const match = html.match(/(\d{1,3}(?:[.,]\d{2}))\s*€/i);
  return { price: match ? `${match[1].replace(".", ",")} €` : "", matchedTitle: "" };
}

function parsePrice(price) {
  if (!price) return null;
  const value = Number(price.replace(/[^\d,]/g, "").replace(",", "."));
  return Number.isFinite(value) ? value : null;
}

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: {
        "Accept": "text/html",
        "Accept-Language": "es-ES,es;q=0.9,en;q=0.6",
        "User-Agent": "Mozilla/5.0 (compatible; GameList/1.0)",
      },
    });
  } finally {
    clearTimeout(timeout);
  }
}

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function decodeHtml(value) {
  return String(value || "")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
