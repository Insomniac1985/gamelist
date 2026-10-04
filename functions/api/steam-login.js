import { isEditorRequest } from "./editor-auth.js";

const STEAM_OPENID = "https://steamcommunity.com/openid/login";
const PENDING_PREFIX = "steam:openid:pending:";
const PENDING_TTL = 10 * 60;

export async function onRequestGet({ request, env = {} }) {
  if (!await isEditorRequest(request, env)) return popupResult({ error: "Sign in to Gamelist, then start Steam sign-in again." });
  const url = new URL(request.url);
  if (url.searchParams.get("action") === "start") return start(request, env);
  return complete(request, env);
}

async function start(request, env) {
  if (!env.GAMELIST) return json({ error: "Missing GAMELIST KV binding" }, 503);
  const state = randomToken(24);
  const url = new URL(request.url);
  const returnTo = new URL("/api/steam-login", url.origin);
  returnTo.searchParams.set("state", state);
  await env.GAMELIST.put(`${PENDING_PREFIX}${state}`, JSON.stringify({ state, returnTo: returnTo.href }), { expirationTtl: PENDING_TTL });
  const params = new URLSearchParams({
    "openid.ns": "http://specs.openid.net/auth/2.0",
    "openid.mode": "checkid_setup",
    "openid.return_to": returnTo.href,
    "openid.realm": `${url.origin}/`,
    "openid.identity": "http://specs.openid.net/auth/2.0/identifier_select",
    "openid.claimed_id": "http://specs.openid.net/auth/2.0/identifier_select",
  });
  return json({ state, url: `${STEAM_OPENID}?${params}` });
}

async function complete(request, env) {
  const url = new URL(request.url);
  const state = url.searchParams.get("state") || "";
  const pending = state ? await env.GAMELIST?.get(`${PENDING_PREFIX}${state}`, "json") : null;
  const returnTo = pending?.returnTo ? new URL(pending.returnTo) : null;
  if (!pending?.state || state !== pending.state || !returnTo || `${url.origin}${url.pathname}` !== `${returnTo.origin}${returnTo.pathname}` || url.searchParams.get("openid.return_to") !== pending.returnTo) {
    return popupResult({ error: "Steam sign-in expired. Start again from Settings.", state });
  }
  const claimedId = url.searchParams.get("openid.claimed_id") || "";
  const identity = url.searchParams.get("openid.identity") || "";
  const match = claimedId.match(/^https?:\/\/steamcommunity\.com\/openid\/id\/(\d{17})\/?$/i);
  if (!match || identity !== claimedId || url.searchParams.get("openid.op_endpoint") !== STEAM_OPENID) {
    return popupResult({ error: "Steam returned an invalid account identity.", state });
  }

  const verification = new URLSearchParams();
  for (const [key, value] of url.searchParams) {
    if (key.startsWith("openid.")) verification.set(key, value);
  }
  verification.set("openid.mode", "check_authentication");
  const response = await fetch(STEAM_OPENID, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: verification.toString(),
  });
  const body = await response.text();
  if (!response.ok || !/^is_valid:true\s*$/m.test(body)) {
    return popupResult({ error: "Steam could not verify this sign-in. Please try again.", state });
  }
  await env.GAMELIST.delete(`${PENDING_PREFIX}${state}`);
  return popupResult({ steamId: match[1], state });
}

function popupResult(result = {}) {
  const payload = JSON.stringify({ type: "gamelist-steam-login", ...result }).replace(/</g, "\\u003c");
  const page = `<!doctype html><meta charset="utf-8"><title>Steam account</title><p>Returning to Gamelist…</p><script>if(window.opener){window.opener.postMessage(${payload},location.origin);window.close()}else{document.querySelector('p').textContent=${JSON.stringify(result.error || "Return to Gamelist Settings.")}}</script>`;
  return new Response(page, { status: result.error ? 400 : 200, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
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
