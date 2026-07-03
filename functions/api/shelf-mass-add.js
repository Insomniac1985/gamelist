import { isEditorRequest } from "./editor-auth.js";
import { syncShelfGamesToBacklog } from "./shelf.js";

const KV_KEY = "shelf-data";
const MAX_GAMES = 1000;

export async function onRequestGet() {
  return html(runnerHtml());
}

export async function onRequestPost({ request, env }) {
  if (!env.GAMELIST) return json({ error: "Missing GAMELIST KV binding" }, 501);
  if (!env.EDIT_PASSWORD) return json({ error: "Missing EDIT_PASSWORD secret" }, 503);
  if (!await isEditorRequest(request, env)) return json({ error: "Unauthorized" }, 401);

  const body = await request.json().catch(() => null);
  if (!body || (typeof body !== "object" && !Array.isArray(body))) {
    return json({ error: "Expected { games: [] }, { ids: [] }, or { acceptPending: true }" }, 400);
  }

  const incomingGames = Array.isArray(body) ? body : Array.isArray(body.games) ? body.games : [];
  const requestedIds = new Set((Array.isArray(body.ids) ? body.ids : []).map((id) => String(id || "").trim()).filter(Boolean));
  const acceptPending = Boolean(body.acceptPending);
  if (!incomingGames.length && !requestedIds.size && !acceptPending) {
    return json({ error: "No games or pending additions were provided" }, 400);
  }

  const existing = await env.GAMELIST.get(KV_KEY, "json") || {};
  const sourceGames = Array.isArray(existing.sourceGames) ? existing.sourceGames : [];
  const overrides = existing.overrides && typeof existing.overrides === "object" ? existing.overrides : {};
  const favoriteGameIds = Array.isArray(existing.favoriteGameIds) ? existing.favoriteGameIds.slice(0, 5) : [];
  const previousGames = Array.isArray(existing.games) ? existing.games : [];
  const previousIds = new Set([...sourceGames, ...previousGames].map((game) => game?.id).filter(Boolean));
  const now = new Date().toISOString();
  let accepted = 0;
  let updated = 0;

  const games = previousGames.map((game) => {
    if (!game?.pendingCollection) return game;
    if (!acceptPending && !requestedIds.has(game.id)) return game;
    accepted += 1;
    updated += 1;
    return { ...game, pendingCollection: false, updatedAt: now };
  });

  const additions = [];
  const gamesById = new Map(games.map((game, index) => [game.id, index]));
  for (const rawGame of incomingGames) {
    const game = normalizeGame(rawGame, previousIds, now);
    if (!game) continue;
    previousIds.add(game.id);
    if (gamesById.has(game.id)) {
      const index = gamesById.get(game.id);
      games[index] = { ...games[index], ...game, updatedAt: now };
      updated += 1;
    } else {
      additions.push(game);
      gamesById.set(game.id, games.length + additions.length - 1);
    }
  }

  const nextGames = [...additions, ...games].slice(0, MAX_GAMES);
  const data = {
    sourceGames,
    games: nextGames,
    overrides,
    layout: existing.layout || null,
    favoriteGameIds,
    updatedAt: now,
  };

  await env.GAMELIST.put(KV_KEY, JSON.stringify(data));
  await syncShelfGamesToBacklog(env, nextGames, additions);
  return json({ ok: true, added: additions.length, accepted, updated, total: nextGames.length, updatedAt: now });
}

function normalizeGame(rawGame, usedIds, now) {
  if (!rawGame || typeof rawGame !== "object") return null;
  const title = String(rawGame.title || "").trim();
  if (!title) return null;
  const id = uniqueId(String(rawGame.id || "").trim() || slugId(title, rawGame.platform), usedIds);
  return {
    ...rawGame,
    id,
    title,
    platform: String(rawGame.platform || "").trim(),
    country: rawGame.country || rawGame.region || "",
    pendingCollection: false,
    createdAt: rawGame.createdAt || now,
    updatedAt: now,
    recordType: rawGame.recordType || "Owned",
    releaseType: rawGame.releaseType || "Official",
  };
}

function uniqueId(id, usedIds) {
  let value = cleanId(id) || generatedId();
  if (!usedIds.has(value)) return value;
  let index = 2;
  while (usedIds.has(`${value}-${index}`)) index += 1;
  return `${value}-${index}`;
}

