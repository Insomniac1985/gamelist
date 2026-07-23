const ALLOWED_SOURCES = [
  {
    host: "howlongtobeat.com",
    pathPrefix: "/games/",
    referer: "https://howlongtobeat.com/",
  },
  {
    host: "images.igdb.com",
    pathPrefix: "/igdb/image/upload/",
    referer: "https://www.igdb.com/",
  },
];

export async function onRequestGet({ request }) {
  const requestUrl = new URL(request.url);
  const sourceUrl = requestUrl.searchParams.get("src") || "";
  let url;
  try {
    url = new URL(sourceUrl);
  } catch {
    return new Response("Invalid cover URL", { status: 400 });
  }
  const sourceRule = ALLOWED_SOURCES.find((item) => url.hostname === item.host && url.pathname.startsWith(item.pathPrefix));
  if (url.protocol !== "https:" || !sourceRule) {
    return new Response("Cover source not allowed", { status: 403 });
  }
  const image = imageOptions(requestUrl);
  const response = await fetch(url, {
    headers: {
      Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      Referer: sourceRule.referer,
      "User-Agent": "Mozilla/5.0 (compatible; GamelistCoverShelf/1.0)",
    },
    ...(image ? { cf: { image } } : {}),
  });
  if (!response.ok) return new Response("Cover unavailable", { status: 502 });
  return new Response(response.body, {
    headers: {
      "Content-Type": response.headers.get("Content-Type") || "image/jpeg",
      "Cache-Control": "public, max-age=604800, s-maxage=2592000",
    },
  });
}

function imageOptions(url) {
  const width = clampedDimension(url.searchParams.get("width") || url.searchParams.get("w"));
  const height = clampedDimension(url.searchParams.get("height") || url.searchParams.get("h"));
  if (!width && !height) return null;
  const fit = ["cover", "contain", "scale-down", "crop", "pad"].includes(url.searchParams.get("fit"))
    ? url.searchParams.get("fit")
    : "cover";
  return {
    ...(width ? { width } : {}),
    ...(height ? { height } : {}),
    fit,
  };
}

function clampedDimension(value) {
  const number = Number.parseInt(value || "", 10);
  if (!Number.isFinite(number) || number <= 0) return 0;
  return Math.max(16, Math.min(1200, number));
}
