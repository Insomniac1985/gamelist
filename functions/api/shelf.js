import { isEditorRequest } from "./editor-auth.js";

const KV_KEY = "shelf-data";

export async function onRequestGet({ env }) {
  if (!env.GAMELIST) return json({ games: [], overrides: {} });
  const data = await env.GAMELIST.get(KV_KEY, "json");
  return json(data || { games: [], overrides: {} });
}

export async function onRequestPut({ request, env }) {
  if (!env.GAMELIST) return json({ error: "Missing GAMELIST KV binding" }, 501);
  if (!env.EDIT_PASSWORD) return json({ error: "Missing EDIT_PASSWORD secret" }, 503);
  if (!await isEditorRequest(request, env)) return json({ error: "Unauthorized" }, 401);
  const body = await request.json().catch(() => null);
  if (!body || !Array.isArray(body.games) || !body.overrides || typeof body.overrides !== "object") {
    return json({ error: "Expected { games: [], overrides: {} }" }, 400);
  }
  const data = {
    games: body.games.slice(0, 1000),
    overrides: body.overrides,
    updatedAt: new Date().toISOString(),
  };
  await env.GAMELIST.put(KV_KEY, JSON.stringify(data));
  return json({ ok: true, updatedAt: data.updatedAt });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}
