const API_URL = "https://www.pricecharting.com/api/product";
const SITE_URL = "https://www.pricecharting.com";

export async function onRequestGet({ request, env = {} }) {
  const url = new URL(request.url);
  const title = clean(url.searchParams.get("title"), 160);
  const platform = clean(url.searchParams.get("platform"), 80);
  const region = clean(url.searchParams.get("region"), 80);
  const currency = ["EUR", "USD"].includes(String(url.searchParams.get("currency") || "").toUpperCase()) ? String(url.searchParams.get("currency")).toUpperCase() : "EUR";
  const rawRequestedId = url.searchParams.get("id");
  const requestedIdUrl = cleanPriceChartingUrl(rawRequestedId);
  const requestedId = requestedIdUrl ? "" : cleanIdentifier(rawRequestedId);
  const requestedUpc = cleanIdentifier(url.searchParams.get("upc"));
  const requestedUrl = cleanPriceChartingUrl(url.searchParams.get("url")) || requestedIdUrl;
  const searchMode = url.searchParams.get("mode") === "search";
  if (!title && !requestedId && !requestedUpc && !requestedUrl) return json({ error: "Missing title, product id, UPC, or PriceCharting URL" }, 400);

  const priceChartingTitle = priceChartingSearchTitle(title);
  const query = [priceChartingTitle || title, physicalRegionTerm(region), priceChartingPlatformTerm(platform)].filter(Boolean).join(" ");
  const searchUrl = `${SITE_URL}/search-products?type=prices&region-name=all&exclude-variants=false&q=${encodeURIComponent(requestedUpc || query || title || requestedId)}`;
  const idSearchUrl = requestedId ? `${SITE_URL}/search-products?id=${encodeURIComponent(requestedId)}` : "";
  const broadSearchUrls = uniqueValues([
    [priceChartingTitle || title, priceChartingPlatformTerm(platform)].filter(Boolean).join(" "),
    priceChartingTitle || title,
    stripSearchQualifiers(priceChartingTitle || title),
  ].filter(Boolean).map((value) => `${SITE_URL}/search-products?type=prices&region-name=all&exclude-variants=false&q=${encodeURIComponent(value)}`));
  const fallbackUrls = directProductUrls(priceChartingTitle || title, platform, region);
  const token = env.PRICECHARTING_TOKEN || globalThis.process?.env?.PRICECHARTING_TOKEN || "";
  try {
    if (searchMode) {
      let results = uniqueCandidates(rankCandidates(filterVideoGameCandidates(await fetchPublicCandidates(searchUrl), query), query));
      if (!results.length) results = uniqueCandidates(rankCandidates(await fetchDirectCandidates(fallbackUrls, query, searchUrl), query));
      return json({ results: results.slice(0, 12), searchUrl, source: "PriceCharting" });
    }
    const apiProduct = token ? await fetchApiProduct(token, { id: requestedId, upc: requestedUpc, query }) : null;
    const [publicProduct, retailProduct] = await Promise.all([
      fetchPublicProduct({ query, searchUrl, idSearchUrl, broadSearchUrls, requestedId: requestedId || apiProduct?.productId || "", requestedUrl, fallbackUrls }),
      fetchXtralifeProduct({ title, platform, region }).catch(() => null),
    ]);
    const product = convertCurrency(mergeProduct(apiProduct, publicProduct, retailProduct, { title, platform, searchUrl }), currency, publicProduct?.forexRates);
    if (!product.productId && !Object.values(product.prices).some((value) => value != null)) {
      return json({ error: "No matching physical edition found", notFound: true, searchUrl, prices: {}, history: {} });
    }
    return json({ ...product, checkedAt: new Date().toISOString(), source: "PriceCharting", currency: product.currency || currency });
  } catch (error) {
    return json({ error: error?.message || "Physical edition lookup failed", searchUrl, prices: {}, history: {} }, 502);
  }
}

