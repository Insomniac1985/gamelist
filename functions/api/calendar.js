const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events";

export async function onRequestPost({ request, env = {} }) {
  if (!env.EDIT_PASSWORD) return json({ error: "Missing EDIT_PASSWORD secret" }, 503);
  const password = request.headers.get("x-edit-password") || "";
  if (password !== env.EDIT_PASSWORD) return json({ error: "Unauthorized" }, 401);

  const body = await request.json().catch(() => null);
  const games = Array.isArray(body?.games) ? body.games : [body?.game].filter(Boolean);
  if (!games.length) return json({ error: "Expected game or games" }, 400);
  return syncCalendarGames(games, env);
}

async function syncCalendarGames(games, env) {
  const calendarId = env.GOOGLE_CALENDAR_ID || "primary";
  const serviceEmail = env.GOOGLE_SERVICE_ACCOUNT_EMAIL || env.GOOGLE_CLIENT_EMAIL;
  const privateKey = normalizePrivateKey(env.GOOGLE_PRIVATE_KEY);
  if (!serviceEmail || !privateKey || !calendarId) {
    return json({ error: "Missing Google Calendar service account secrets" }, 503);
  }

  try {
    const accessToken = await getGoogleAccessToken(serviceEmail, privateKey);
    const results = [];
    for (const game of games.slice(0, 100)) {
      const releaseDate = dateOnly(game.releaseDate);
      if (!game.title || !releaseDate || !game.preorderStore) {
        results.push({ title: game.title || "", skipped: true });
        continue;
      }
      results.push(await upsertPreorderEvent(accessToken, calendarId, game, releaseDate));
    }
    return json({
      ok: true,
      created: results.filter((result) => result.ok).length,
      skipped: results.filter((result) => result.skipped).length,
      results,
    });
  } catch (error) {
    return json({ error: "Google Calendar event failed", detail: error?.message || "Unknown error" }, 500);
  }
}

async function upsertPreorderEvent(accessToken, calendarId, game, releaseDate) {
  const eventId = await preorderEventId(game);
  const event = {
    id: eventId,
    summary: `Preorder ${game.title}`,
    description: [
      game.platform ? `Platform: ${game.platform}` : "",
      game.preorderStore ? `Preordered at: ${game.preorderStore}` : "",
      game.preferredStore ? `Preferred store: ${game.preferredStore}` : "",
    ].filter(Boolean).join("\n"),
    start: { date: releaseDate },
    end: { date: nextDate(releaseDate) },
  };

  let response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(event),
  });
  if (response.status === 409) {
    response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
    });
  }
  if (!response.ok) {
    const error = await response.text();
    return { title: game.title || "", ok: false, error };
  }
  const data = await response.json();
  return { title: game.title || "", ok: true, eventId: data.id, htmlLink: data.htmlLink || "" };
}

async function getGoogleAccessToken(serviceEmail, privateKey) {
  const now = Math.floor(Date.now() / 1000);
  const jwt = await signJwt({
    alg: "RS256",
    typ: "JWT",
  }, {
    iss: serviceEmail,
    scope: GOOGLE_CALENDAR_SCOPE,
    aud: GOOGLE_TOKEN_URL,
    iat: now,
    exp: now + 3600,
  }, privateKey);

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }).toString(),
  });
  if (!response.ok) throw new Error(`Google token failed (${response.status})`);
  const data = await response.json();
  if (!data.access_token) throw new Error("Missing Google access token");
  return data.access_token;
}

async function signJwt(header, payload, privateKey) {
  const unsigned = `${base64UrlJson(header)}.${base64UrlJson(payload)}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(privateKey),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned));
  return `${unsigned}.${base64UrlBytes(new Uint8Array(signature))}`;
}

function base64UrlJson(value) {
  return base64UrlBytes(new TextEncoder().encode(JSON.stringify(value)));
}

function base64UrlBytes(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function pemToArrayBuffer(pem) {
  const base64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s+/g, "");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes.buffer;
}

function normalizePrivateKey(value) {
  return String(value || "").replaceAll("\\n", "\n").trim();
}

async function preorderEventId(game) {
  const source = `gamelist-preorder-${game.id || game.title}`;
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(source));
  return `gamelist${Array.from(new Uint8Array(hash)).map((byte) => byte.toString(16).padStart(2, "0")).join("").slice(0, 32)}`;
}

function dateOnly(value) {
  const match = String(value || "").match(/\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : "";
}

function nextDate(value) {
  const date = new Date(`${value}T00:00:00`);
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
