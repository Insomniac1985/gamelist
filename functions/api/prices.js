const DEFAULT_STORES = ["Amazon", "Xtralife", "GAME.es", "Retro Island NY"];
const STORE_OPTIONS = ["Amazon", "GAME.es", "Xtralife", "Retro Island NY", "GameStop", "Walmart"];
const PRICE_LOOKUP_TIMEOUT_MS = 6500;

const PLAYSTATION_CATALOG_ID = "28c9c2b2-cecc-415c-9a08-482a605cb104";
const PLAYSTATION_CATALOG_HASH = "4ce7d410a4db2c8b635a48c1dcec375906ff63b19dadd87e073f8fd0c0481d35";
const PLAYSTATION_PRICING_HASH = "abcb311ea830e679fe2b697a27f755764535d825b24510ab1239a4ca3092bd09";

export async function onRequestGet({ request, env = {} }) {
  const url = new URL(request.url);
  const title = url.searchParams.get("title")?.trim();
  const platform = url.searchParams.get("platform")?.trim() || "";
  const digital = url.searchParams.get("digital") === "1";
  const debug = url.searchParams.has("debug");
  const region = cleanRegion(url.searchParams.get("region"));
  const currency = cleanCurrency(url.searchParams.get("currency"));
  const stores = cleanStores(url.searchParams.get("stores"));
  if (!title) return json({ prices: [] });

  const query = digital ? retailTitle(title) : `${retailTitle(title)} ${platform}`.trim();
  const providers = digital ? digitalProvidersForPlatform(platform, region) : physicalProviders(stores, region, currency);
  try {
    const prices = await Promise.all(providers.map((provider) => findPrice(provider, title, platform, query, env, debug, { region, currency })));
    return json({ prices });
  } catch {
    return json({ prices: providers.map((provider) => missingPrice(provider.store, provider.search(query))) });
  }
}

function physicalProviders(stores, region, currency) {
  return stores.slice(0, 4).map((store) => {
    if (store === "Amazon") {
      return {
        store: amazonStoreName(region),
        search: (q) => amazonSearchUrl(q, region),
        parse: (html, title, platform) => parseAmazon(html, title, platform, currency),
      };
    }
    if (store === "Xtralife") return { store: "Xtralife", search: (q) => `https://www.xtralife.com/buscar/${encodeURIComponent(q)}`, lookup: lookupXtralife };
    if (store === "GAME.es") return { store: "GAME.es", search: (q) => `https://www.game.es/buscar/${encodeURIComponent(q)}`, lookup: lookupGameEs };
    if (store === "Retro Island NY") return { store: "Retro Island NY", search: (q) => retroIslandSearchUrl(q, region, currency), lookup: lookupRetroIslandNy };
    if (store === "GameStop") return { store: "GameStop", search: gamestopSearchUrl, lookup: lookupGameStop };
    if (store === "Walmart") return { store: "Walmart", search: walmartSearchUrl, lookup: lookupWalmart };
    return null;
  }).filter(Boolean);
}

function digitalProvidersForPlatform(platform, region) {
  const normalized = normalizePlatform(platform);
  if (normalized === "switch" || normalized === "switch2") return [{
    store: nintendoStoreName(region),
    search: (q) => nintendoSearchUrl(q, region),
    lookup: region === "ES" ? lookupNintendoEs : lookupLinkOnly,
  }];
  if (normalized === "ps4" || normalized === "ps5" || normalized === "playstation4" || normalized === "playstation5") {
    return [{
      store: playStationStoreName(region),
      search: (q) => playStationSearchUrl(q, region),
      lookup: region === "ES" ? lookupPlayStationEs : lookupLinkOnly,
    }];
  }
  if (normalized === "pc" || normalized === "steam") return [{
    store: "Steam",
    search: (q) => `https://store.steampowered.com/search/?term=${encodeURIComponent(q)}`,
    parse: parseSteam,
  }];
  if (["xboxpc", "microsoft", "microsoftpc", "xbox360", "x360", "xboxone", "xone", "xboxseries", "xboxseriesx", "xboxseriess", "xboxseriesxs"].includes(normalized)) return [{
    store: "Xbox",
    search: (q) => xboxSearchUrl(q, region),
    lookup: lookupXboxStore,
  }];
  return [];
}

