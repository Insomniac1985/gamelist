import { isEditorRequest } from "./editor-auth.js";

const CLIENT_ID = "5c38e31cd085304b";
const USER_AGENT = "com.nintendo.znej/1.13.0 (Android/7.1.2)";
const SESSION_KEY = "nintendo:znej:session";
const PENDING_KEY = "nintendo:znej:pending";
const SESSION_TTL = 60 * 60 * 24 * 700;
const PENDING_TTL = 60 * 10;
const TOKEN_URL = "https://accounts.nintendo.com/connect/1.0.0/api/token";
const SESSION_TOKEN_URL = "https://accounts.nintendo.com/connect/1.0.0/api/session_token";
const ACCOUNT_URL = "https://api.accounts.nintendo.com/2.0.0/users/me";
const HISTORY_URL = "https://app-api.znej.nintendo.com/api/v2.0/users/me/play_histories";

export async function onRequestGet({ request, env = {} }) {
  if (!await isEditorRequest(request, env)) return json({ error: "Unauthorized" }, 401);
  const url = new URL(request.url);
  if (url.searchParams.get("action") === "status") {
    const sessionToken = await readSessionToken(env);
    if (!sessionToken) return json({ connected: false, accountName: "" });
    return json({ connected: true, accountName: await getNintendoAccountName(sessionToken) });
  }

  const title = String(url.searchParams.get("title") || "").trim();
  if (!title) return json({ error: "Missing title" }, 400);
  const sessionToken = await readSessionToken(env);
  if (!sessionToken) return json({ connected: false, error: "Connect a Nintendo Account in Settings first." }, 200);

  try {
    const access = await nintendoFetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        client_id: CLIENT_ID,
        session_token: sessionToken,
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer-session-token",
      }),
    });
    if (!access.access_token) throw new Error("Nintendo did not return an access token.");
    const history = await nintendoFetch(HISTORY_URL, {
      headers: { Authorization: `Bearer ${access.access_token}`, "gentry-locale": "en-US" },
    });
    const titles = Array.isArray(history.playHistories) ? history.playHistories : [];
    const match = bestTitleMatch(title, url.searchParams.get("platform"), titles);
    return json({ connected: true, playtimeHours: match ? Math.round(Number(match.totalPlayedMinutes || 0) / 60) : null, matchedTitle: match?.titleName || "" });
  } catch (error) {
    return json({ connected: true, error: error?.message || "Nintendo Play Activity lookup failed." }, 502);
  }
}

export async function onRequestPost({ request, env = {} }) {
  if (!await isEditorRequest(request, env)) return json({ error: "Unauthorized" }, 401);
  if (!env.GAMELIST) return json({ error: "Missing GAMELIST KV binding" }, 503);
  if (!env.EDIT_PASSWORD) return json({ error: "EDIT_PASSWORD is required to securely store the Nintendo connection." }, 503);
  const body = await request.json().catch(() => ({}));

  if (body.action === "begin") {
    const state = randomToken(32);
    const verifier = randomToken(32);
    const challenge = base64Url(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))));
    await env.GAMELIST.put(PENDING_KEY, JSON.stringify({ state, verifier }), { expirationTtl: PENDING_TTL });
    const params = new URLSearchParams({
      state,
      client_id: CLIENT_ID,
      redirect_uri: `npf${CLIENT_ID}://auth`,
      scope: "openid user user.mii user.email user.links[].id",
      response_type: "session_token_code",
      session_token_code_challenge: challenge,
      session_token_code_challenge_method: "S256",
      theme: "login_form",
    });
    return json({ url: `https://accounts.nintendo.com/connect/1.0.0/authorize?${params}` });
  }

  if (body.action === "exchange") {
    const pending = await env.GAMELIST.get(PENDING_KEY, "json");
    if (!pending?.state || !pending?.verifier) return json({ error: "Sign-in expired. Start the Nintendo connection again." }, 400);
    const callbackUrl = String(body.callbackUrl || "").trim();
    let callback;
    try { callback = new URL(callbackUrl); } catch { return json({ error: "Paste the full Nintendo redirect link." }, 400); }
    if (`${callback.protocol}//${callback.hostname}` !== `npf${CLIENT_ID}://auth`) return json({ error: "That link is not a Nintendo sign-in callback." }, 400);
    const callbackParams = new URLSearchParams(callback.hash.slice(1));
    const state = callbackParams.get("state");
    const code = callbackParams.get("session_token_code");
    if (!state || state !== pending.state) return json({ error: "Nintendo sign-in state did not match. Start again." }, 400);
    if (!code) return json({ error: "No session token code was found in that link." }, 400);

    try {
      const result = await nintendoFetch(SESSION_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", "X-Platform": "Android", "X-ProductVersion": "2.5.0" },
        body: new URLSearchParams({ client_id: CLIENT_ID, session_token_code: code, session_token_code_verifier: pending.verifier }).toString(),
      });
      if (!result.session_token) throw new Error("Nintendo did not return a session token.");
      await env.GAMELIST.put(SESSION_KEY, await encryptSession(result.session_token, env.EDIT_PASSWORD), { expirationTtl: SESSION_TTL });
      await env.GAMELIST.delete(PENDING_KEY);
      return json({ connected: true, accountName: await getNintendoAccountName(result.session_token) });
    } catch (error) {
      return json({ error: error?.message || "Nintendo sign-in failed." }, 502);
    }
  }

  if (body.action === "disconnect") {
    await env.GAMELIST.delete(SESSION_KEY);
    await env.GAMELIST.delete(PENDING_KEY);
    return json({ connected: false });
  }
  return json({ error: "Unknown action" }, 400);
}

