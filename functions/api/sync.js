import { isEditorRequest } from "./editor-auth.js";

const KV_KEY = "gamelist-data";

export async function onRequestGet({ request, env }) {
  if (!env.GAMELIST) return json({ games: [] });
  const data = await env.GAMELIST.get(KV_KEY, "json");
  if (new URL(request.url).searchParams.get("settings") === "1") {
    return json({ settings: data?.settings || {} });
  }
  return json(data || { games: [] });
}

export async function onRequestPut({ request, env }) {
  if (!env.GAMELIST) return json({ error: "Missing GAMELIST KV binding" }, 501);
  if (!env.EDIT_PASSWORD) return json({ error: "Missing EDIT_PASSWORD secret" }, 503);
  if (!await isEditorRequest(request, env)) {
    return json({ error: "Unauthorized" }, 401);
  }
  const body = await request.json().catch(() => null);
  if (!body || !Array.isArray(body.games)) {
    return json({ error: "Expected { games: [], settings?: {} }" }, 400);
  }
  await env.GAMELIST.put(KV_KEY, JSON.stringify({
    games: body.games,
    settings: body.settings && typeof body.settings === "object" ? body.settings : {},
    updatedAt: new Date().toISOString(),
  }));
  return json({ ok: true });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