function normalizePlatform(platform) {
  return String(platform || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function cleanRegion(value) {
  const region = String(value || "").toUpperCase();
  return ["ES", "US", "UK"].includes(region) ? region : "ES";
}

function cleanCurrency(value) {
  return String(value || "").toUpperCase() === "USD" ? "USD" : "EUR";
}

function cleanStores(value) {
  if (value === null) return DEFAULT_STORES;
  const stores = String(value || "")
    .split(",")
    .map((store) => store.trim())
    .filter((store) => STORE_OPTIONS.includes(store));
  return stores.slice(0, 4);
}

function unique(values) {
  return [...new Set(values)];
}

function amazonStoreName(region) {
  if (region === "US") return "Amazon.com";
  if (region === "UK") return "Amazon.co.uk";
  return "Amazon.es";
}

function amazonSearchUrl(query, region) {
  if (region === "US") return `https://www.amazon.com/s?k=${encodeURIComponent(query)}`;
  if (region === "UK") return `https://www.amazon.co.uk/s?k=${encodeURIComponent(query)}`;
  return `https://www.amazon.es/s?k=${encodeURIComponent(query)}`;
}

function nintendoStoreName(region) {
  if (region === "US") return "Nintendo US";
  if (region === "UK") return "Nintendo UK";
  return "Nintendo España";
}

function nintendoSearchUrl(query, region) {
  if (region === "US") return `https://www.nintendo.com/us/search/?q=${encodeURIComponent(query)}`;
  if (region === "UK") return `https://www.nintendo.com/en-gb/Search/Search-299117.html?q=${encodeURIComponent(query)}`;
  return `https://www.nintendo.com/es-es/Buscar/Buscar-299117.html?q=${encodeURIComponent(query)}&f=147394-86`;
}

function playStationStoreName(region) {
  if (region === "US") return "PlayStation US";
  if (region === "UK") return "PlayStation UK";
  return "PlayStation España";
}

function playStationSearchUrl(query, region) {
  if (region === "US") return `https://www.playstation.com/en-us/search/?q=${encodeURIComponent(query)}`;
  if (region === "UK") return `https://www.playstation.com/en-gb/search/?q=${encodeURIComponent(query)}`;
  return `https://www.playstation.com/es-es/search/?q=${encodeURIComponent(query)}`;
}

function xboxSearchUrl(query, region) {
  return `https://www.xbox.com/${xboxLocale(region)}/search?q=${encodeURIComponent(query)}`;
}

function xboxLocale(region) {
  if (region === "US") return "en-US";
  if (region === "UK") return "en-GB";
  return "es-ES";
}

function xboxMarket(region) {
  return region === "UK" ? "GB" : region;
}

function gamestopSearchUrl(query) {
  return `https://www.gamestop.com/search/?q=${encodeURIComponent(query)}&start=0&sz=24&format=ajax`;
}

function walmartSearchUrl(query) {
  return `https://www.walmart.com/search?q=${encodeURIComponent(query)}`;
}

async function findPrice(provider, title, platform, query, env = {}, debug = false, options = {}) {
  const url = provider.search(query);
  if (provider.lookup) {
    try {
      const result = await withTimeout(provider.lookup(title, platform, query, options), PRICE_LOOKUP_TIMEOUT_MS);
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
    const response = await fetchWithTimeout(url, {
      headers: {
        "Accept": "text/html",
        "Accept-Language": "es-ES,es;q=0.9,en;q=0.6",
        "User-Agent": "Mozilla/5.0 (compatible; GameList/1.0)",
      },
    }, PRICE_LOOKUP_TIMEOUT_MS);
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

async function fetchWithTimeout(url, options = {}, timeoutMs = PRICE_LOOKUP_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function withTimeout(promise, timeoutMs = PRICE_LOOKUP_TIMEOUT_MS) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Price lookup timed out")), timeoutMs);
    }),
  ]);
}

async function lookupLinkOnly() {
  return { price: "", matchedTitle: "" };
}

async function lookupXboxStore(title, platform, query, options = {}) {
  const region = cleanRegion(options.region);
  const endpoint = new URL("https://storeedgefd.dsx.mp.microsoft.com/v9.0/pages/searchResults");
  endpoint.searchParams.set("appVersion", "22203.1401.0.0");
  endpoint.searchParams.set("market", xboxMarket(region));
  endpoint.searchParams.set("locale", xboxLocale(region));
  endpoint.searchParams.set("deviceFamily", "windows.desktop");
  endpoint.searchParams.set("mediaType", "games");
  endpoint.searchParams.set("query", retailTitle(title || query));
  const response = await fetch(endpoint.toString(), {
    headers: {
      "Accept": "application/json",
      "Accept-Language": xboxLocale(region),
      "User-Agent": "Mozilla/5.0 (compatible; GameList/1.0)",
    },
    cf: { cacheTtl: 900, cacheEverything: true },
  });
  if (!response.ok) throw new Error("Xbox Store search failed");
  const data = await response.json();
  const results = Array.isArray(data)
    ? data.flatMap((entry) => Array.isArray(entry?.Payload?.SearchResults) ? entry.Payload.SearchResults : [])
    : [];
  const products = results
    .filter((product) => !product.ProductFamilyName || product.ProductFamilyName === "Games")
    .map((product) => {
      const productId = String(product.ProductId || "").trim();
      const matchedTitle = String(product.Title || "").trim();
      const pricing = xboxProductPrice(product);
      return {
        title: matchedTitle,
        platform: "Xbox Xbox Series Xbox PC Xbox One Xbox 360",
        price: pricing.price,
        numericPrice: pricing.numericPrice,
        matchedTitle,
        url: productId ? `https://www.xbox.com/${xboxLocale(region)}/games/store/${encodeURIComponent(matchedTitle || "game")}/${encodeURIComponent(productId)}` : "",
      };
    });
  return bestProduct(products, title, platform) || { price: "", matchedTitle: "" };
}

function xboxProductPrice(product = {}) {
  const skus = Array.isArray(product.SkusSummary) ? product.SkusSummary : [];
  const salePrices = skus.flatMap((sku) => Array.isArray(sku.SalePrices) ? sku.SalePrices : []);
  const unconditional = salePrices
    .filter((price) => !price.Conditions && Number(price.Price) > 0 && isMoneyLabel(price.DisplayPrice))
    .sort((a, b) => Number(a.Price) - Number(b.Price))[0];
  if (unconditional) return { price: String(unconditional.DisplayPrice).trim(), numericPrice: Number(unconditional.Price) };
  const msrp = skus
    .filter((sku) => Number(sku.MSRP) > 0 && isMoneyLabel(sku.DisplayMSRP))
    .sort((a, b) => Number(a.MSRP) - Number(b.MSRP))[0];
  if (msrp) return { price: String(msrp.DisplayMSRP).trim(), numericPrice: Number(msrp.MSRP) };
  if (Number(product.Price) > 0 && isMoneyLabel(product.DisplayPrice)) {
    return { price: String(product.DisplayPrice).trim(), numericPrice: Number(product.Price) };
  }
  return { price: "", numericPrice: null };
}

function isMoneyLabel(value) {
  return /[$€£]/.test(String(value || ""));
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

function parseAmazon(html, title, platform, currency = "EUR") {
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

    const priceMatch = card.match(/<span class="a-offscreen">((?:US\s*)?\$?\s*[\d.,]+\s*(?:€|EUR|USD)?)<\/span>/i)
      || card.match(/data-csa-c-price-to-pay="([\d.]+)"/i);
    if (!priceMatch) continue;
    const price = formatPriceLabel(priceMatch[1], currency);
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

async function lookupGameStop(title, platform, query) {
  const searchUrl = gamestopSearchUrl(query);
  const response = await fetchWithTimeout(searchUrl, {
    headers: gamestopHeaders(searchUrl, "text/html,*/*"),
  });
  if (!response.ok) throw new Error("GameStop search failed");
  const html = await response.text();
  const ids = unique([...html.matchAll(/data-pid="([^"]+)"/gi)].map((match) => match[1]).filter(Boolean)).slice(0, 8);
  const products = [];
  for (const id of ids) {
    const product = await gamestopProduct(id, searchUrl);
    if (product) products.push(product);
  }
  return bestProduct(products, title, platform) || { price: "", matchedTitle: "" };
}

async function gamestopProduct(id, referer) {
  const url = `https://www.gamestop.com/on/demandware.store/Sites-gamestop-us-Site/default/Product-Variation?pid=${encodeURIComponent(id)}`;
  const response = await fetchWithTimeout(url, {
    headers: gamestopHeaders(referer, "application/json,text/javascript,*/*;q=0.01"),
  });
  if (!response.ok) return null;
  const data = await response.json();
  const product = data.product || {};
  const productUrl = product.selectedProductUrl
    ? `https://www.gamestop.com${String(product.selectedProductUrl).startsWith("/") ? "" : "/"}${product.selectedProductUrl}`
    : referer;
  return {
    title: product.productName || product.pageTitle || "",
    platform: product.productPlatform || "",
    price: product.price?.sales?.formatted || product.price?.salePriceExcludingPro?.formatted || "",
    matchedTitle: product.productName || product.pageTitle || "",
    url: productUrl,
  };
}

function gamestopHeaders(referer, accept) {
  return {
    "Accept": accept,
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": referer,
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36",
    "X-Requested-With": "XMLHttpRequest",
  };
}

async function lookupWalmart(title, platform, query) {
  const searchUrl = walmartSearchUrl(query);
  const response = await fetchWithTimeout(searchUrl, {
    headers: {
      "Accept": "text/html",
      "Accept-Language": "en-US,en;q=0.9",
      "User-Agent": "Mozilla/5.0 (compatible; GameList/1.0)",
    },
  });
  if (!response.ok) throw new Error("Walmart search failed");
  const html = await response.text();
  if (/Robot or human\?|\/blocked\?/i.test(html)) return { price: "", matchedTitle: "", url: searchUrl };
  const data = parseNextData(html);
  const stacks = data?.props?.pageProps?.initialData?.searchResult?.itemStacks || [];
  const products = stacks
    .flatMap((stack) => Array.isArray(stack.items) ? stack.items : [])
    .map((item, index) => walmartProduct(item, index))
    .filter((product) => product.price);
  return bestProduct(products, title, platform) || { price: "", matchedTitle: "", url: searchUrl };
}

function walmartProduct(item, index = 0) {
  const priceInfo = item.priceInfo || {};
  const url = item.canonicalUrl
    ? `https://www.walmart.com${String(item.canonicalUrl).startsWith("/") ? "" : "/"}${item.canonicalUrl}`
    : "";
  return {
    title: item.name || "",
    platform: [item.catalogProductType, item.type, item.conditionV2?.groupCode, item.sellerName].filter(Boolean).join(" "),
    price: priceInfo.linePrice || priceInfo.itemPrice || priceInfo.minPriceForVariant || "",
    matchedTitle: item.name || "",
    url,
    scoreBoost: Math.max(0, 0.3 - (index * 0.015)),
  };
}

function parseNextData(html) {
  const match = String(html || "").match(/<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
  if (!match) return null;
  try {
    return JSON.parse(decodeHtml(match[1]));
  } catch {
    return null;
  }
}

async function lookupRetroIslandNy(title, platform, query, options = {}) {
  const region = options.region || "ES";
  const currency = options.currency || "EUR";
  const endpoint = new URL("https://retroislandny.com/search/suggest.json");
  endpoint.searchParams.set("q", query);
  endpoint.searchParams.set("resources[type]", "product");
  endpoint.searchParams.set("resources[limit]", "12");
  endpoint.searchParams.set("country", region);
  endpoint.searchParams.set("currency", currency);
  const response = await fetch(endpoint.toString(), {
    headers: {
      "Accept": "application/json",
      "Accept-Language": region === "ES" ? "es-ES,es;q=0.9,en;q=0.8" : "en-US,en;q=0.9",
      "Cookie": `cart_currency=${currency}; localization=${region}`,
      "User-Agent": "Mozilla/5.0 (compatible; GameList/1.0)",
    },
  });
  if (!response.ok) throw new Error("Retro Island search failed");
  const data = await response.json();
  const products = Array.isArray(data.resources?.results?.products) ? data.resources.results.products : [];
  return bestProduct(products.map((product) => retroIslandProduct(product, currency)), title, platform) || { price: "", matchedTitle: "" };
}

function retroIslandProduct(product, currency = "EUR") {
  const price = product.price_min || product.price || product.price_max || "";
  const numericPrice = parsePrice(price);
  const url = product.url ? `https://retroislandny.com/${String(product.url).replace(/^\/+/, "")}` : "";
  return {
    title: product.title || "",
    platform: [product.type, ...(Array.isArray(product.tags) ? product.tags : [])].filter(Boolean).join(" "),
    price: Number.isFinite(numericPrice) ? money(numericPrice, currency) : "",
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
      score: productScore(product, normalizedTitle, normalizedPlatform) + (Number(product.scoreBoost) || 0),
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
  else if (normalizedProduct.includes(normalizedTitle) || normalizedTitle.includes(normalizedProduct)) score += 0.35;
  if (tokenOverlap(normalizedTitle, normalizedProduct)) score += 0.28;
  const matchesPlatform = normalizedPlatform && (platformMatches(normalizedPlatform, normalizedProductPlatform) || platformMatches(normalizedPlatform, normalizedProduct));
  if (matchesPlatform) score += 0.18;
  else if (normalizedPlatform) score -= 0.28;
  if (product.price) score += 0.08;
  score -= productNoisePenalty(normalizedProduct, normalizedTitle);
  score -= Math.min(0.18, extraTokenCount(normalizedProduct, normalizedTitle) * 0.018);
  return score;
}

function productNoisePenalty(productTitle, wantedTitle) {
  let penalty = 0;
  const penalizeUnlessWanted = (pattern, amount) => {
    if (pattern.test(productTitle) && !pattern.test(wantedTitle)) penalty += amount;
  };
  penalizeUnlessWanted(/\b(dlc|booster|course pass|expansion|add on|season pass|downloadable content)\b/, 0.42);
  penalizeUnlessWanted(/\b(bundle|pack|set)\b/, 0.18);
  penalizeUnlessWanted(/\b(controller|wheel|steering|case|skin|amiibo|accessory|accessories)\b/, 0.36);
  penalizeUnlessWanted(/\b(restored|refurbished|renewed|pre owned|used)\b/, 0.1);
  return penalty;
}

function extraTokenCount(productTitle, wantedTitle) {
  const wanted = new Set(wantedTitle.split(" ").filter(Boolean));
  return productTitle.split(" ").filter((token) => token && !wanted.has(token)).length;
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

function usd(value) {
  return `$${Number(value).toFixed(2)}`;
}

function money(value, currency = "EUR") {
  return currency === "USD" ? usd(value) : euro(value);
}

function formatPriceLabel(value, currency = "EUR") {
  const text = String(value || "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
  const amount = parsePrice(text);
  if (!Number.isFinite(amount)) return "";
  if (text.includes("$") || /USD/i.test(text) || currency === "USD") return usd(amount);
  return euro(amount);
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

function retroIslandSearchUrl(query, region = "ES", currency = "EUR") {
  const endpoint = new URL("https://retroislandny.com/search");
  endpoint.searchParams.set("q", retailTitle(query));
  endpoint.searchParams.set("country", region);
  endpoint.searchParams.set("currency", currency);
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
