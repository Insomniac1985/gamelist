const PHYSICAL_PROVIDERS = [
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
    store: "Retro Island NY",
    search: (q) => retroIslandSearchUrl(q),
    lookup: lookupRetroIslandNy,
  },
];

const DIGITAL_PROVIDERS = [
  {
    store: "Nintendo España",
    search: (q) => `https://www.nintendo.com/es-es/Buscar/Buscar-299117.html?q=${encodeURIComponent(q)}&f=147394-86`,
    lookup: lookupNintendoEs,
  },
  {
    store: "PlayStation España",
    search: (q) => `https://www.playstation.com/es-es/search/?q=${encodeURIComponent(q)}`,
    lookup: lookupPlayStationEs,
  },
  {
    store: "Steam",
    search: (q) => `https://store.steampowered.com/search/?term=${encodeURIComponent(q)}`,
    parse: parseSteam,
  },
];

const PLAYSTATION_CATALOG_ID = "28c9c2b2-cecc-415c-9a08-482a605cb104";
const PLAYSTATION_CATALOG_HASH = "4ce7d410a4db2c8b635a48c1dcec375906ff63b19dadd87e073f8fd0c0481d35";
const PLAYSTATION_PRICING_HASH = "abcb311ea830e679fe2b697a27f755764535d825b24510ab1239a4ca3092bd09";

export async function onRequestGet({ request, env = {} }) {
  const url = new URL(request.url);
  const title = url.searchParams.get("title")?.trim();
  const platform = url.searchParams.get("platform")?.trim() || "";
  const digital = url.searchParams.get("digital") === "1";
  const debug = url.searchParams.has("debug");
  if (!title) return json({ prices: [] });

  const query = digital ? retailTitle(title) : `${retailTitle(title)} ${platform}`.trim();
  const providers = digital ? digitalProvidersForPlatform(platform) : PHYSICAL_PROVIDERS;
  const prices = await Promise.all(providers.map((provider) => findPrice(provider, title, platform, query, env, debug)));
  return json({ prices });
}

function digitalProvidersForPlatform(platform) {
  const normalized = normalizePlatform(platform);
  if (normalized === "switch" || normalized === "switch2") return DIGITAL_PROVIDERS.filter((provider) => provider.store === "Nintendo España");
  if (normalized === "ps4" || normalized === "ps5" || normalized === "playstation4" || normalized === "playstation5") {
    return DIGITAL_PROVIDERS.filter((provider) => provider.store === "PlayStation España");
  }
  if (normalized === "pc" || normalized === "steam") return DIGITAL_PROVIDERS.filter((provider) => provider.store === "Steam");
  return [];
}