async function fetchXtralifeProduct({ title, platform, region }) {
  if (!title || !/spain|europe|united kingdom|france|germany|australia/i.test(region || "Spain")) return null;
  const endpoint = new URL("https://api.xtralife.com/public-api/v1/search-sku");
  endpoint.searchParams.set("term", title);
  endpoint.searchParams.set("filters", "[]");
  endpoint.searchParams.set("storefrontId", "1");
  endpoint.searchParams.set("page", "1");
  endpoint.searchParams.set("howMany", "24");
  const response = await fetch(endpoint, { headers: browserHeaders(), cf: { cacheTtl: 3600, cacheEverything: true } });
  if (!response.ok) return null;
  const data = await response.json();
  const products = (Array.isArray(data.body?.results) ? data.body.results : []).filter((product) => !product.isDigital && /fisico|physical/.test(normalize(characteristicValue(product, "formato") || "Físico")));
  const wantedTitle = normalize(title);
  const wantedPlatform = normalize(platform);
  const match = products.map((product, index) => {
    const productTitle = normalize(product.name);
    const productPlatform = normalize(`${product.cc1} ${characteristicValue(product, "platform")}`);
    const tokens = wantedTitle.split(" ").filter((token) => token.length > 1);
    const titleScore = tokens.filter((token) => productTitle.includes(token)).length / Math.max(1, tokens.length);
    const exactTitleBonus = productTitle === wantedTitle ? 0.35 : 0;
    return { product, compatible: physicalPlatformMatches(wantedPlatform, productPlatform), score: titleScore + exactTitleBonus + 0.25 - index * 0.002 };
  }).filter((entry) => entry.compatible && entry.score >= 0.95).sort((a, b) => b.score - a.score)[0]?.product;
  if (!match) return null;
  const genres = (match.characteristics || []).filter((item) => item.name === "genre").map((item) => String(item.value || "").trim()).filter(Boolean);
  return {
    retailer: "Xtralife",
    sku: String(match.id || ""),
    catalogNumber: characteristicValue(match, "ref-proveedor"),
    edition: characteristicValue(match, "editionName") || characteristicValue(match, "edition") || match.cc2 || "",
    regionName: characteristicValue(match, "region").trim(),
    releaseDate: isoDate(characteristicValue(match, "launchDate")),
    publisher: characteristicValue(match, "editor"),
    developer: characteristicValue(match, "desarrollador"),
    genre: genres.join(", "),
  };
}

function physicalPlatformMatches(wanted, found) {
  if (!wanted) return true;
  if (wanted === "switch") return /(^| )switch( |$)/.test(found) && !/switch 2/.test(found);
  if (wanted === "switch 2" || wanted === "switch2") return /switch 2/.test(found);
  if (/^ps[1-5]$/.test(wanted)) return found.includes(wanted);
  return found.includes(wanted);
}

function characteristicValue(product, name) {
  return String((product?.characteristics || []).find((item) => item.name === name)?.value || "");
}

async function fetchApiProduct(token, { id, upc, query }) {
  const endpoint = new URL(API_URL);
  endpoint.searchParams.set("t", token);
  if (id) endpoint.searchParams.set("id", id);
  else if (upc) endpoint.searchParams.set("upc", upc);
  else endpoint.searchParams.set("q", query);
  const response = await fetch(endpoint, { cf: { cacheTtl: 3600, cacheEverything: true } });
  if (!response.ok) return null;
  const data = await response.json();
  if (data.status && data.status !== "success") return null;
  return {
    productId: String(data.id || ""), productName: data["product-name"] || "", consoleName: data["console-name"] || "",
    releaseDate: isoDate(data["release-date"]), upc: String(data.upc || ""), asin: String(data.asin || ""),
    epid: String(data.epid || ""), genre: String(data.genre || ""),
    prices: { loose: cents(data["loose-price"]), complete: cents(data["cib-price"]), sealed: cents(data["new-price"]),
      graded: cents(data["graded-price"]), box: cents(data["box-only-price"]), manual: cents(data["manual-only-price"]) },
  };
}

