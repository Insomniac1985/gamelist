const KV_KEY = "gamelist-data";

export async function onRequestGet({ env }) {
  if (!env.GAMELIST) return json({ games: [] });
  const data = await env.GAMELIST.get(KV_KEY, "json");
  return json(data || { games: [] });
}

export async function onRequestPut({ request, env }) {
  if (!env.GAMELIST) return json({ error: "Missing GAMELIST KV binding" }, 501);
  const password = request.headers.get("x-edit-password") || "";
  if (password !== (env.EDIT_PASSWORD || "shabii")) {
    return json({ error: "Unauthorized" }, 401);
  }
  const body = await request.json().catch(() => null);
  if (!body || !Array.isArray(body.games)) {
    return json({ error: "Expected { games: [] }" }, 400);
  }
  await env.GAMELIST.put(KV_KEY, JSON.stringify({
    games: body.games,
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
