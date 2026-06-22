const COOKIE_NAME = "gamelist_editor";
const SESSION_SECONDS = 60 * 60 * 8;

export async function createEditorSession(env) {
  const expires = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  const signature = await sign(String(expires), env.EDIT_PASSWORD || "");
  return `${expires}.${signature}`;
}

export async function isEditorRequest(request, env) {
  const password = request.headers.get("x-edit-password") || "";
  if (password && password === (env.EDIT_PASSWORD || "")) return true;
  const cookie = cookieValue(request.headers.get("Cookie") || "", COOKIE_NAME);
  if (!cookie) return false;
  const [expiresText, signature] = cookie.split(".");
  const expires = Number(expiresText);
  if (!expires || expires < Math.floor(Date.now() / 1000) || !signature) return false;
  const expected = await sign(expiresText, env.EDIT_PASSWORD || "");
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

function cookieValue(header, name) {
  return header.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1) || "";
}