function normalizePlatform(platform) {
  return String(platform || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

async function findPrice(provider, title, platform, query, env = {}, debug = false) {
  const url = provider.search(query);
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
    const result = provider.parse(html, title, platform);
    const price = result.price || "";
    return {
      store: provider.store,
      price,
      numericPrice: parsePrice(price),
      matchedTitle: result.matchedTitle || "",
      url: result.url || url,
      checkedAt: new Date().toISOString(),
    };
  } catch {
    return missingPrice(provider.store, url);
  }
}

async function lookupLinkOnly() {
  return { price: "", matchedTitle: "" };
}

async function lookupNintendoEs(title, platform, query) {
  const endpoint = new URL("https://searching.nintendo-europe.com/es/select");
  endpoint.searchParams.set("fq", "type:GAME");
  endpoint.searchParams.set("rows", "10");
  endpoint.searchParams.set("q", retailTitle(title || query));
  endpoint.searchParams.set("wt", "json");
  const response = await fetch(endpoint.toString(), {
    headers: {
      "Accept": "application/json",
      "Accept-Language": "es-ES,es;q=0.9,en;q=0.6",
      "Origin": "https://www.nintendo.com",
      "Referer": `https://www.nintendo.com/es-es/Buscar/Buscar-299117.html?q=${encodeURIComponent(query)}&f=147394-86`,
      "User-Agent": "Mozilla/5.0 (compatible; GameList/1.0)",
    },
    cf: { cacheTtl: 900, cacheEverything: true },
  });
  if (!response.ok) throw new Error("Nintendo search failed");
  const data = await response.json();
  const docs = Array.isArray(data.response?.docs) ? data.response.docs : [];
  const products = docs.map(nintendoProduct);
  const match = bestProduct(products, title, "");
  return match || { price: "", matchedTitle: "" };
}

function nintendoProduct(product) {
  const priceValue = Number(product.price_lowest_f ?? product.price_regular_f ?? product.price_sorting_f);
  const url = product.url
    ? `https://www.nintendo.com${String(product.url).startsWith("/") ? "" : "/"}${product.url}`
    : "";
  return {
    title: product.title || product.title_master_s || product.sorting_title || "",
    platform: [
      ...(Array.isArray(product.system_names_txt) ? product.system_names_txt : []),
      ...(Array.isArray(product.playable_on_txt) ? product.playable_on_txt : []),
    ].join(" "),
    price: Number.isFinite(priceValue) ? euro(priceValue) : "",
    matchedTitle: product.title || product.title_master_s || product.sorting_title || "",
    url,
  };
}

async function lookupPlayStationEs(title, platform) {
  const concept = await findPlayStationConcept(title, platform);
  if (!concept) return { price: "", matchedTitle: "" };
  const data = await playStationGraphql("metGetPricingDataByConceptId", { conceptId: concept.id }, PLAYSTATION_PRICING_HASH);
  const price = bestPlayStationPrice(data.data?.conceptRetrieve);
  return {
    price: price?.label || "",
    matchedTitle: concept.title || "",
    url: `https://store.playstation.com/es-es/concept/${concept.id}`,
  };
}

async function findPlayStationConcept(title, platform) {
  const wanted = normalize(retailTitle(title));
  if (!wanted) return null;
  const firstPage = await playStationCatalogPage(0, 1);
  const total = Math.min(Number(firstPage.pageInfo?.totalCount) || 0, 12000);
  if (!total) return null;

  let low = 0;
  let high = total - 1;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const page = await playStationCatalogPage(middle, 1);
    const name = normalize(page.concepts?.[0]?.name || "");
    if (!name || name < wanted) low = middle + 1;
    else high = middle - 1;
  }

  const start = Math.max(0, low - 40);
  const window = await playStationCatalogPage(start, 100);
  const products = (window.concepts || []).map((concept) => ({
    title: concept.name || "",
    platform: "PlayStation PS5 PS4",
    price: "",
    matchedTitle: concept.name || "",
    url: `https://store.playstation.com/es-es/concept/${concept.id}`,
    id: concept.id,
  }));
  return bestProduct(products, title, platform) || null;
}

async function playStationCatalogPage(offset, size) {
  const variables = {
    id: PLAYSTATION_CATALOG_ID,
    pageArgs: { size, offset },
    sortBy: { name: "conceptName", isAscending: true },
    filterBy: [],
    facetOptions: [],
  };
  const data = await playStationGraphql("categoryGridRetrieve", variables, PLAYSTATION_CATALOG_HASH);
  return data.data?.categoryGridRetrieve || {};
}

async function playStationGraphql(operationName, variables, sha256Hash) {
  const endpoint = new URL("https://web.np.playstation.com/api/graphql/v1/op");
  endpoint.searchParams.set("operationName", operationName);
  endpoint.searchParams.set("variables", JSON.stringify(variables));
  endpoint.searchParams.set("extensions", JSON.stringify({
    persistedQuery: { version: 1, sha256Hash },
  }));
  const response = await fetch(endpoint.toString(), {
    headers: {
      "Accept": "application/json",
      "Accept-Language": "es-ES,es;q=0.9,en;q=0.6",
      "Content-Type": "application/json",
      "Origin": "https://store.playstation.com",
      "Referer": "https://store.playstation.com/es-es/",
      "User-Agent": "Mozilla/5.0 (compatible; GameList/1.0)",
      "x-psn-store-locale-override": "es-es",
    },
    cf: { cacheTtl: 900, cacheEverything: true },
  });
  if (!response.ok) throw new Error("PlayStation request failed");
  return response.json();
}

function bestPlayStationPrice(concept) {
  const prices = [];
  collectPlayStationPrices(concept, prices);
  const publicPrices = prices.filter((price) => !price.subscription);
  return (publicPrices.length ? publicPrices : prices)
    .filter((price) => price.numericPrice !== null)
    .sort((a, b) => a.numericPrice - b.numericPrice)[0] || null;
}

