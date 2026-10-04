import { isEditorRequest } from "./editor-auth.js";

const CREDENTIALS_KEY = "igdb:credentials";
const MANAGED_KEY = "igdb:managed";

export async function onRequestGet({ request, env = {} }) {
  if (!await isEditorRequest(request, env)) return json({ error: "Unauthorized" }, 401);
  const credentials = await igdbCredentials(env);
  const source = await getIgdbCredentialSource(env);
  return json({ configured: Boolean(credentials), source });
}

export async function onRequestPost({ request, env = {} }) {
  if (!await isEditorRequest(request, env)) return json({ error: "Unauthorized" }, 401);
  if (!env.GAMELIST) return json({ error: "Missing GAMELIST KV binding" }, 503);
  if (!env.EDIT_PASSWORD) return json({ error: "EDIT_PASSWORD is required to securely store IGDB credentials." }, 503);

  const body = await request.json().catch(() => ({}));
  if (!body || typeof body !== "object" || Array.isArray(body)) return json({ error: "Expected an IGDB connection action." }, 400);
  if (body.action === "disconnect") {
    await env.GAMELIST.put(MANAGED_KEY, "1");
    await env.GAMELIST.delete(CREDENTIALS_KEY);
    await clearHealthCache(request);
    return json({ configured: false, source: "" });
  }
  if (body.action !== "connect") return json({ error: "Unknown action" }, 400);

  const credentials = {
    clientId: String(body.clientId || "").trim(),
    clientSecret: String(body.clientSecret || "").trim(),
  };
  if (!credentials.clientId || credentials.clientId.length > 256 || !credentials.clientSecret || credentials.clientSecret.length > 512) {
    return json({ error: "Enter a valid Twitch Client ID and Client Secret." }, 400);
  }

  try {
    await verifyIgdbCredentials(credentials);
    await env.GAMELIST.put(CREDENTIALS_KEY, await encryptCredentials(credentials, env.EDIT_PASSWORD));
    await env.GAMELIST.put(MANAGED_KEY, "1");
    await clearHealthCache(request);
    return json({ configured: true, source: "settings" });
  } catch (error) {
    return json({ error: error?.message || "Could not verify Twitch app credentials." }, 400);
  }
}

export async function igdbCredentials(env = {}) {
  const stored = await env.GAMELIST?.get(CREDENTIALS_KEY);
  if (stored) {
    try { return await decryptCredentials(stored, env.EDIT_PASSWORD || ""); } catch { return null; }
  }
  if (await env.GAMELIST?.get(MANAGED_KEY)) return null;
  const clientId = env.IGDB_CLIENT_ID || globalThis.process?.env?.IGDB_CLIENT_ID || "";
  const clientSecret = env.IGDB_CLIENT_SECRET || globalThis.process?.env?.IGDB_CLIENT_SECRET || "";
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

async function getIgdbCredentialSource(env) {
  if (await env.GAMELIST?.get(CREDENTIALS_KEY)) return "settings";
  if (await env.GAMELIST?.get(MANAGED_KEY)) return "";
  const clientId = env.IGDB_CLIENT_ID || globalThis.process?.env?.IGDB_CLIENT_ID || "";
  const clientSecret = env.IGDB_CLIENT_SECRET || globalThis.process?.env?.IGDB_CLIENT_SECRET || "";
  return clientId && clientSecret ? "environment" : "";
}

export async function verifyIgdbCredentials({ clientId, clientSecret }) {
  const tokenResponse = await fetchWithTimeout("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, grant_type: "client_credentials" }),
  });
  const token = await tokenResponse.json().catch(() => ({}));
  if (!tokenResponse.ok || !token.access_token) throw new Error("Twitch could not verify those app credentials. Check the Client ID and Client Secret.");

  const response = await fetchWithTimeout("https://api.igdb.com/v4/games", {
    method: "POST",
    headers: {
      "Client-ID": clientId,
      Authorization: `Bearer ${token.access_token}`,
      "Content-Type": "text/plain",
    },
    body: "fields id; limit 1;",
  });
  if (!response.ok) throw new Error(`IGDB verification failed (${response.status}). Check that the Twitch app is set up correctly.`);
  return true;
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    return await fetch(url, { ...options, signal: controller.signal, cache: "no-store" });
  } catch (error) {
    if (error?.name === "AbortError") throw new Error("IGDB verification timed out. Try again.");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function clearHealthCache(request) {
  try {
    const cache = caches.default;
    const cacheKey = new Request(new URL("/api/secret-status/health-cache", request.url).toString());
    await cache.delete(cacheKey);
  } catch {}
}

async function encryptCredentials(credentials, password) {
  const key = await credentialKey(password);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(JSON.stringify(credentials)));
  return `${encodeBase64Url(iv)}.${encodeBase64Url(new Uint8Array(ciphertext))}`;
}

async function decryptCredentials(value, password) {
  const [ivText, ciphertextText] = String(value || "").split(".");
  if (!ivText || !ciphertextText || !password) throw new Error("Invalid encrypted IGDB credentials");
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: decodeBase64Url(ivText) },
    await credentialKey(password),
    decodeBase64Url(ciphertextText),
  );
  const credentials = JSON.parse(new TextDecoder().decode(plaintext));
  if (!credentials.clientId || !credentials.clientSecret) throw new Error("Invalid IGDB credentials");
  return credentials;
}

async function credentialKey(password) {
  const material = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`gamelist:igdb:credentials:${password}`));
  return crypto.subtle.importKey("raw", material, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
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
