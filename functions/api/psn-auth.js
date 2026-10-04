const PSN_AUTH_BASE = "https://ca.account.sony.com/api/authz/v3/oauth";
const PSN_CLIENT_ID = "09515159-7237-4370-9b40-3806e67c0891";
const PSN_REDIRECT_URI = "com.scee.psxandroid.scecompcall://redirect";
const PSN_BASIC_AUTH = "Basic MDk1MTUxNTktNzIzNy00MzcwLTliNDAtMzgwNmU2N2MwODkxOnVjUGprYTV0bnRCMktxc1A=";
const PSN_NPSSO_KEY = "psn:account:npsso";
const PSN_ACCOUNT_MANAGED_KEY = "psn:account:managed";
const PSN_NPSSO_TTL_SECONDS = 60 * 24 * 60 * 60;

export async function getPsnNpsso(env = {}) {
  const stored = await env.GAMELIST?.get(PSN_NPSSO_KEY);
  if (stored === "disabled") return "";
  if (stored) {
    try { return await decryptCredential(stored, env.EDIT_PASSWORD || ""); } catch { return ""; }
  }
  if (await env.GAMELIST?.get(PSN_ACCOUNT_MANAGED_KEY)) return "";
  return String(env.PSN_NPSSO || "").trim();
}

export async function savePsnNpsso(npsso, env = {}) {
  if (!env.GAMELIST) throw new Error("Missing GAMELIST KV binding");
  if (!env.EDIT_PASSWORD) throw new Error("EDIT_PASSWORD is required to securely store the PlayStation connection.");
  const value = String(npsso || "").trim();
  if (!value || value.length > 2048) throw new Error("Paste the PlayStation NPSSO token value.");
  await getPsnAccessToken(value);
  await env.GAMELIST.put(PSN_ACCOUNT_MANAGED_KEY, "1");
  await env.GAMELIST.put(PSN_NPSSO_KEY, await encryptCredential(value, env.EDIT_PASSWORD), { expirationTtl: PSN_NPSSO_TTL_SECONDS });
}

export async function disconnectPsnNpsso(env = {}) {
  if (!env.GAMELIST) throw new Error("Missing GAMELIST KV binding");
  await env.GAMELIST.put(PSN_ACCOUNT_MANAGED_KEY, "1");
  await env.GAMELIST.delete(PSN_NPSSO_KEY);
}

let tokenCache;
let tokenPromise;

export async function getPsnAccessToken(npsso) {
  const secret = String(npsso || "").trim();
  if (!secret) throw new Error("Missing PSN_NPSSO");
  if (tokenCache?.npsso === secret && Date.now() < tokenCache.expiresAt) return tokenCache.token;
  if (tokenPromise?.npsso === secret) return tokenPromise.promise;

  const promise = exchangeNpsso(secret)
    .then(({ token, expiresIn }) => {
      tokenCache = {
        npsso: secret,
        token,
        expiresAt: Date.now() + Math.max(300, expiresIn - 300) * 1000,
      };
      return token;
    })
    .finally(() => {
      if (tokenPromise?.promise === promise) tokenPromise = null;
    });
  tokenPromise = { npsso: secret, promise };
  return promise;
}

async function exchangeNpsso(npsso) {
  const codeUrl = `${PSN_AUTH_BASE}/authorize?${new URLSearchParams({
    access_type: "offline",
    client_id: PSN_CLIENT_ID,
    redirect_uri: PSN_REDIRECT_URI,
    response_type: "code",
    scope: "psn:mobile.v2.core psn:clientapp",
  })}`;
  const codeResponse = await fetch(codeUrl, {
    headers: { Cookie: `npsso=${npsso}` },
    redirect: "manual",
  });
  const location = codeResponse.headers.get("location") || "";
  if (!location.includes("?code=")) throw new Error(`Missing PSN access code (${codeResponse.status})`);
  const code = new URLSearchParams(location.split("redirect/")[1]).get("code");
  if (!code) throw new Error("Missing PSN code");

  const tokenResponse = await fetch(`${PSN_AUTH_BASE}/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: PSN_BASIC_AUTH,
    },
    body: new URLSearchParams({
      code,
      redirect_uri: PSN_REDIRECT_URI,
      grant_type: "authorization_code",
      token_format: "jwt",
    }).toString(),
  });
  if (!tokenResponse.ok) throw new Error(`PSN token exchange failed (${tokenResponse.status})`);
  const data = await tokenResponse.json();
  if (!data.access_token) throw new Error("Missing PSN access token");
  return { token: data.access_token, expiresIn: Number(data.expires_in || 3600) };
}

async function encryptCredential(value, password) {
  const key = await credentialKey(password);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(value));
  return `${encodeBase64Url(iv)}.${encodeBase64Url(new Uint8Array(encrypted))}`;
}

async function decryptCredential(value, password) {
  const [ivText, dataText] = String(value || "").split(".");
  if (!ivText || !dataText || !password) throw new Error("Invalid encrypted PlayStation credential");
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: decodeBase64Url(ivText) }, await credentialKey(password), decodeBase64Url(dataText));
  return new TextDecoder().decode(plain);
}

async function credentialKey(password) {
  const material = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`gamelist:psn:npsso:${password}`));
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