async function fetchPublicCandidates(searchUrl) {
  const response = await fetch(searchUrl, { headers: browserHeaders(), cf: { cacheTtl: 3600, cacheEverything: true } });
  if (!response.ok) return [];
  return parseSearchCandidates(await response.text());
}

async function fetchPublicProduct({ query, searchUrl, idSearchUrl = "", broadSearchUrls = [], requestedId, requestedUrl, fallbackUrls = [] }) {
  const idCandidates = requestedUrl || !idSearchUrl ? [] : await fetchPublicCandidates(idSearchUrl);
  const idCandidate = idCandidates.find((item) => requestedId && item.productId === requestedId);
  const rawCandidates = requestedUrl || idCandidate ? [] : await fetchPublicCandidates(searchUrl);
  const exactCandidate = rawCandidates.find((item) => requestedId && item.productId === requestedId);
  const broadExactCandidate = requestedUrl || idCandidate || exactCandidate || !requestedId ? null : await exactCandidateFromSearchUrls(broadSearchUrls, requestedId);
  const directCandidate = requestedUrl || idCandidate || exactCandidate || broadExactCandidate ? null : (await fetchDirectCandidates(fallbackUrls, query, searchUrl))[0] || null;
  const candidates = exactCandidate || broadExactCandidate ? [] : filterVideoGameCandidates(rawCandidates, query);
  const candidate = requestedUrl ? { url: requestedUrl, productId: requestedId } : idCandidate || exactCandidate || broadExactCandidate || directCandidate || bestCandidate(candidates, query);
  if (!candidate?.url && fallbackUrls.length) return (await fetchDirectCandidates(fallbackUrls, query, searchUrl))[0] || null;
  if (!candidate?.url) return candidate || null;
  if (!isVideoGameConsole(consoleNameFromProductUrl(candidate.url))) return null;
  const productResponse = await fetch(candidate.url, { headers: browserHeaders(), cf: { cacheTtl: 3600, cacheEverything: true } });
  if (!productResponse.ok) return candidate;
  const html = await productResponse.text();
  const chart = parseChart(html);
  const product = {
    ...candidate,
    productName: candidate.productName || attributeHeading(html),
    consoleName: candidate.consoleName || consoleNameFromProductUrl(candidate.url),
    releaseDate: isoDate(attributeValue(html, "Release Date")),
    upc: attributeValue(html, "UPC"), asin: attributeValue(html, "ASIN (Amazon)"), epid: attributeValue(html, "ePID (eBay)"),
    productId: attributeValue(html, "PriceCharting ID") || candidate.productId,
    genre: attributeValue(html, "Genre"), publisher: attributeValue(html, "Publisher"), rating: attributeValue(html, "ESRB Rating"),
    image: metaContent(html, "og:image") || itemImage(html), history: chart,
    prices: { ...(candidate.prices || {}), loose: priceCellById(html, "used_price") ?? candidate.prices?.loose, complete: priceCellById(html, "complete_price") ?? candidate.prices?.complete, sealed: priceCellById(html, "new_price") ?? candidate.prices?.sealed, graded: priceCellById(html, "graded_price") ?? candidate.prices?.graded, box: priceCellById(html, "boxonly_price") ?? candidate.prices?.box, manual: priceCellById(html, "manualonly_price") ?? candidate.prices?.manual },
    forexRates: parseForexRates(html),
  };
  return product;
}

async function fetchDirectCandidates(urls, query, searchUrl) {
  const products = await Promise.all(urls.map((requestedUrl) => fetchPublicProduct({ query, searchUrl, requestedId: "", requestedUrl })));
  return products.filter((product) => product?.productId && product?.productName);
}

