const PROVIDERS = [
  {
    store: "Amazon.es",
    search: (q) => `https://www.amazon.es/s?k=${encodeURIComponent(q)}`,
    parse: parseAmazon,
  },
  {
    store: "Xtralife",
    search: (q) => `https://www.xtralife.com/buscar/${encodeURIComponent(q)}`,
    parse: parseGeneric,
  },
  {
    store: "GAME.es",
    search: (q) => `https://www.game.es/buscar/${encodeURIComponent(q)}`,
    parse: parseGeneric,
  },
];

export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const title = url.searchParams.get("title")?.trim();
  const platform = url.searchParams.get("platform")?.trim() || "";
  if (!title) return json({ prices: [] });

  const query = `${retailTitle(title)} ${platform}`.trim();
  const prices = await Promise.all(PROVIDERS.map((provider) => findPrice(provider, title, platform, query)));
  return json({ prices });
}

async function findPrice(provider, title, platform, query) {
  const url = provider.search(query);
  try {
    const response = await fetch(url, {
      headers: {
        "Accept": "text/html",
        "Accept-Language": "es-ES,es;q=0.9,en;q=0.6",
        "User-Agent": "Mozilla/5.0 (compatible; GameList/1.0)",
      },
    });
    const html = await response.text();
    const result = provider.parse(html, title, platform);
    const price = result.price || "";
    return {
      store: provider.store,
      price,
      numericPrice: parsePrice(price),
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
  const normalizedTitle = normalize(title);
  const normalizedPlatform = normalize(platform);
  let best = null;

  for (const card of cards) {
    const titleMatch = card.match(/<h2[^>]*aria-label="([^"]+)"/i) || card.match(/<h2[\s\S]*?<span>([^<]+)<\/span>/i);
    const matchedTitle = decodeHtml(titleMatch?.[1] || "");
    const normalizedMatch = normalize(matchedTitle);
    if (!normalizedMatch.includes(normalizedTitle.split(" ")[0])) continue;
    if (normalizedPlatform && !normalizedMatch.includes(normalizedPlatform.replace("ps", "playstation"))) continue;

    const priceMatch = card.match(/<span class="a-offscreen">([\d.,]+\s*(?:€|EUR))/i)
      || card.match(/data-csa-c-price-to-pay="([\d.]+)"/i);
    if (!priceMatch) continue;
    const price = priceMatch[1].includes("€") || priceMatch[1].includes("EUR")
      ? priceMatch[1].replace("EUR", "€").replace(/\s+/g, " ")
      : `${priceMatch[1].replace(".", ",")} €`;
    const numericPrice = parsePrice(price);
    if (!best || numericPrice < best.numericPrice) {
      best = { price, numericPrice, matchedTitle };
    }
  }
  return best || { price: "", matchedTitle: "" };
}

function parseGeneric(html, title) {
  const normalizedTitle = normalize(retailTitle(title));
  const candidates = [...html.matchAll(/([\s\S]{0,420}?)(\d{1,3}(?:[.,]\d{2}))\s*€/gi)];
  for (const candidate of candidates) {
    const context = decodeHtml(candidate[1].replace(/<[^>]+>/g, " "));
    const normalizedContext = normalize(context);
    if (normalizedTitle && !tokenOverlap(normalizedTitle, normalizedContext)) continue;
    return { price: `${candidate[2].replace(".", ",")} €`, matchedTitle: context.trim().slice(0, 160) };
  }
  const match = html.match(/(\d{1,3}(?:[.,]\d{2}))\s*€/i);
  return { price: match ? `${match[1].replace(".", ",")} €` : "", matchedTitle: "" };
}

function parsePrice(price) {
  if (!price) return null;
  const value = Number(price.replace(/[^\d,]/g, "").replace(",", "."));
  return Number.isFinite(value) ? value : null;
}

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function tokenOverlap(title, context) {
  const wanted = title.split(" ").filter((token) => token.length > 1);
  if (!wanted.length) return true;
  const found = new Set(context.split(" "));
  return wanted.filter((token) => found.has(token)).length >= Math.min(2, wanted.length);
}

function retailTitle(title) {
  return String(title || "")
    .replace(/\.hack\/{2}\s*/i, "hack gu ")
    .replace(/007:\s*First\s*Light/i, "007 First Light")
    .replace(/FirstLight/g, "First Light")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[™®]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeHtml(value) {
  return String(value || "")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
