const PROVIDERS = [
  {
    store: "Amazon.es",
    search: (q) => `https://www.amazon.es/s?k=${encodeURIComponent(q)}`,
    parse: parseAmazon,
  },
  {
    store: "Xtralife",
    search: (q) => `https://www.xtralife.com/buscar/${encodeURIComponent(q)}`,
    lookup: lookupXtralife,
  },
  {
    store: "GAME.es",
    search: (q) => `https://www.game.es/buscar/${encodeURIComponent(q)}`,
    lookup: lookupGameEs,
  },
  {
    store: "Playasia",
    search: (q) => playasiaSearchUrl(q),
    parse: parseGeneric,
  },
];

export async function onRequestGet({ request, env = {} }) {
  const url = new URL(request.url);
  const title = url.searchParams.get("title")?.trim();
  const platform = url.searchParams.get("platform")?.trim() || "";
  if (!title) return json({ prices: [] });

  const query = `${retailTitle(title)} ${platform}`.trim();
  const prices = await Promise.all(PROVIDERS.map((provider) => findPrice(provider, title, platform, query, env)));
  return json({ prices });
}

async function findPrice(provider, title, platform, query, env = {}) {
  const url = provider.search(query);
  if (provider.store === "Playasia" && env.PLAYASIA_API_KEY && env.PLAYASIA_USER_ID) {
    try {
      const result = await lookupPlayasia(title, platform, query, env);
      return {
        store: provider.store,
        price: result.price || "",
        numericPrice: parsePrice(result.price || ""),
        matchedTitle: result.matchedTitle || "",
        url: result.url || url,
        checkedAt: new Date().toISOString(),
      };
    } catch {
      // Fall through to the public page parser below.
    }
  }
  if (provider.lookup) {
    try {
      const result = await provider.lookup(title, platform, query);
      return {
        store: provider.store,
        price: result.price || "",
        numericPrice: parsePrice(result.price || ""),
        matchedTitle: result.matchedTitle || "",
        url: result.url || url,
        checkedAt: new Date().toISOString(),
      };
    } catch {
      return missingPrice(provider.store, url);
    }
  }

  try {
    const response = await fetch(url, {
      headers: {
        "Accept": "text/html",
        "Accept-Language": "es-ES,es;q=0.9,en;q=0.6",
        "User-Agent": "Mozilla/5.0 (compatible; GameList/1.0)",
      },
    });
    const html = await response.text();
    let result = provider.parse(html, title, platform);
    if (provider.store === "Playasia" && !result.price) {
      result = await lookupPlayasiaReader(title, platform, query);
    }
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
    return missingPrice(provider.store, url);
  }
}

async function lookupPlayasiaReader(title, platform, query) {
  const url = playasiaSearchUrl(query);
  const readerUrl = `https://r.jina.ai/http://r.jina.ai/http://${url}`;
  const response = await fetch(readerUrl, {
    headers: {
      "Accept": "text/plain,text/markdown",
      "User-Agent": "Mozilla/5.0 (compatible; GameList/1.0)",
    },
    cf: { cacheTtl: 900, cacheEverything: true },
  });
  if (!response.ok) return { price: "", matchedTitle: "" };
  const markdown = await response.text();
  return parseGeneric(markdown, title, platform);
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
  const dollarCandidates = [...html.matchAll(/([\s\S]{0,420}?)(?:US\s*)?\$\s*(\d{1,4}(?:[.,]\d{2}))/gi)];
  for (const candidate of dollarCandidates) {
    const context = decodeHtml(candidate[1].replace(/<[^>]+>/g, " "));
    const normalizedContext = normalize(context);
    if (normalizedTitle && !tokenOverlap(normalizedTitle, normalizedContext)) continue;
    return { price: `$${candidate[2].replace(",", ".")}`, matchedTitle: context.trim().slice(0, 160) };
  }
  const match = html.match(/(\d{1,3}(?:[.,]\d{2}))\s*€/i);
  if (match) return { price: `${match[1].replace(".", ",")} €`, matchedTitle: "" };
  const dollarMatch = html.match(/(?:US\s*)?\$\s*(\d{1,4}(?:[.,]\d{2}))/i);
  return { price: dollarMatch ? `$${dollarMatch[1].replace(",", ".")}` : "", matchedTitle: "" };
}