async function exactCandidateFromSearchUrls(urls, requestedId) {
  for (const searchUrl of urls) {
    const candidate = (await fetchPublicCandidates(searchUrl)).find((item) => item.productId === requestedId);
    if (candidate?.url) return candidate;
  }
  return null;
}

function parseSearchCandidates(html) {
  return [...String(html).matchAll(/<tr[^>]+id="product-(\d+)"[\s\S]*?<\/tr>/gi)].map((match) => {
    const row = match[0];
    const link = row.match(/href="(https:\/\/www\.pricecharting\.com\/(?:[a-z]{2}\/)?game\/[^"]+)"/i)?.[1] || "";
    const titleCell = row.match(/<td class="title">([\s\S]*?)<\/td>/i)?.[1] || "";
    const productNameCell = row.match(/<h2[^>]+class="product_name"[^>]*>([\s\S]*?)<\/h2>/i)?.[1] || "";
    const consoleCell = row.match(/<td class="console[^>]*>([\s\S]*?)<\/td>/i)?.[1] || "";
    const productNameParts = productNameCell ? productNameCell.split(/<br\s*\/?>/i).map(text).filter(Boolean) : [];
    const consoleName = text(consoleCell) || productNameParts[1] || "";
    const rawProductName = text(titleCell) || productNameParts[0] || "";
    return {
      productId: match[1], url: decodeHtml(link) || productPageUrl(rawProductName, consoleName), productName: consoleName && rawProductName.endsWith(consoleName) ? rawProductName.slice(0, -consoleName.length).trim() : rawProductName, consoleName,
      prices: { loose: moneyCell(row, "used_price"), complete: moneyCell(row, "cib_price"), sealed: moneyCell(row, "new_price") },
    };
  });
}

function filterVideoGameCandidates(candidates, query) {
  const wantedConsole = consoleSignature(query);
  return candidates.filter((item) => {
    if (!isVideoGameConsole(item.consoleName)) return false;
    return !wantedConsole || consoleSignature(item.consoleName) === wantedConsole;
  });
}

function isVideoGameConsole(value) {
  const consoleName = consoleSignature(value);
  if (consoleName) return true;
  return /\b(?:nes|snes|gamecube|wii|wii u|game boy|gba|gbc|vita|psp|dreamcast|genesis|mega drive|saturn|master system|game gear|atari)\b/i.test(String(value || ""));
}

function bestCandidate(candidates, query) {
  return uniqueCandidates(rankCandidates(candidates, query))[0] || null;
}

