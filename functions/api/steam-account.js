import { isEditorRequest } from "./editor-auth.js";

const STEAM_API_KEY_KEY = "steam:account:api-key";
const PLAYER_SUMMARIES_URL = "https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/";

export async function onRequestGet({ request, env = {} }) {
  if (!await isEditorRequest(request, env)) return json({ error: "Unauthorized" }, 401);
  const stored = await env.GAMELIST?.get(STEAM_API_KEY_KEY);
  const apiKey = await getSteamApiKey(env);
  const steamId = new URL(request.url).searchParams.get("steamId") || "";
  const personaName = apiKey && /^\d{17}$/.test(steamId) ? await getPersonaName(apiKey, steamId) : "";
  return json({
    apiKeyAvailable: Boolean(apiKey),
    userApiKeyStored: Boolean(stored),
    personaName,
  });
}

export async function onRequestPost({ request, env = {} }) {
  if (!await isEditorRequest(request, env)) return json({ error: "Unauthorized" }, 401);
  const body = await request.json().catch(() => ({}));
  if (body.action === "disconnect") {
    await env.GAMELIST?.delete(STEAM_API_KEY_KEY);
    return json({ apiKeyAvailable: Boolean(String(env.STEAM_API_KEY || "").trim()), userApiKeyStored: false });
  }
  if (body.action !== "connect") return json({ error: "Unknown action" }, 400);
  if (!env.GAMELIST) return json({ error: "Missing GAMELIST KV binding" }, 503);
  if (!env.EDIT_PASSWORD) return json({ error: "EDIT_PASSWORD is required to securely store the Steam API key." }, 503);

  const apiKey = String(body.apiKey || "").trim();
  const steamId = String(body.steamId || "").trim();
  if (!/^[a-f\d]{32}$/i.test(apiKey)) return json({ error: "That does not look like a Steam Web API key." }, 400);
  if (!/^\d{17}$/.test(steamId)) return json({ error: "Log in with Steam first so the key can be checked against your account." }, 400);

  try {
    const url = new URL(PLAYER_SUMMARIES_URL);
    url.searchParams.set("key", apiKey);
    url.searchParams.set("steamids", steamId);
    const response = await fetch(url, { cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    const players = data?.response?.players;
    const player = Array.isArray(players) ? players.find((entry) => String(entry?.steamid || "") === steamId) : null;
    if (!response.ok || !player) throw new Error("Steam could not verify that API key for the linked account. Check it and try again.");
    await env.GAMELIST.put(STEAM_API_KEY_KEY, await encryptCredential(apiKey, env.EDIT_PASSWORD));
    return json({ apiKeyAvailable: true, userApiKeyStored: true });
  } catch (error) {
    return json({ error: error?.message || "Could not connect the Steam API key." }, 400);
  }
}

export async function getSteamApiKey(env = {}) {
  const stored = await env.GAMELIST?.get(STEAM_API_KEY_KEY);
  if (stored) {
    try { return await decryptCredential(stored, env.EDIT_PASSWORD || ""); } catch {}
  }
  return String(env.STEAM_API_KEY || globalThis.process?.env?.STEAM_API_KEY || "").trim();
}

async function encryptCredential(value, password) {
  const key = await credentialKey(password);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(value));
  return `${encodeBase64Url(iv)}.${encodeBase64Url(new Uint8Array(encrypted))}`;
}

async function decryptCredential(value, password) {
  const [ivText, dataText] = String(value || "").split(".");
  if (!ivText || !dataText || !password) throw new Error("Invalid encrypted Steam API key");
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: decodeBase64Url(ivText) }, await credentialKey(password), decodeBase64Url(dataText));
  return new TextDecoder().decode(plain);
}

async function credentialKey(password) {
  const material = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`gamelist:steam:api-key:${password}`));
  return crypto.subtle.importKey("raw", material, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

async function getPersonaName(apiKey, steamId) {
  try {
    const url = new URL(PLAYER_SUMMARIES_URL);
    url.searchParams.set("key", apiKey);
    url.searchParams.set("steamids", steamId);
    const response = await fetch(url, { cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    const player = data?.response?.players?.find?.((entry) => String(entry?.steamid || "") === steamId);
    return response.ok ? String(player?.personaname || "") : "";
  } catch {
    return "";
  }
}

function encodeBase64Url(bytes) {
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeBase64Url(value) {
  const base64 = String(value).replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64 + "=".repeat((4 - base64.length % 4) % 4));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
}