async function lookupGameEs(title, platform, query) {
  const payload = {
    Head: retailTitle(query),
    Page: 0,
    Order: 7,
    CategoryFilter: [],
    Category: null,
    SKU: null,
  };
  const response = await fetch("https://www.game.es/api/search", {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Accept-Language": "es-ES,es;q=0.9,en;q=0.6",
      "Content-Type": "application/json; charset=utf-8",
      "Origin": "https://www.game.es",
      "Referer": `https://www.game.es/buscar/${encodeURIComponent(query)}`,
      "User-Agent": "Mozilla/5.0 (compatible; GameList/1.0)",
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error("GAME search failed");
  const data = await response.json();
  const products = Array.isArray(data.Products) ? data.Products : [];
  const match = bestProduct(products.map(gameEsProduct), title, platform);
  return match || { price: "", matchedTitle: "" };
}

function gameEsProduct(product) {
  const offers = Array.isArray(product.Offers) ? product.Offers : [];
  const offer = offers
    .filter((entry) => Number.isFinite(Number(entry.SellPrice)))
    .sort((a, b) => Number(a.SellPrice) - Number(b.SellPrice))[0];
  const price = offer ? euro(Number(offer.SellPrice)) : "";
  const navigation = product.Navigation ? `https://www.game.es/${String(product.Navigation).replace(/^\/+/, "")}` : "";
  return {
    title: product.Name || "",
    platform: product.FamilyName || product.Family || (product.Platforms || []).map((entry) => entry.Name).join(" "),
    price,
    matchedTitle: product.Name || "",
    url: navigation || "",
  };
}

async function lookupXtralife(title, platform, query) {
  const endpoint = new URL("https://api.xtralife.com/public-api/v1/search-sku");
  endpoint.searchParams.set("term", xtralifeTerm(title));
  endpoint.searchParams.set("filters", "[]");
  endpoint.searchParams.set("storefrontId", "1");
  endpoint.searchParams.set("page", "1");
  endpoint.searchParams.set("howMany", "24");
  const response = await fetch(endpoint.toString(), {
    headers: {
      "Accept": "application/json",
      "Accept-Language": "es-ES,es;q=0.9,en;q=0.6",
      "Origin": "https://www.xtralife.com",
      "Referer": "https://www.xtralife.com/",
      "User-Agent": "Mozilla/5.0 (compatible; GameList/1.0)",
    },
  });
  if (!response.ok) throw new Error("Xtralife search failed");
  const data = await response.json();
  const products = Array.isArray(data.body?.results) ? data.body.results : [];
  const match = bestProduct(products.map(xtralifeProduct), title, platform);
  return match || { price: "", matchedTitle: "" };
}

async function lookupPlayasia(title, platform, query, env) {
  const endpoint = new URL("https://www.play-asia.com/__api__.php");
  const params = {
    query: "listing",
    quick: "0",
    mask: "pnl",
    results: "12",
    start: "0",
    onsale: "0",
    instock: "0",
    type: "1",
    compatible: "0",
    genre: "0",
    encoding: "0",
    version: "0",
    skip_preowned: "1",
    keyword: retailTitle(query),
    key: env.PLAYASIA_API_KEY,
    user: env.PLAYASIA_USER_ID,
  };
  Object.entries(params).forEach(([key, value]) => endpoint.searchParams.set(key, value));
  const response = await fetch(endpoint.toString(), {
    headers: {
      "Accept": "application/xml,text/xml",
      "User-Agent": "Mozilla/5.0 (compatible; GameList/1.0)",
    },
  });
  if (!response.ok) throw new Error("Playasia API failed");
  const xml = await response.text();
  const products = playasiaProducts(xml);
  const match = bestProduct(products, title, platform);
  return match || { price: "", matchedTitle: "" };
}

function playasiaProducts(xml) {
  const items = xml.match(/<item\b[\s\S]*?<\/item>/gi) || [];
  return items.map((item) => {
    const price = xmlTag(item, "fxprice") || xmlTag(item, "price");
    return {
      title: xmlTag(item, "name"),
      platform: xmlTag(item, "platform") || xmlTag(item, "compatible") || xmlTag(item, "version"),
      price: price ? `$${String(price).replace(/[^\d.,]/g, "").replace(",", ".")}` : "",
      matchedTitle: xmlTag(item, "name"),
      url: xmlTag(item, "url"),
    };
  }).filter((item) => item.title);
}

function xmlTag(xml, tag) {
  const match = String(xml || "").match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? decodeHtml(match[1].replace(/<!\\[CDATA\\[|\\]\\]>/g, "").trim()) : "";
}

function xtralifeProduct(product) {
  const priceValue = Number(product.currentPrice?.price ?? product.currentPrice?.normal_price ?? product.currentPrice?.pvp);
  const url = product.url?.uri || product.url || product.details_uri || "";
  return {
    title: product.name || "",
    platform: product.cc1 || characteristic(product, "platform"),
    price: Number.isFinite(priceValue) ? euro(priceValue) : "",
    matchedTitle: product.name || "",
    url: url ? `https://www.xtralife.com/${String(url).replace(/^\/+/, "")}` : "",
  };
}

function bestProduct(products, title, platform) {
  const normalizedTitle = normalize(retailTitle(title));
  const normalizedPlatform = normalize(platform);
  return products
    .map((product) => ({
      ...product,
      score: productScore(product, normalizedTitle, normalizedPlatform),
    }))
    .filter((product) => product.score >= 0.45)
    .sort((a, b) => b.score - a.score || (parsePrice(a.price) ?? 9999) - (parsePrice(b.price) ?? 9999))[0] || null;
}

function productScore(product, normalizedTitle, normalizedPlatform) {
  const normalizedProduct = normalize(product.title);
  const normalizedProductPlatform = normalize(product.platform);
  if (!normalizedProduct) return 0;
  let score = 0;
  if (normalizedProduct === normalizedTitle) score += 0.65;
  if (normalizedProduct.includes(normalizedTitle) || normalizedTitle.includes(normalizedProduct)) score += 0.35;
  if (tokenOverlap(normalizedTitle, normalizedProduct)) score += 0.28;
  if (normalizedPlatform && platformMatches(normalizedPlatform, normalizedProductPlatform)) score += 0.18;
  if (product.price) score += 0.08;
  return score;
}

function platformMatches(wanted, found) {
  if (!wanted) return true;
  if (found.includes(wanted)) return true;
  if (wanted === "switch" && /nintendo switch|switch/.test(found) && !found.includes("switch 2")) return true;
  if (wanted === "switch 2" && found.includes("switch 2")) return true;
  if (wanted === "ps5" && /ps5|playstation 5/.test(found)) return true;
  if (wanted === "ps4" && /ps4|playstation 4/.test(found)) return true;
  if (wanted === "ps3" && /ps3|playstation 3/.test(found)) return true;
  if (wanted === "ps2" && /ps2|playstation 2/.test(found)) return true;
  if (wanted === "pc" && /pc|windows|steam/.test(found)) return true;
  return false;
}

function characteristic(product, name) {
  return (product.characteristics || []).find((entry) => entry.name === name)?.value || "";
}

function xtralifeTerm(query) {
  return retailTitle(query)
    .replace(/\bNintendo\s+Switch\b/i, "Switch")
    .replace(/\bPlayStation\s*(\d)\b/i, "PS$1")
    .trim();
}

function parsePrice(price) {
  if (!price) return null;
  const cleaned = price.includes(",") && !price.includes(".")
    ? price.replace(/[^\d,]/g, "").replace(",", ".")
    : price.replace(/[^\d.]/g, "");
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

function euro(value) {
  return `${Number(value).toFixed(2).replace(".", ",")} €`;
}

function missingPrice(store, url) {
  return {
    store,
    price: "",
    numericPrice: null,
    matchedTitle: "",
    url,
    checkedAt: new Date().toISOString(),
  };
}

function playasiaSearchUrl(query) {
  return `https://www.play-asia.com/en/search/${retailTitle(query).split(/\s+/).map(encodeURIComponent).join("+")}`;
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