async function readSessionToken(env) {
  const stored = await env.GAMELIST?.get(SESSION_KEY);
  if (!stored) return "";
  try { return await decryptSession(stored, env.EDIT_PASSWORD || ""); } catch { return ""; }
}

async function getNintendoAccountName(sessionToken) {
  try {
    const access = await nintendoFetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        client_id: CLIENT_ID,
        session_token: sessionToken,
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer-session-token",
      }),
    });
    if (!access.access_token) return "";
    const account = await nintendoFetch(ACCOUNT_URL, {
      headers: { Authorization: `Bearer ${access.access_token}` },
    });
    return String(account.nickname || account.name || account.displayName || "").trim();
  } catch {
    return "";
  }
}

async function encryptSession(value, password) {
  const key = await encryptionKey(password);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(value));
  return `${base64Url(iv)}.${base64Url(new Uint8Array(encrypted))}`;
}

async function decryptSession(value, password) {
  const [ivText, dataText] = String(value).split(".");
  if (!ivText || !dataText) throw new Error("Invalid encrypted token");
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromBase64Url(ivText) }, await encryptionKey(password), fromBase64Url(dataText));
  return new TextDecoder().decode(plain);
}

async function encryptionKey(password) {
  const material = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`gamelist:nintendo:znej:${password}`));
  return crypto.subtle.importKey("raw", material, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

async function nintendoFetch(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { "User-Agent": USER_AGENT, Accept: "application/json", ...(options.headers || {}) },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error_description || data.error || `Nintendo request failed (${response.status}).`);
  return data;
}

function bestTitleMatch(wanted, platform, titles) {
  const target = normalizeTitle(wanted);
  const targetPlatform = normalizePlatform(platform);
  return titles.map((title) => ({
    title,
    score: titleMatchScore(target, normalizeTitle(title.titleName))
      + (targetPlatform && normalizePlatform(title.platform) === targetPlatform ? 30 : 0),
  })).filter((item) => item.score >= 80).sort((a, b) => b.score - a.score)[0]?.title || null;
}

function titleMatchScore(a, b) {
  if (!a || !b) return 0;
  if (a === b) return 100;
  if (a.includes(b) || b.includes(a)) return 88;
  const aa = new Set(a.split(" "));
  const bb = new Set(b.split(" "));
  const common = [...aa].filter((word) => bb.has(word)).length;
  return common ? Math.round((2 * common / (aa.size + bb.size)) * 80) : 0;
}

function normalizeTitle(value) {
  return String(value || "").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ").replace(/\b(nintendo switch|switch|nso|edition|deluxe|the)\b/g, " ").trim().replace(/\s+/g, " ");
}

function normalizePlatform(value) {
  const text = String(value || "").toLowerCase();
  return text.includes("switch") ? "switch" : text.includes("wii u") ? "wiiu" : text.includes("3ds") ? "3ds" : text;
}

function randomToken(size) {
  return base64Url(crypto.getRandomValues(new Uint8Array(size)));
}

function base64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
}
