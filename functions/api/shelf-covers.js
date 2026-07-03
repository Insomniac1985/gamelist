import { isEditorRequest } from "./editor-auth.js";
import { igdbCredentials, igdbLookup } from "./search.js";
import { runnerStyle } from "./runner-style.js";

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
    const found = await findIgdbCoverMatch(game, igdb);
    const match = found.match;
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
      lookup: found.lookup || "",
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

async function findIgdbCoverMatch(game, igdb) {
  for (const lookup of coverLookupQueries(game)) {
    const found = await igdbLookup(lookup, igdb).catch(() => []);
    const match = found.find((item) => /^https:\/\/images\.igdb\.com\/igdb\/image\/upload\//i.test(item.cover || ""));
    if (match) return { match, lookup };
  }
  return { match: null, lookup: "" };
}

function coverLookupQueries(game) {
  const title = String(game.title || "").trim();
  const queries = [];
  if (game.igdbUrl) queries.push(game.igdbUrl);
  queries.push(title);
  queries.push(stripShelfEdition(title));
  queries.push(stripShelfEdition(title.replace(/[:\-]\s*(deluxe|collector'?s?|limited|launch|special|fan|reserve|steelbook|big box|pokewalker)\b.*$/i, "")));
  return [...new Set(queries.map((item) => item.replace(/\s+/g, " ").trim()).filter(Boolean))];
}

function stripShelfEdition(title) {
  return String(title || "")
    .replace(/\s*[\[(][^\])]*(edition|version|collection|set|pack|disc|steelbook|big box|pokewalker|limited run|smile price)[^\])]*[\])]/gi, "")
    .replace(/\s*[\[(][^\])]*[\])]\s*$/g, "")
    .replace(/\b(deluxe|collector'?s?|limited|launch|special|fan|reserve|steelbook)\s+edition\b/gi, "")
    .replace(/\b(definitive|complete|gold|ultimate)\s+edition\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function runnerHtml(apply, autorun) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Shelf IGDB Cover Refresh</title>
  ${runnerStyle()}
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
    <div class="lists">
      <section>
        <h2>Found / updated</h2>
        <pre id="foundLog"></pre>
      </section>
      <section>
        <h2>Still missing</h2>
        <pre id="missingLog"></pre>
      </section>
    </div>
  </main>
  <script>
    const apply = ${apply ? "true" : "false"};
    const foundLog = document.querySelector("#foundLog");
    const missingLog = document.querySelector("#missingLog");
    const bar = document.querySelector("#bar");
    const start = document.querySelector("#start");
    let running = false;
    const line = (target, text) => { target.textContent += text + "\\n"; target.scrollTop = target.scrollHeight; };
    start.addEventListener("click", async () => {
      if (running) return;
      running = true;
      start.disabled = true;
      let cursor = 0;
      let total = 0;
      let updated = 0;
      const missing = [];
      foundLog.textContent = "";
      missingLog.textContent = "";
      line(foundLog, "Starting IGDB cover refresh...");
      console.log("Starting IGDB cover refresh...");
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
        data.results.forEach((item) => {
          const text = (item.updated ? "UPDATED " : "checked ") + item.title + " - " + item.reason;
          if (item.cover) line(foundLog, text);
          else {
            missing.push(item);
            line(missingLog, text);
            console.warn("Missing IGDB cover:", item.title, item.platform || "");
          }
        });
        cursor = data.nextCursor;
        bar.style.width = total ? Math.round(((cursor || total) / total) * 100) + "%" : "100%";
      }
      line(foundLog, "Done. " + updated + " cover" + (updated === 1 ? "" : "s") + (apply ? " saved." : " would be updated."));
      if (missing.length) {
        console.group("Shelf games still missing IGDB covers (" + missing.length + ")");
        missing.forEach((item) => console.log(item.title + (item.platform ? " [" + item.platform + "]" : "")));
        console.groupEnd();
      } else {
        console.log("No missing IGDB covers.");
      }
      start.disabled = false;
      running = false;
    });
    if (${autorun ? "true" : "false"}) start.click();
  </script>
</body>
</html>`;
}

function authHtml() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Unauthorized</title>
  ${runnerStyle()}
</head>
<body>
  <main>
    <h1>Unauthorized</h1>
    <p>Log into edit mode first, then open this link again.</p>
    <div class="actions"><a href="/shelf">Go to Shelf</a></div>
  </main>
</body>
</html>`;
}

function errorHtml(message) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Shelf IGDB Cover Refresh</title>
  ${runnerStyle()}
</head>
<body>
  <main>
    <h1>Shelf IGDB Cover Refresh</h1>
    <p>${escapeHtml(message)}</p>
    <div class="actions"><a href="/shelf">Back to Shelf</a></div>
  </main>
</body>
</html>`;
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