function slugId(title, platform) {
  const base = [title, platform].map((value) => String(value || "").trim()).filter(Boolean).join("-");
  return `shelf-api-${base}`;
}

function cleanId(value) {
  return String(value || "").trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

function generatedId() {
  if (globalThis.crypto?.randomUUID) return `shelf-api-${globalThis.crypto.randomUUID()}`;
  return `shelf-api-${Date.now()}`;
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}

function html(markup, status = 200) {
  return new Response(markup, { status, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

function runnerHtml() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Shelf Mass Add</title>
  <style>
    body{margin:0;padding:24px;font:14px/1.45 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;color:#f6f7fb;background:#111318}
    main{max-width:900px;margin:auto;display:grid;gap:16px}
    button,a,input{border:1px solid #3d4655;border-radius:8px;background:#1e2530;color:#f6f7fb;padding:10px 12px;text-decoration:none}
    button{cursor:pointer}button.primary{border-color:#ff3b62;background:#ff0039}button:disabled{opacity:.55;cursor:wait}
    .row{display:flex;gap:10px;flex-wrap:wrap;align-items:center}.bar{height:10px;background:#202733;border-radius:999px;overflow:hidden}.bar span{display:block;height:100%;width:0;background:#ff0039}
    pre{white-space:pre-wrap;background:#171b22;border:1px solid #303846;border-radius:8px;padding:14px;min-height:260px;max-height:58vh;overflow:auto}
    label{display:grid;gap:6px;max-width:180px}
  </style>
</head>
<body>
  <main>
    <h1>Shelf Mass Add</h1>
    <p>This accepts pending Shelf New additions into the physical collection in small batches.</p>
    <div class="row">
      <label>Batch size <input id="limit" type="number" min="1" max="50" value="10"></label>
      <button class="primary" id="start" type="button">Accept pending additions</button>
      <a href="/shelf">Back to Shelf</a>
    </div>
    <div class="bar"><span id="bar"></span></div>
    <pre id="log"></pre>
  </main>
  <script>
    const start = document.querySelector("#start");
    const log = document.querySelector("#log");
    const bar = document.querySelector("#bar");
    const limit = document.querySelector("#limit");
    const password = () => sessionStorage.getItem("gamelist-editor:password") || "";
    const line = (text) => { log.textContent += text + "\\n"; log.scrollTop = log.scrollHeight; };
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    start.addEventListener("click", async () => {
      start.disabled = true;
      log.textContent = "";
      try {
        const shelf = await fetch("/api/shelf", { cache: "no-store" }).then((response) => response.json());
        const queue = (shelf.games || []).filter((game) => game.pendingCollection);
        const ids = queue.map((game) => game.id);
        if (!ids.length) { line("No pending Shelf additions found."); return; }
        const size = Math.max(1, Math.min(50, Number(limit.value) || 10));
        line("Found " + ids.length + " pending additions. Running " + size + " at a time...");
        line("");
        line("Games queued:");
        queue.forEach((game, index) => line((index + 1) + ". " + (game.title || game.id) + (game.platform ? " [" + game.platform + "]" : "")));
        line("");
        let accepted = 0;
        for (let index = 0; index < ids.length; index += size) {
          const batchGames = queue.slice(index, index + size);
          const batch = batchGames.map((game) => game.id);
          line("Fetching batch " + (Math.floor(index / size) + 1) + ": " + batchGames.map((game) => game.title || game.id).join(", "));
          const response = await fetch("/api/shelf-mass-add", {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-edit-password": password() },
            body: JSON.stringify({ ids: batch }),
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || response.statusText);
          accepted += data.accepted || 0;
          bar.style.width = Math.round(Math.min(ids.length, index + batch.length) / ids.length * 100) + "%";
          line("Batch " + (Math.floor(index / size) + 1) + ": accepted " + (data.accepted || 0) + ".");
          await sleep(350);
        }
        line("Done. Accepted " + accepted + " pending addition" + (accepted === 1 ? "" : "s") + ".");
      } catch (error) {
        line("Error: " + (error.message || error));
      } finally {
        start.disabled = false;
      }
    });
  </script>
</body>
</html>`;
}
