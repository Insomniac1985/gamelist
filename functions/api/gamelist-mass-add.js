import { isEditorRequest } from "./editor-auth.js";

const KV_KEY = "gamelist-data";

export async function onRequestGet() {
  return html(runnerHtml());
}

export async function onRequestPost({ request, env }) {
  if (!env.GAMELIST) return json({ error: "Missing GAMELIST KV binding" }, 501);
  if (!env.EDIT_PASSWORD) return json({ error: "Missing EDIT_PASSWORD secret" }, 503);
  if (!await isEditorRequest(request, env)) return json({ error: "Unauthorized" }, 401);

  const body = await request.json().catch(() => null);
  const ids = new Set((Array.isArray(body?.ids) ? body.ids : []).map((id) => String(id || "").trim()).filter(Boolean));
  if (!ids.size) return json({ error: "Expected { ids: [] }" }, 400);

  const data = await env.GAMELIST.get(KV_KEY, "json") || { games: [], settings: {} };
  const now = new Date().toISOString();
  let accepted = 0;
  const games = (Array.isArray(data.games) ? data.games : []).map((game) => {
    if (!ids.has(game?.id) || game.section !== "new") return game;
    accepted += 1;
    return {
      ...game,
      section: "backlog",
      acceptedFromShelfAt: game.acceptedFromShelfAt || now,
      updatedAt: now,
    };
  });

  await env.GAMELIST.put(KV_KEY, JSON.stringify({
    games: normalizeOrders(games),
    settings: data.settings || {},
    updatedAt: now,
  }));
  return json({ ok: true, accepted, total: games.length, updatedAt: now });
}

function normalizeOrders(games) {
  const next = games.slice();
  ["new", "backlog", "upcoming", "wanted"].forEach((section) => {
    next
      .filter((game) => !game.deletedAt && !game.completedAt && !game.playing && game.section === section)
      .sort((a, b) => Number(a.order ?? 999999) - Number(b.order ?? 999999) || String(a.title || "").localeCompare(String(b.title || "")))
      .forEach((game, order) => {
        game.order = order;
      });
  });
  return next;
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
  <title>Gamelist Mass Add</title>
  <style>
    body{margin:0;padding:24px;font:14px/1.45 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;color:#f6f7fb;background:#111318}
    main{max-width:900px;margin:auto;display:grid;gap:16px}
    button,a,input,select{border:1px solid #3d4655;border-radius:8px;background:#1e2530;color:#f6f7fb;padding:10px 12px;text-decoration:none}
    button{cursor:pointer}button.primary{border-color:#ff3b62;background:#ff0039}button:disabled{opacity:.55;cursor:wait}
    .row{display:flex;gap:10px;flex-wrap:wrap;align-items:center}.bar{height:10px;background:#202733;border-radius:999px;overflow:hidden}.bar span{display:block;height:100%;width:0;background:#ff0039}
    pre{white-space:pre-wrap;background:#171b22;border:1px solid #303846;border-radius:8px;padding:14px;min-height:260px;max-height:58vh;overflow:auto}
    label{display:grid;gap:6px;max-width:180px}
  </style>
</head>
<body>
  <main>
    <h1>Gamelist Mass Add</h1>
    <p>This finishes setup for Gamelist New additions by moving them into Backlog in small batches.</p>
    <div class="row">
      <label>Batch size <input id="limit" type="number" min="1" max="50" value="10"></label>
      <label>Platform <select id="platform"><option value="all">All platforms</option></select></label>
      <button class="primary" id="start" type="button">Finish setup</button>
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
      const platforms = [...new Map((data.games || [])
        .filter((game) => game.section === "new")
        .map((game) => [platformKey(game.platform), platformLabel(game.platform)])
        .filter(([key]) => key)).entries()]
        .sort((a, b) => a[1].localeCompare(b[1]));
      platform.innerHTML = '<option value="all">All platforms</option>' + platforms.map(([key, label]) => '<option value="' + key.replace(/"/g, "&quot;") + '">' + label.replace(/</g, "&lt;") + '</option>').join("");
    }
    hydratePlatforms().catch((error) => line("Could not load platforms: " + (error.message || error)));
    start.addEventListener("click", async () => {
      start.disabled = true;
      log.textContent = "";
      try {
        const data = await fetch("/api/sync", { cache: "no-store" }).then((response) => readJson(response, "GET /api/sync"));
        const queue = (data.games || []).filter((game) => game.section === "new" && matchesPlatform(game));
        const ids = queue.map((game) => game.id);
        if (!ids.length) { line("No Gamelist New additions found for the selected platform."); return; }
        const size = Math.max(1, Math.min(50, Number(limit.value) || 10));
        line("Found " + ids.length + " New additions. Running " + size + " at a time...");
        queue.forEach((game, index) => line((index + 1) + ". " + (game.title || game.id) + (game.platform ? " [" + game.platform + "]" : "")));
        line("");
        let accepted = 0;
        for (let index = 0; index < ids.length; index += size) {
          const batchGames = queue.slice(index, index + size);
          const response = await fetch("/api/gamelist-mass-add", {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-edit-password": password() },
            body: JSON.stringify({ ids: batchGames.map((game) => game.id) }),
          });
          const result = await readJson(response, "POST /api/gamelist-mass-add");
          accepted += result.accepted || 0;
          bar.style.width = Math.round(Math.min(ids.length, index + batchGames.length) / ids.length * 100) + "%";
          line("Batch " + (Math.floor(index / size) + 1) + ": moved " + (result.accepted || 0) + " to Backlog.");
          await sleep(350);
        }
        line("Done. Moved " + accepted + " game" + (accepted === 1 ? "" : "s") + ".");
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
