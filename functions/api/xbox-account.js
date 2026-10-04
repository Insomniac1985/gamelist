import { isEditorRequest } from "./editor-auth.js";

const XBOX_API_KEY = "xbox:account:openxbl-api-key";

export async function onRequestGet({ request, env = {} }) {
  if (!await isEditorRequest(request, env)) return json({ error: "Unauthorized" }, 401);
  return json({ apiKeyAvailable: Boolean(await getXboxApiKey(env)) });
}

export async function onRequestPost({ request, env = {} }) {
  if (!await isEditorRequest(request, env)) return json({ error: "Unauthorized" }, 401);
  const body = await request.json().catch(() => ({}));
  if (body.action === "disconnect") {
    if (!env.GAMELIST) return json({ error: "Missing GAMELIST KV binding" }, 503);
    await env.GAMELIST.put(XBOX_API_KEY, "disabled");
    return json({ apiKeyAvailable: false });
  }
  if (body.action !== "connect") return json({ error: "Unknown action" }, 400);
  if (!env.GAMELIST) return json({ error: "Missing GAMELIST KV binding" }, 503);
  if (!env.EDIT_PASSWORD) return json({ error: "EDIT_PASSWORD is required to securely store the OpenXBL API key." }, 503);

  const apiKey = String(body.apiKey || "").trim();
  if (!apiKey || apiKey.length > 512) return json({ error: "Paste a valid OpenXBL API key." }, 400);
  try {
    const response = await fetch("https://api.xbl.io/v2/account", {
      headers: { "X-Authorization": apiKey, Accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) throw new Error("OpenXBL could not verify that API key. Check it and try again.");
    const profile = xboxIdentity(await response.json().catch(() => ({})));
    if (!profile.gamertag && !profile.xuid) throw new Error("OpenXBL verified the key but did not return an Xbox account ID.");
    await env.GAMELIST.put(XBOX_API_KEY, await encryptCredential(apiKey, env.EDIT_PASSWORD));
    return json({ apiKeyAvailable: true, ...profile });
  } catch (error) {
    return json({ error: error?.message || "Could not connect the OpenXBL API key." }, 400);
  }
}

function xboxIdentity(data) {
  const content = data?.content || data;
  const account = content?.account || content;
  const person = account?.profileUsers?.[0] || account?.people?.[0] || account;
  const settings = person?.settings || account?.settings || [];
  const setting = (name) => settings.find((item) => String(item?.id || "").toLowerCase() === name.toLowerCase())?.value || "";
  return {
    gamertag: String(person?.gamertag || person?.Gamertag || setting("Gamertag") || "").trim(),
    xuid: String(person?.xuid || person?.XUID || person?.id || setting("XUID") || "").trim(),
  };
}

export async function getXboxApiKey(env = {}) {
  const stored = await env.GAMELIST?.get(XBOX_API_KEY);
  if (!stored || stored === "disabled") return "";
  try { return await decryptCredential(stored, env.EDIT_PASSWORD || ""); } catch { return ""; }
}

async function encryptCredential(value, password) {
  const key = await credentialKey(password);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(value));
  return `${encodeBase64Url(iv)}.${encodeBase64Url(new Uint8Array(encrypted))}`;
}

async function decryptCredential(value, password) {
  const [ivText, dataText] = String(value || "").split(".");
  if (!ivText || !dataText || !password) throw new Error("Invalid encrypted OpenXBL API key");
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: decodeBase64Url(ivText) }, await credentialKey(password), decodeBase64Url(dataText));
  return new TextDecoder().decode(plain);
}

async function credentialKey(password) {
  const material = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`gamelist:xbox:api-key:${password}`));
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
