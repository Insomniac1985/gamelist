const TWITCH_TOKEN_URL = "https://id.twitch.tv/oauth2/token";
const TWITCH_API_URL = "https://api.twitch.tv/helix";

let tokenCache;

export async function onRequestGet({ request, env = {} }) {
  const username = cleanUsername(new URL(request.url).searchParams.get("user"));
  if (!username) return json({ error: "Twitch username required" }, 400);
  const credentials = twitchCredentials(env);
  if (!credentials) return json({ channel: username, type: "live", isLive: null });
  try {
    const token = await getToken(credentials);
    const headers = {
      "Client-ID": credentials.clientId,
      Authorization: `Bearer ${token}`,
    };
    const userData = await twitchGet("users", { login: username }, headers);
    const user = userData.data?.[0];
    if (!user) return json({ error: "Twitch channel not found" }, 404);
    const streamData = await twitchGet("streams", { user_id: user.id, first: "1" }, headers);
    if (streamData.data?.length) {
      return json({ channel: user.login, type: "live", isLive: true, title: streamData.data[0].title || "" });
    }
    const videos = await twitchGet("videos", { user_id: user.id, type: "archive", sort: "time", first: "1" }, headers);
    const video = videos.data?.[0];
    if (video) {
      return json({ channel: user.login, type: "video", isLive: false, videoId: video.id, title: video.title || "" });
    }
    return json({ channel: user.login, type: "live", isLive: false });
  } catch {
    return json({ channel: username, type: "live", isLive: null });
  }
}

function twitchCredentials(env) {
  const clientId = env.IGDB_CLIENT_ID || globalThis.process?.env?.IGDB_CLIENT_ID || "";
  const clientSecret = env.IGDB_CLIENT_SECRET || globalThis.process?.env?.IGDB_CLIENT_SECRET || "";
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

async function getToken({ clientId, clientSecret }) {
  if (tokenCache && Date.now() < tokenCache.expiresAt) return tokenCache.token;
  const url = new URL(TWITCH_TOKEN_URL);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("client_secret", clientSecret);
  url.searchParams.set("grant_type", "client_credentials");
  const response = await fetch(url, { method: "POST" });
  if (!response.ok) throw new Error("Twitch authentication failed");
  const data = await response.json();
  tokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + Math.max(60, Number(data.expires_in || 3600) - 300) * 1000,
  };
  return tokenCache.token;
}

async function twitchGet(path, params, headers) {
  const url = new URL(`${TWITCH_API_URL}/${path}`);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`Twitch request failed: ${response.status}`);
  return response.json();
}

function cleanUsername(value) {
  return String(value || "").trim().replace(/^@/, "").replace(/[^A-Za-z0-9_]/g, "").slice(0, 25);
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=60",
    },
  });
}