function uniqueCandidates(candidates) {
  const seen = new Set();
  return candidates.filter((item) => {
    const key = item.productId || item.url || `${item.productName}|${item.consoleName}`;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function rankCandidates(candidates, query) {
  const wanted = normalize(query);
  const wantedTitle = stripSearchQualifiers(wanted);
  const wantedConsole = consoleSignature(wanted);
  const wantedRegion = regionSignature(wanted);
  return candidates.map((item, index) => {
    const title = normalize(item.productName);
    const consoleName = normalize(item.consoleName);
    const value = `${title} ${consoleName}`;
    const tokens = wantedTitle.split(" ").filter((token) => token.length > 1 || /^\d$/.test(token));
    const overlap = tokens.filter((token) => title.includes(token)).length / Math.max(1, tokens.length);
    const coreTokens = tokens.filter((token) => !editionQualifierToken(token));
    const coreOverlap = coreTokens.filter((token) => title.includes(token)).length;
    const extraTitleTokens = Math.max(0, title.split(" ").filter((token) => token && !tokens.includes(token)).length - 1);
    const exactTitleBonus = title === wantedTitle ? 0.75 : title.startsWith(`${wantedTitle} `) ? 0.25 : 0;
    const consoleBonus = wantedConsole && consoleSignature(consoleName) === wantedConsole ? 0.65 : wantedConsole && value.includes(wantedConsole) ? 0.25 : 0;
    const regionBonus = !wantedRegion || regionSignature(value) === wantedRegion ? 0.35 : -0.45;
    const coreBonus = coreTokens.length ? coreOverlap / coreTokens.length : 0;
    const missingCorePenalty = coreTokens.length && !coreOverlap ? 1.4 : 0;
    return { item, score: overlap + coreBonus + exactTitleBonus + consoleBonus + regionBonus - missingCorePenalty - extraTitleTokens * 0.035 - index * 0.002 };
  }).sort((a, b) => b.score - a.score).map(({ item }) => item);
}

function editionQualifierToken(token) {
  return /^(?:edition|deluxe|special|collector|collectors|limited|standard|ultimate|complete|definitive|anniversary|bonus|launch|day|one|steelbook|premium|gold|platinum|hits)$/.test(token);
}

function stripSearchQualifiers(value) {
  return normalize(value)
    .replace(/\bversion\b/g, " ")
    .replace(/\b(?:pal|ntsc|jp|japan|japanese|asian english|asia|usa|us|united states|europe|spain|france|germany|australia|uk|united kingdom)\b/g, " ")
    .replace(/\b(?:nintendo )?switch(?: 2)?\b/g, " ")
    .replace(/\b(?:sony )?playstation ?[1-5]\b/g, " ")
    .replace(/\bps ?[1-5]\b/g, " ")
    .replace(/\b(?:xbox one|xbox 360|xbox series|xbox)\b/g, " ")
    .replace(/\b(?:nintendo )?(?:ds|3ds|64|gamecube|wii u|wii|gba|gbc|game boy advance|game boy color|game boy)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function consoleSignature(value) {
  const textValue = normalize(value);
  const playstation = textValue.match(/\b(?:sony )?(?:playstation|ps) ?([1-5])\b/);
  if (playstation) return `playstation ${playstation[1]}`;
  if (/\b(?:sony )?playstation\b|\bps ?one\b|\bpsx\b/.test(textValue)) return "playstation 1";
  if (/\bswitch 2\b/.test(textValue)) return "nintendo switch 2";
  if (/\bswitch\b/.test(textValue)) return "nintendo switch";
  if (/\bxbox 360\b/.test(textValue)) return "xbox 360";
  if (/\bxbox one\b|\bxone\b/.test(textValue)) return "xbox one";
  if (/\bxbox series\b/.test(textValue)) return "xbox series";
  if (/\bpc games?\b|\bpc\b/.test(textValue)) return "pc";
  if (/\b3ds\b/.test(textValue)) return "nintendo 3ds";
  if (/\bds\b/.test(textValue)) return "nintendo ds";
  if (/\bn64\b|\bnintendo 64\b/.test(textValue)) return "nintendo 64";
  return "";
}

function regionSignature(value) {
  const textValue = normalize(value);
  if (/\b(?:jp|japan|japanese)\b/.test(textValue)) return "jp";
  if (/\b(?:pal|europe|spain|france|germany|australia|uk|united kingdom)\b/.test(textValue)) return "pal";
  if (/\b(?:ntsc|usa|us|united states)\b/.test(textValue)) return "ntsc";
  if (/\b(?:asian english|asia|taiwan)\b/.test(textValue)) return "asia";
  return "";
}

function parseChart(html) {
  const raw = String(html).match(/VGPC\.chart_data\s*=\s*(\{[\s\S]*?\});/)?.[1];
  if (!raw) return {};
  try {
    const data = JSON.parse(raw);
    return { loose: chartPoints(data.used), complete: chartPoints(data.cib), sealed: chartPoints(data.new),
      box: chartPoints(data.boxonly), manual: chartPoints(data.manualonly), graded: chartPoints(data.graded) };
  } catch { return {}; }
}

function chartPoints(points) {
  return (Array.isArray(points) ? points : []).filter((point) => Array.isArray(point) && point.length >= 2 && Number(point[1]) > 0)
    .slice(-60).map(([timestamp, value]) => ({ date: new Date(Number(timestamp)).toISOString().slice(0, 10), value: Number(value) / 100 }));
}

function mergeProduct(api, page, retail, fallback) {
  const prices = { ...(page?.prices || {}), ...(withoutNulls(api?.prices || {})) };
  const history = page?.history || {};
  return {
    productId: api?.productId || page?.productId || "", productName: api?.productName || page?.productName || fallback.title,
    consoleName: api?.consoleName || page?.consoleName || fallback.platform, releaseDate: retail?.releaseDate || api?.releaseDate || page?.releaseDate || "",
    upc: api?.upc || page?.upc || "", asin: api?.asin || page?.asin || "", epid: api?.epid || page?.epid || "",
    sku: retail?.sku || "", catalogNumber: retail?.catalogNumber || "", edition: retail?.edition || "", regionName: retail?.regionName || "",
    genre: api?.genre || page?.genre || retail?.genre || "", publisher: page?.publisher || retail?.publisher || "", developer: retail?.developer || "", rating: page?.rating || "", image: page?.image || "",
    prices, history, mainValue: prices.sealed ?? prices.complete ?? prices.loose ?? prices.graded ?? null,
    productUrl: page?.url || "", searchUrl: fallback.searchUrl, retailer: retail?.retailer || "",
  };
}

function convertCurrency(product, currency, rates = {}) {
  if (currency === "USD") return { ...product, currency: "USD" };
  const rate = Number(rates?.[currency]);
  if (!Number.isFinite(rate) || rate <= 0) return { ...product, currency: "USD" };
  const convert = (value) => value == null ? null : Math.round(Number(value) * rate * 100) / 100;
  const prices = Object.fromEntries(Object.entries(product.prices || {}).map(([key, value]) => [key, convert(value)]));
  const history = Object.fromEntries(Object.entries(product.history || {}).map(([key, points]) => [key, (points || []).map((point) => ({ ...point, value: convert(point.value) }))]));
  return { ...product, prices, history, mainValue: convert(product.mainValue), currency };
}

function attributeValue(html, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = String(html).match(new RegExp(`<td[^>]*class="title"[^>]*>\\s*${escaped}:?\\s*<\\/td>\\s*<td[^>]*class="details"[^>]*>([\\s\\S]*?)<\\/td>`, "i"));
  return text(match?.[1] || "").replace(/^none$/i, "");
}
function attributeHeading(html) { return text(String(html).match(/<div id="full_details"[\s\S]*?<h2>([\s\S]*?)<\/h2>/i)?.[1] || "").replace(/\s*\([^)]*\)\s*(?:Details|Detalles)\s*$/i, ""); }
function metaContent(html, property) { return decodeHtml(String(html).match(new RegExp(`<meta[^>]+property="${property}"[^>]+content="([^"]+)"`, "i"))?.[1] || ""); }
function itemImage(html) { return decodeHtml(String(html).match(/<img[^>]+src=['"]([^'"]+)['"][^>]+itemprop=['"]image['"]/i)?.[1] || ""); }
function priceCellById(html, id) { const cell = String(html).match(new RegExp(`<td[^>]+id="${id}"[^>]*>([\\s\\S]*?)<\\/td>`, "i"))?.[1] || ""; const value = text(cell).match(/(?:\$|€|£)\s*([\d,.]+)/)?.[1]?.replace(/,/g, ""); const number = Number(value); return Number.isFinite(number) && number > 0 ? number : null; }
function parseForexRates(html) { try { return JSON.parse(String(html).match(/VGPC\.forex_rates\s*=\s*(\{[^;]+\})/)?.[1] || "{}"); } catch { return {}; } }
function moneyCell(row, className) { const cell = row.match(new RegExp(`<td[^>]+class="[^"]*${className}[^"]*"[^>]*>([\\s\\S]*?)<\\/td>`, "i"))?.[1] || ""; const value = text(cell).replace(/[^0-9.]/g, ""); const number = Number(value); return Number.isFinite(number) && number > 0 ? number : null; }
function cents(value) { const number = Number(value); return Number.isFinite(number) && number > 0 ? number / 100 : null; }
function withoutNulls(value) { return Object.fromEntries(Object.entries(value).filter(([, item]) => item != null)); }
function uniqueValues(values) { return [...new Set(values)]; }
function physicalRegionTerm(region) { const value = normalize(region); if (/japan|jp/.test(value)) return "JP"; if (/spain|europe|france|germany|united kingdom|uk|australia/.test(value)) return "PAL"; if (/united states|usa|ntsc/.test(value)) return "NTSC"; if (/taiwan|asia/.test(value)) return "Asian English"; return ""; }
function priceChartingSearchTitle(title) { return String(title || "").replace(/\bversion\b/gi, " ").replace(/\s+/g, " ").trim(); }
function priceChartingPlatformTerm(platform) { const value = normalize(platform); const playstation = value.match(/^(?:sony\s*)?(?:ps|playstation)\s*([1-5])$/); if (playstation) return `Playstation ${playstation[1]}`; if (/^(?:sony\s*)?playstation$|^psx$|^ps\s*one$/.test(value)) return "Playstation"; if (value === "pc") return "PC"; if (value === "switch") return "Nintendo Switch"; if (value === "switch 2") return "Nintendo Switch 2"; if (value === "xone") return "Xbox One"; if (value === "x360") return "Xbox 360"; return platform; }
function directProductUrls(title, platform, region) { const titleSlug = slug(title); const consoleSlug = slug(priceChartingPlatformTerm(platform)); if (!titleSlug || !consoleSlug) return []; const prefix = physicalRegionTerm(region) === "PAL" ? "pal-" : physicalRegionTerm(region) === "JP" ? "jp-" : ""; return [...new Set([`${SITE_URL}/game/${prefix}${consoleSlug}/${titleSlug}`, `${SITE_URL}/game/${consoleSlug}/${titleSlug}`])]; }
function productPageUrl(title, consoleName) { const titleSlug = slug(title); const consoleSlug = slug(consoleName); return titleSlug && consoleSlug ? `${SITE_URL}/game/${consoleSlug}/${titleSlug}` : ""; }
function slug(value) { return normalize(value).replace(/\s+/g, "-"); }
function isoDate(value) { const textValue = String(value || "").trim(); if (!textValue) return ""; const leadingDate = textValue.match(/^\d{4}-\d{2}-\d{2}/)?.[0]; if (leadingDate) return leadingDate; const date = new Date(`${textValue} UTC`); return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10); }
function text(value) { return decodeHtml(String(value || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()); }
function decodeHtml(value) { return String(value || "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#43;/g, "+").replace(/&nbsp;/g, " "); }
function normalize(value) { return String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim(); }
function clean(value, max) { return String(value || "").trim().slice(0, max); }
function cleanIdentifier(value) { return String(value || "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64); }
function cleanPriceChartingUrl(value) { try { const url = new URL(String(value || "")); return url.hostname === "www.pricecharting.com" && /^\/(?:[a-z]{2}\/)?game\//i.test(url.pathname) ? `${url.origin}${url.pathname}` : ""; } catch { return ""; } }
function consoleNameFromProductUrl(value) { try { const parts = new URL(value).pathname.split("/").filter(Boolean); const gameIndex = parts.indexOf("game"); const slug = parts[gameIndex + 1] || ""; return slug.split("-").map((part, index) => index === 0 && ["pal", "jp"].includes(part) ? part.toUpperCase() : part.charAt(0).toUpperCase() + part.slice(1)).join(" "); } catch { return ""; } }
function browserHeaders() { return { "Accept": "text/html,application/xhtml+xml", "Accept-Language": "en-US,en;q=0.9", "User-Agent": "Mozilla/5.0 (compatible; GamelistShelf/1.0)" }; }
function json(data, status = 200) { return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=900" } }); }