function collectPlayStationPrices(value, prices) {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((entry) => collectPlayStationPrices(entry, prices));
    return;
  }
  const rawPrice = value.discountedPrice || value.basePrice;
  const cents = Number(value.discountedValue ?? value.basePriceValue);
  if (rawPrice && Number.isFinite(cents) && value.currencyCode === "EUR") {
    prices.push({
      label: normalizePlayStationPrice(rawPrice),
      numericPrice: cents / 100,
      subscription: Boolean(value.isTiedToSubscription)
        || (Array.isArray(value.serviceBranding) && value.serviceBranding.some((entry) => entry && entry !== "NONE")),
    });
  }
  Object.values(value).forEach((entry) => collectPlayStationPrices(entry, prices));
}

function normalizePlayStationPrice(value) {
  return String(value || "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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

function parseSteam(html, title) {
  const normalizedTitle = normalize(retailTitle(title));
  const rows = [...html.matchAll(/<a\s+href="([^"]+)"[^>]*class="search_result_row[\s\S]*?<\/a>/gi)]
    .map((match) => ({ url: decodeHtml(match[1] || ""), html: match[0] }));
  const products = [];
  for (const rowData of rows) {
    const row = rowData.html;
    const titleMatch = row.match(/<span class="title">([^<]+)<\/span>/i);
    const matchedTitle = decodeHtml(titleMatch?.[1] || "");
    if (!matchedTitle || !tokenOverlap(normalizedTitle, normalize(matchedTitle))) continue;
    const priceMatch = row.match(/<div class="discount_final_price">([\s\S]*?)<\/div>/i)
      || row.match(/<div class="col search_price[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
    const priceText = decodeHtml(String(priceMatch?.[1] || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
    const price = normalizedSteamPrice(priceText);
    const url = rowData.url;
    const numericPrice = parsePrice(price);
    if (!price && !/free|gratis/i.test(priceText)) continue;
    products.push({ title: matchedTitle, platform: "PC Steam", price, numericPrice, matchedTitle, url });
  }
  return bestProduct(products, title, "PC") || { price: "", matchedTitle: "" };
}

function normalizedSteamPrice(value) {
  const text = String(value || "").trim();
  if (/free|gratis/i.test(text)) return "0,00 €";
  const match = text.match(/(\d{1,3}(?:[.,]\d{2}))\s*€/);
  return match ? `${match[1].replace(".", ",")} €` : "";
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

async function lookupRetroIslandNy(title, platform, query) {
  const endpoint = new URL("https://retroislandny.com/search/suggest.json");
  endpoint.searchParams.set("q", query);
  endpoint.searchParams.set("resources[type]", "product");
  endpoint.searchParams.set("resources[limit]", "12");
  endpoint.searchParams.set("country", "ES");
  endpoint.searchParams.set("currency", "EUR");
  const response = await fetch(endpoint.toString(), {
    headers: {
      "Accept": "application/json",
      "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
      "Cookie": "cart_currency=EUR; localization=ES",
      "User-Agent": "Mozilla/5.0 (compatible; GameList/1.0)",
    },
  });
  if (!response.ok) throw new Error("Retro Island search failed");
  const data = await response.json();
  const products = Array.isArray(data.resources?.results?.products) ? data.resources.results.products : [];
  return bestProduct(products.map(retroIslandProduct), title, platform) || { price: "", matchedTitle: "" };
}

function retroIslandProduct(product) {
  const price = product.price_min || product.price || product.price_max || "";
  const numericPrice = parsePrice(price);
  const url = product.url ? `https://retroislandny.com/${String(product.url).replace(/^\/+/, "")}` : "";
  return {
    title: product.title || "",
    platform: [product.type, ...(Array.isArray(product.tags) ? product.tags : [])].filter(Boolean).join(" "),
    price: Number.isFinite(numericPrice) ? euro(numericPrice) : "",
    matchedTitle: product.title || "",
    url,
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

function retroIslandSearchUrl(query) {
  const endpoint = new URL("https://retroislandny.com/search");
  endpoint.searchParams.set("q", retailTitle(query));
  endpoint.searchParams.set("country", "ES");
  endpoint.searchParams.set("currency", "EUR");
  return endpoint.toString();
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
