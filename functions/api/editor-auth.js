const COOKIE_NAME = "gamelist_editor";
const SESSION_SECONDS = 60 * 60 * 24 * 400;
const SESSION_VERSION = "v2";

export async function createEditorSession(request, env) {
  const expires = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  const scopeHash = await hash(authScope(request, env));
  const payload = `${SESSION_VERSION}.${expires}.${scopeHash}`;
  const signature = await sign(payload, env.EDIT_PASSWORD || "");
  return `${payload}.${signature}`;
}

export async function isEditorRequest(request, env) {
  const password = request.headers.get("x-edit-password") || "";
  if (password && password === (env.EDIT_PASSWORD || "")) return true;
  const cookie = cookieValue(request.headers.get("Cookie") || "", COOKIE_NAME);
  if (!cookie) return false;
  const [version, expiresText, scopeHash, signature] = cookie.split(".");
  if (version !== SESSION_VERSION) return false;
  const expires = Number(expiresText);
  if (!expires || expires < Math.floor(Date.now() / 1000) || !scopeHash || !signature) return false;
  const expectedScopeHash = await hash(authScope(request, env));
  if (scopeHash !== expectedScopeHash) return false;
  const expected = await sign(`${version}.${expiresText}.${scopeHash}`, env.EDIT_PASSWORD || "");
  return signature === expected;
}

export function editorCookie(value) {
  return `${COOKIE_NAME}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_SECONDS}`;
}

export function clearEditorCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

async function sign(value, secret) {
  if (!secret) return "";
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const bytes = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value)));
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function hash(value) {
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

function authScope(request, env = {}) {
  const configured = String(env.EDITOR_AUTH_SCOPE || env.AUTH_SCOPE || env.SITE_AUTH_SCOPE || "").trim();
  if (configured) return configured;
  const repo = String(env.GITHUB_REPO_FULL_NAME || env.REPOSITORY_URL || env.GITLAB_PROJECT_URL || env.CI_PROJECT_URL || "").trim();
  const url = new URL(request.url);
  return `${url.origin}|${repo || "gamelist"}`;
}

function cookieValue(header, name) {
  return header.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1) || "";
}
