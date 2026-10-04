import { isEditorRequest } from "./editor-auth.js";

const APP_KEY_ENV = "OPENXBL_APP_KEY";
const PENDING_PREFIX = "xbox:openxbl:pending:";
const PENDING_TTL = 10 * 60;
const STATE_COOKIE = "gamelist_xbl_state";

export async function onRequestGet({ request, env = {} }) {
  if (!await isEditorRequest(request, env)) return popupResult({ error: "Sign in to Gamelist, then start Xbox sign-in again." });
  const url = new URL(request.url);
  if (url.searchParams.get("action") === "start") return start(request, env);
  return complete(request, env);
}

async function start(request, env) {
  const appKey = String(env[APP_KEY_ENV] || "").trim();
  if (!appKey) return json({ error: "OpenXBL app setup is required. Configure OPENXBL_APP_KEY and the matching OpenXBL callback URL first." }, 503);
  if (!env.GAMELIST) return json({ error: "Missing GAMELIST KV binding" }, 503);
  if (!env.EDIT_PASSWORD) return json({ error: "EDIT_PASSWORD is required to protect the Xbox sign-in state." }, 503);
  const nonce = randomToken(24);
  await env.GAMELIST.put(`${PENDING_PREFIX}${nonce}`, JSON.stringify({ nonce, appKey }), { expirationTtl: PENDING_TTL });
  const cookie = await createStateCookie(nonce, env.EDIT_PASSWORD);
  const response = json({ url: `https://xbl.io/app/auth/${encodeURIComponent(appKey)}`, state: nonce });
  response.headers.append("Set-Cookie", `${STATE_COOKIE}=${cookie}; Path=/api/xbox-login; HttpOnly; Secure; SameSite=Lax; Max-Age=${PENDING_TTL}`);
  return response;
}

async function complete(request, env) {
  const url = new URL(request.url);
  const code = String(url.searchParams.get("code") || "").trim();
  const nonce = await readStateCookie(request, env.EDIT_PASSWORD || "");
  const pending = nonce ? await env.GAMELIST?.get(`${PENDING_PREFIX}${nonce}`, "json") : null;
  if (!code || !pending?.nonce || nonce !== pending.nonce || pending.appKey !== String(env[APP_KEY_ENV] || "").trim()) {
    return popupResult({ error: "Xbox sign-in expired or could not be verified. Start again from Settings." });
  }
  try {
    const response = await fetch("https://xbl.io/app/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ code, app_key: pending.appKey }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "OpenXBL could not verify the Xbox sign-in.");
    const account = result.claim || result;
    const gamertag = String(account.gamertag || account.Gamertag || "").trim();
    const xuid = String(account.xuid || account.XUID || "").trim();
    if (!gamertag && !/^\d{12,20}$/.test(xuid)) throw new Error("OpenXBL did not return an Xbox gamertag or XUID.");
    await env.GAMELIST.delete(`${PENDING_PREFIX}${nonce}`);
    return popupResult({ gamertag, xuid, state: nonce });
  } catch (error) {
    return popupResult({ error: error?.message || "Xbox sign-in failed.", state: nonce });
  }
}

async function createStateCookie(nonce, secret) {
  const signature = await hmac(`${nonce}|${Math.floor(Date.now() / 1000) + PENDING_TTL}`, secret);
  return `${nonce}.${Math.floor(Date.now() / 1000) + PENDING_TTL}.${signature}`;
}

async function readStateCookie(request, secret) {
  const value = request.headers.get("Cookie")?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${STATE_COOKIE}=`))?.slice(STATE_COOKIE.length + 1) || "";
  const [nonce, expiryText, signature] = value.split(".");
  const expires = Number(expiryText);
  if (!nonce || !signature || !expires || expires < Math.floor(Date.now() / 1000)) return "";
  return await hmac(`${nonce}|${expiryText}`, secret) === signature ? nonce : "";
}

async function hmac(value, secret) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const bytes = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value)));
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function popupResult(result = {}) {
  const payload = JSON.stringify({ type: "gamelist-xbox-login", ...result }).replace(/</g, "\\u003c");
  const page = `<!doctype html><meta charset="utf-8"><title>Xbox account</title><p>Returning to Gamelist…</p><script>if(window.opener){window.opener.postMessage(${payload},location.origin);window.close()}else{document.querySelector('p').textContent=${JSON.stringify(result.error || "Return to Gamelist Settings.")}}</script>`;
  const response = new Response(page, { status: result.error ? 400 : 200, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
  response.headers.append("Set-Cookie", `${STATE_COOKIE}=; Path=/api/xbox-login; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);
  return response;
}

function randomToken(bytes = 32) {
  const value = crypto.getRandomValues(new Uint8Array(bytes));
  let binary = "";
  value.forEach((item) => { binary += String.fromCharCode(item); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
}
