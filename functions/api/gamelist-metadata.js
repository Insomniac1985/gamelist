import { isEditorRequest } from "./editor-auth.js";
import { runnerStyle } from "./runner-style.js";
import { onRequestGet as searchMetadata } from "./search.js";

const KV_KEY = "gamelist-data";
const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

export async function onRequestGet() {
  return html(runnerHtml());
}

export async function onRequestPost({ request, env }) {
  if (!env.GAMELIST) return json({ error: "Missing GAMELIST KV binding" }, 501);
  if (!env.EDIT_PASSWORD) return json({ error: "Missing EDIT_PASSWORD secret" }, 503);
  if (!await isEditorRequest(request, env)) return json({ error: "Unauthorized" }, 401);

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) return json({ error: "Expected { all: true } or { ids: [] }" }, 400);
  const ids = new Set((Array.isArray(body.ids) ? body.ids : []).map((id) => String(id || "").trim()).filter(Boolean));
  if (!body.all && !ids.size) return json({ error: "Provide all: true or ids: []" }, 400);

  const options = {
    overwrite: Boolean(body.overwrite),
    includeCompleted: Boolean(body.includeCompleted),
    limit: Math.min(MAX_LIMIT, Math.max(1, Number(body.limit) || DEFAULT_LIMIT)),
  };
  const data = await env.GAMELIST.get(KV_KEY, "json") || { games: [], settings: {} };
  const games = Array.isArray(data.games) ? data.games : [];
  const candidates = games
    .map((game, index) => ({ game, index }))
    .filter(({ game }) => game?.title && (body.all || ids.has(game.id)) && (options.includeCompleted || !game.completedAt));
  const selected = candidates.slice(0, options.limit);
  let updated = 0;
  const errors = [];

  for (const item of selected) {
    try {
      const metadata = await fetchGameMetadata(item.game, env);
      if (!metadata) continue;
      const next = mergeMetadata(item.game, metadata, options);
      if (JSON.stringify(stripRuntimeFields(item.game)) === JSON.stringify(stripRuntimeFields(next))) continue;
      updated += 1;
      games[item.index] = stripRuntimeFields(next);
    } catch (error) {
      errors.push({ id: item.game.id, title: item.game.title, error: error?.message || "Metadata unavailable" });
    }
  }

  const now = new Date().toISOString();
  await env.GAMELIST.put(KV_KEY, JSON.stringify({
    games,
    settings: data.settings || {},
    updatedAt: now,
  }));
  return json({ ok: true, processed: selected.length, updated, errors, remaining: Math.max(0, candidates.length - selected.length), updatedAt: now });
}

async function fetchGameMetadata(game, env) {
  for (const query of metadataQueries(game.title)) {
    const url = new URL("https://local/api/search");
    url.searchParams.set("q", query);
    if (game.platform) url.searchParams.set("platform", game.platform);
    const response = await searchMetadata({ request: new Request(url), env });
    const data = response.ok ? await response.json() : { results: [] };
    const result = bestTitleMatch(game.title, data.results || []);
    if (result) return result;
  }
  return null;
}

function mergeMetadata(game, data, options) {
  const next = { ...game };
  setField(next, "cover", data.cover, options);
  setField(next, "releaseDate", data.releaseDate, options);
  setField(next, "publisher", data.publisher, options);
  setField(next, "developer", data.developer, options);
  setField(next, "description", data.description, options);
  setField(next, "igdbUrl", data.igdbUrl, options);
  setField(next, "trailerUrl", data.trailerUrl, options);
  setField(next, "lengthHours", data.lengthHours, options);
  if ((options.overwrite || !Array.isArray(next.genres) || !next.genres.length) && Array.isArray(data.genres) && data.genres.length) next.genres = data.genres;
  next.storeLinks = mergeStoreLinks(next.storeLinks, data.storeLinks, options);
  if (data.hltbId) next.hltbId = data.hltbId;
  if (data.igdbId) next.igdbId = data.igdbId;
  next.updatedAt = new Date().toISOString();
  return next;
}

function setField(target, key, value, { overwrite }) {
  if (value == null || value === "") return;
  if (overwrite || target[key] == null || target[key] === "" || (Array.isArray(target[key]) && !target[key].length)) target[key] = value;
}

function mergeStoreLinks(existing, incoming, options) {
  const next = existing && typeof existing === "object" ? { ...existing } : {};
  for (const [key, value] of Object.entries(incoming || {})) setField(next, key, value, options);
  return next;
}

