import { isEditorRequest } from "./editor-auth.js";

const TOKEN_KEY = "pricecharting:account:api-token";
const API_URL = "https://www.pricecharting.com/api/product";

export async function onRequestGet({ request, env = {} }) {
  if (!await isEditorRequest(request, env)) return json({ error: "Unauthorized" }, 401);
  const stored = await env.GAMELIST?.get(TOKEN_KEY);
  const token = await getPriceChartingToken(env);
  return json({ apiTokenAvailable: Boolean(token), userApiTokenStored: Boolean(stored && stored !== "disabled") });
}

export async function onRequestPost({ request, env = {} }) {
  if (!await isEditorRequest(request, env)) return json({ error: "Unauthorized" }, 401);
  const body = await request.json().catch(() => ({}));

  if (body.action === "disconnect") {
    if (!env.GAMELIST) return json({ error: "Missing GAMELIST KV binding" }, 503);
    await env.GAMELIST.put(TOKEN_KEY, "disabled");
    return json({ apiTokenAvailable: false });
  }
  if (body.action !== "connect") return json({ error: "Unknown action" }, 400);
  if (!env.GAMELIST) return json({ error: "Missing GAMELIST KV binding" }, 503);
  if (!env.EDIT_PASSWORD) return json({ error: "EDIT_PASSWORD is required to securely store the PriceCharting API token." }, 503);

  const token = String(body.token || "").trim();
  if (!/^[a-z\d]{40}$/i.test(token)) return json({ error: "Enter the 40-character API token from your PriceCharting subscription." }, 400);

  try {
    const endpoint = new URL(API_URL);
    endpoint.searchParams.set("t", token);
    endpoint.searchParams.set("q", "super mario");
    const response = await fetch(endpoint, { cache: "no-store", signal: AbortSignal.timeout(12000) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.status !== "success") {
      throw new Error("PriceCharting could not verify that token. Check that API access is active for your subscription.");
    }
    await env.GAMELIST.put(TOKEN_KEY, await encryptCredential(token, env.EDIT_PASSWORD));
    return json({ apiTokenAvailable: true, userApiTokenStored: true });
  } catch (error) {
    return json({ error: error?.message || "Could not connect the PriceCharting API token." }, 400);
  }
}

export async function getPriceChartingToken(env = {}) {
  const stored = await env.GAMELIST?.get(TOKEN_KEY);
  if (stored === "disabled") return "";
  if (stored) {
    try { return await decryptCredential(stored, env.EDIT_PASSWORD || ""); } catch {}
  }
  return String(env.PRICECHARTING_TOKEN || globalThis.process?.env?.PRICECHARTING_TOKEN || "").trim();
}

async function encryptCredential(value, password) {
  const key = await credentialKey(password);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(value));
  return `${encodeBase64Url(iv)}.${encodeBase64Url(new Uint8Array(encrypted))}`;
}

async function decryptCredential(value, password) {
  const [ivText, dataText] = String(value || "").split(".");
  if (!ivText || !dataText || !password) throw new Error("Invalid encrypted PriceCharting API token");
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: decodeBase64Url(ivText) }, await credentialKey(password), decodeBase64Url(dataText));
  return new TextDecoder().decode(plain);
}

async function credentialKey(password) {
  const material = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`gamelist:pricecharting:api-token:${password}`));
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
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
