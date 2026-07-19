import { isEditorRequest } from "./editor-auth.js";
import { runnerStyle, runnerThemeSettings } from "./runner-style.js";
import { syncShelfGamesToBacklog } from "./shelf.js";

const KV_KEY = "shelf-data";
const MAX_GAMES = 1000;

export async function onRequestGet({ env }) {
  return html(runnerHtml(await runnerThemeSettings(env)));
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

function runnerHtml(settings = {}) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Shelf Mass Add</title>
  ${runnerStyle({ maxWidth: "900px", settings, page: "shelf" })}
</head>
<body>
  <main>
    <h1>Shelf Mass Add</h1>
    <p>This accepts pending Shelf New additions into the physical collection in small batches.</p>
    <div class="row">
      <label>Batch size <input id="limit" type="number" min="1" max="50" value="10"></label>
      <label>Platform <select id="platform"><option value="all">All platforms</option></select></label>
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
    const platform = document.querySelector("#platform");
    const password = () => sessionStorage.getItem("gamelist-editor:password") || "";
    const line = (text) => { log.textContent += text + "\\n"; log.scrollTop = log.scrollHeight; };
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    async function readJson(response, label) {
      const text = await response.text();
      let data = null;
      try { data = text ? JSON.parse(text) : {}; } catch {}
      if (!response.ok || !data) {
        const type = response.headers.get("content-type") || "unknown";
        throw new Error(label + " returned " + response.status + " " + response.statusText + " (" + type + "): " + text.slice(0, 180));
      }
      return data;
    }
    const platformKey = (value) => String(value || "").trim().toLowerCase();
    const platformLabel = (value) => String(value || "").trim() || "Unknown";
    const matchesPlatform = (game) => platform.value === "all" || platformKey(game.platform) === platform.value;
    async function hydratePlatforms() {
      const shelf = await fetch("/api/shelf", { cache: "no-store" }).then((response) => readJson(response, "GET /api/shelf"));
      const platforms = [...new Map((shelf.games || [])
        .filter((game) => game.pendingCollection)
        .map((game) => [platformKey(game.platform), platformLabel(game.platform)])
        .filter(([key]) => key)).entries()]
        .sort((a, b) => a[1].localeCompare(b[1]));
      platform.innerHTML = '<option value="all">All platforms</option>' + platforms.map(([key, label]) => '<option value="' + key.replace(/"/g, "&quot;") + '">' + label.replace(/</g, "&lt;") + '</option>').join("");
      return shelf;
    }
    hydratePlatforms().catch((error) => line("Could not load platforms: " + (error.message || error)));
    start.addEventListener("click", async () => {
      start.disabled = true;
      log.textContent = "";
      try {
        const shelf = await fetch("/api/shelf", { cache: "no-store" }).then((response) => readJson(response, "GET /api/shelf"));
        const queue = (shelf.games || []).filter((game) => game.pendingCollection && matchesPlatform(game));
        const ids = queue.map((game) => game.id);
        if (!ids.length) { line("No pending Shelf additions found for the selected platform."); return; }
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
          const data = await readJson(response, "POST /api/shelf-mass-add");
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
