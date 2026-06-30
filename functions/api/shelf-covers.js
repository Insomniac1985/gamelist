import { isEditorRequest } from "./editor-auth.js";
import { igdbCredentials, igdbLookup } from "./search.js";

const KV_KEY = "shelf-data";
const DEFAULT_LIMIT = 8;
const MAX_LIMIT = 20;

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  if (!env.GAMELIST) return json({ error: "Missing GAMELIST KV binding" }, 501);
  if (!env.EDIT_PASSWORD) return json({ error: "Missing EDIT_PASSWORD secret" }, 503);
  if (!await isEditorRequest(request, env)) return wantsJson(url) ? json({ error: "Unauthorized" }, 401) : html(authHtml(), 401);

  const igdb = igdbCredentials(env);
  if (!igdb) return wantsJson(url) ? json({ error: "Missing IGDB credentials" }, 503) : html(errorHtml("Missing IGDB_CLIENT_ID or IGDB_CLIENT_SECRET."), 503);

  if (!wantsJson(url) && !url.searchParams.has("cursor")) return html(runnerHtml(url.searchParams.get("apply") === "1", url.searchParams.get("run") === "1"));

  const apply = url.searchParams.get("apply") === "1";
  const force = url.searchParams.get("force") === "1";
  const cursor = Math.max(0, Number.parseInt(url.searchParams.get("cursor") || "0", 10) || 0);
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number.parseInt(url.searchParams.get("limit") || String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT));
  const shelf = await env.GAMELIST.get(KV_KEY, "json") || {};
  const sourceGames = Array.isArray(shelf.sourceGames) ? shelf.sourceGames : [];
  const additions = Array.isArray(shelf.games) ? shelf.games.map((game) => ({ ...game })) : [];
  const overrides = shelf.overrides && typeof shelf.overrides === "object" ? { ...shelf.overrides } : {};
  const allGames = [
    ...sourceGames.map((game) => ({ ...game, ...(overrides[game.id] || {}), sourceRecord: true })),
    ...additions.map((game) => ({ ...game, sourceRecord: false })),
  ].filter((game) => game.id && game.title && !game.deletedAt);

  const batch = allGames.slice(cursor, cursor + limit);
  const results = [];
  let updated = 0;

  for (const game of batch) {
    const lookup = game.igdbUrl || [game.title, game.platform].filter(Boolean).join(" ");
    const found = await igdbLookup(lookup, igdb).catch(() => []);
    const match = found.find((item) => /^https:\/\/images\.igdb\.com\/igdb\/image\/upload\//i.test(item.cover || ""));
    const cover = match?.cover || "";
    const changed = Boolean(cover && (force || cover !== game.cover));

    if (changed) {
      const patch = {
        cover,
        igdbUrl: match.igdbUrl || game.igdbUrl || "",
        updatedAt: new Date().toISOString(),
      };
      if (game.sourceRecord) {
        overrides[game.id] = { ...(overrides[game.id] || {}), ...patch };
      } else {
        const target = additions.find((item) => item.id === game.id);
        if (target) Object.assign(target, patch);
      }
      updated += 1;
    }

    results.push({
      id: game.id,
      title: game.title,
      platform: game.platform || "",
      previousCover: game.cover || "",
      cover,
      igdbUrl: match?.igdbUrl || "",
      updated: changed,
      reason: cover ? (changed ? "updated" : "same cover") : "no IGDB cover found",
    });
  }

  if (apply && updated) {
    const data = {
      sourceGames,
      games: additions.slice(0, 1000),
      overrides,
      layout: validLayout(shelf.layout) ? shelf.layout : null,
      favoriteGameIds: validFavoriteGameIds(shelf.favoriteGameIds) ? shelf.favoriteGameIds.slice(0, 5) : [],
      updatedAt: new Date().toISOString(),
    };
    await env.GAMELIST.put(KV_KEY, JSON.stringify(data));
  }

  const nextCursor = cursor + batch.length;
  return json({
    ok: true,
    apply,
    force,
    cursor,
    limit,
    processed: batch.length,
    updated,
    total: allGames.length,
    nextCursor: nextCursor < allGames.length ? nextCursor : null,
    done: nextCursor >= allGames.length,
    results,
  });
}

function runnerHtml(apply, autorun) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Shelf IGDB Cover Refresh</title>
  <style>
    body{margin:0;padding:24px;font:14px/1.45 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;color:#f6f7fb;background:#111318}
    main{max-width:980px;margin:auto;display:grid;gap:16px}
    button,a{border:1px solid #3d4655;border-radius:8px;background:#1e2530;color:#f6f7fb;padding:10px 12px;text-decoration:none;cursor:pointer}
    button.primary{border-color:#ff3b62;background:#ff0039}
    pre{white-space:pre-wrap;background:#171b22;border:1px solid #303846;border-radius:8px;padding:14px;min-height:240px}
    .bar{height:10px;background:#202733;border-radius:999px;overflow:hidden}.bar span{display:block;height:100%;width:0;background:#ff0039}
  </style>
</head>
<body>
  <main>
    <h1>Shelf IGDB Cover Refresh</h1>
    <p>${apply ? "Apply mode is on. Covers will be saved after each batch." : "Dry run mode is on. Add <code>?apply=1</code> to the URL to save changes."}</p>
    <div>
      <button class="primary" id="start">Start</button>
      <a href="/shelf">Back to Shelf</a>
    </div>
    <div class="bar"><span id="bar"></span></div>
    <pre id="log"></pre>
  </main>
  <script>
    const apply = ${apply ? "true" : "false"};
    const log = document.querySelector("#log");
    const bar = document.querySelector("#bar");
    const start = document.querySelector("#start");
    let running = false;
    const line = (text) => { log.textContent += text + "\\n"; log.scrollTop = log.scrollHeight; };
    start.addEventListener("click", async () => {
      if (running) return;
      running = true;
      start.disabled = true;
      let cursor = 0;
      let total = 0;
      let updated = 0;
      line("Starting IGDB cover refresh...");
      while (cursor !== null) {
        const url = new URL("/api/shelf-covers", location.origin);
        url.searchParams.set("format", "json");
        url.searchParams.set("cursor", String(cursor));
        url.searchParams.set("limit", "8");
        if (apply) url.searchParams.set("apply", "1");
        const response = await fetch(url, { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || response.statusText);
        total = data.total;
        updated += data.updated;
        data.results.forEach((item) => line((item.updated ? "UPDATED " : "checked ") + item.title + " - " + item.reason));
        cursor = data.nextCursor;
        bar.style.width = total ? Math.round(((cursor || total) / total) * 100) + "%" : "100%";
      }
      line("Done. " + updated + " cover" + (updated === 1 ? "" : "s") + (apply ? " saved." : " would be updated."));
      start.disabled = false;
      running = false;
    });
    if (${autorun ? "true" : "false"}) start.click();
  </script>
</body>
</html>`;
}

function authHtml() {
  return "<!doctype html><meta charset=\"utf-8\"><title>Unauthorized</title><p>Log into edit mode first, then open this link again.</p><p><a href=\"/shelf\">Go to Shelf</a></p>";
}

function errorHtml(message) {
  return `<!doctype html><meta charset="utf-8"><title>Shelf IGDB Cover Refresh</title><p>${escapeHtml(message)}</p>`;
}

function validLayout(value) {
  return Boolean(value && Array.isArray(value.order) && Array.isArray(value.hidden));
}

function validFavoriteGameIds(value) {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function wantsJson(url) {
  return url.searchParams.get("format") === "json" || url.searchParams.has("cursor");
}

function html(value, status = 200) {
  return new Response(value, { status, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}