function metadataQueries(title) {
  const plain = String(title || "").trim();
  const withoutBrackets = plain.replace(/\s*[\[(][^\])]*(?:edition|collector|collectors|limited|special|deluxe|agent|day one|steelbook)[^\])]*[\])]\s*/gi, " ").trim();
  const withoutEdition = withoutBrackets.replace(/\s+(?:special|collector'?s?|limited|deluxe|complete|ultimate|definitive|premium|gold|standard|day one|steelbook)(?:\s+\w+){0,3}\s+edition\s*$/i, "").trim();
  return [...new Set([plain, withoutBrackets, withoutEdition].filter(Boolean))];
}

function bestTitleMatch(title, results) {
  return (results || [])
    .map((result) => ({ result, score: titleScore(title, result.title) }))
    .filter(({ score }) => score >= 0.62)
    .sort((a, b) => b.score - a.score)[0]?.result || null;
}

function titleScore(wanted, found) {
  const a = normalize(wanted);
  const b = normalize(found);
  if (!a || !b) return 0;
  if (a === b) return 1.55;
  const tokens = a.split(" ").filter((token) => token.length > 1 && !["of", "the", "and"].includes(token));
  return tokens.filter((token) => b.includes(token)).length / Math.max(1, tokens.length) + (b.startsWith(a) ? 0.28 : 0);
}

function stripRuntimeFields(game) {
  const { sourceRecord, ...clean } = game || {};
  return clean;
}

function normalize(value) {
  return String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
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
  <title>Gamelist Metadata Fill</title>
  ${runnerStyle()}
</head>
<body>
  <main>
    <h1>Gamelist Metadata Fill</h1>
    <p>This fills only missing Gamelist fields from IGDB search. Existing values are left alone.</p>
    <div class="row">
      <label class="control">Batch size <input id="limit" type="number" min="1" max="25" value="5"></label>
      <label class="control">Platform <select id="platform"><option value="all">All platforms</option></select></label>
      <label><input id="completed" type="checkbox"> Include completed</label>
      <button class="primary" id="start" type="button">Fill missing metadata</button>
      <a href="/">Back to Gamelist</a>
    </div>
    <div class="bar"><span id="bar"></span></div>
    <pre id="log"></pre>
  </main>
  <script>
    const start = document.querySelector("#start");
    const log = document.querySelector("#log");
    const bar = document.querySelector("#bar");
    const limit = document.querySelector("#limit");
    const completed = document.querySelector("#completed");
    const platform = document.querySelector("#platform");
    const password = () => sessionStorage.getItem("gamelist-editor:password") || "";
    const line = (text) => { log.textContent += text + "\\n"; log.scrollTop = log.scrollHeight; };
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    async function readJson(response, label) {
      const text = await response.text();
      let data = null;
      try { data = text ? JSON.parse(text) : {}; } catch {}
      if (!response.ok || !data) throw new Error(label + " returned " + response.status + ": " + text.slice(0, 180));
      return data;
    }
    const platformKey = (value) => String(value || "").trim().toLowerCase();
    const platformLabel = (value) => String(value || "").trim() || "Unknown";
    const matchesPlatform = (game) => platform.value === "all" || platformKey(game.platform) === platform.value;
    async function hydratePlatforms() {
      const data = await fetch("/api/sync", { cache: "no-store" }).then((response) => readJson(response, "GET /api/sync"));
      const platforms = [...new Map((data.games || []).map((game) => [platformKey(game.platform), platformLabel(game.platform)]).filter(([key]) => key)).entries()].sort((a, b) => a[1].localeCompare(b[1]));
      platform.innerHTML = '<option value="all">All platforms</option>' + platforms.map(([key, label]) => '<option value="' + key.replace(/"/g, "&quot;") + '">' + label.replace(/</g, "&lt;") + '</option>').join("");
    }
    hydratePlatforms().catch((error) => line("Could not load platforms: " + (error.message || error)));
    const missingMetadata = (game) => !game.cover || !game.releaseDate || !game.publisher || !game.developer || !Array.isArray(game.genres) || !game.genres.length || !game.description || !game.igdbUrl;
    start.addEventListener("click", async () => {
      start.disabled = true;
      log.textContent = "";
      try {
        const data = await fetch("/api/sync", { cache: "no-store" }).then((response) => readJson(response, "GET /api/sync"));
        const queue = (data.games || []).filter((game) => game.title && (completed.checked || !game.completedAt) && matchesPlatform(game) && missingMetadata(game));
        const ids = queue.map((game) => game.id);
        if (!ids.length) { line("No Gamelist games are missing metadata for the selected platform."); return; }
        const size = Math.max(1, Math.min(25, Number(limit.value) || 5));
        line("Found " + ids.length + " games missing metadata. Running " + size + " at a time...");
        queue.forEach((game, index) => line((index + 1) + ". " + (game.title || game.id) + (game.platform ? " [" + game.platform + "]" : "")));
        line("");
        let updated = 0;
        const errors = [];
        for (let index = 0; index < ids.length; index += size) {
          const batchGames = queue.slice(index, index + size);
          const response = await fetch("/api/gamelist-metadata", {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-edit-password": password() },
            body: JSON.stringify({ ids: batchGames.map((game) => game.id), limit: size, includeCompleted: completed.checked }),
          });
          const result = await readJson(response, "POST /api/gamelist-metadata");
          updated += result.updated || 0;
          errors.push(...(result.errors || []));
          bar.style.width = Math.round(Math.min(ids.length, index + batchGames.length) / ids.length * 100) + "%";
          line("Batch " + (Math.floor(index / size) + 1) + ": processed " + (result.processed || 0) + ", updated " + (result.updated || 0) + ", errors " + ((result.errors || []).length) + ".");
          await sleep(600);
        }
        line("Done. Updated " + updated + " game" + (updated === 1 ? "" : "s") + ".");
        if (errors.length) {
          line("");
          line("Errors:");
          errors.forEach((item) => line("- " + item.title + ": " + item.error));
        }
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
