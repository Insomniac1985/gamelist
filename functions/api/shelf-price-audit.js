import { runnerStyle } from "./runner-style.js";

const KV_KEY = "shelf-data";

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  if (!env.GAMELIST) return json({ error: "Missing GAMELIST KV binding" }, 501);
  const shelf = await env.GAMELIST.get(KV_KEY, "json") || {};
  const games = mergedShelfGames(shelf);
  const rows = games.map(priceAuditRow).filter((row) => row.isDollar || row.isZero);
  const dollars = rows.filter((row) => row.isDollar);
  const zeros = rows.filter((row) => row.isZero);
  if (url.searchParams.get("format") === "json") return json({ ok: true, total: rows.length, dollars, zeros });
  return html(auditHtml({ dollars, zeros }));
}

function mergedShelfGames(shelf) {
  const sourceGames = Array.isArray(shelf.sourceGames) ? shelf.sourceGames : [];
  const additions = Array.isArray(shelf.games) ? shelf.games : [];
  const overrides = shelf.overrides && typeof shelf.overrides === "object" ? shelf.overrides : {};
  return [
    ...sourceGames.map((game) => ({ ...game, ...(overrides[game.id] || {}) })),
    ...additions,
  ].filter((game) => game.id && game.title && !game.deletedAt)
    .sort((a, b) => String(a.platform || "").localeCompare(String(b.platform || "")) || String(a.title || "").localeCompare(String(b.title || "")));
}

function priceAuditRow(game) {
  const key = collectionPriceKey(game);
  const rawValue = game.collectionPrices?.[key] ?? game.price;
  const value = numberOrNull(rawValue);
  const currency = String(game.priceCurrency || "").toUpperCase();
  const hasSavedValue = value != null;
  const isMissingCurrency = !currency && hasSavedValue;
  return {
    id: game.id,
    title: game.title || "",
    platform: shortPlatform(game.platform || ""),
    condition: conditionLabel(game),
    priceKey: key,
    value,
    currency: currency || "",
    isDollar: currency === "USD" || isMissingCurrency,
    isMissingCurrency,
    isZero: value === 0,
    reason: [
      currency === "USD" ? "USD" : "",
      isMissingCurrency ? "missing currency" : "",
      value === 0 ? "0.00 displayed value" : "",
    ].filter(Boolean).join(", "),
  };
}

function collectionPriceKey(game) {
  const condition = conditionLabel(game);
  if (condition === "Sealed") return "sealed";
  if (condition.startsWith("Complete")) return "complete";
  return "loose";
}

function conditionLabel(game) {
  if (conditionValue(game, "sealed")) return "Sealed";
  if (conditionValue(game, "game") && conditionValue(game, "box")) return conditionValue(game, "manual") || conditionValue(game, "other") ? "Complete +" : "Complete";
  return "Loose";
}

function conditionValue(game, key) {
  if (typeof game?.[key] === "boolean") return game[key];
  const old = String(game?.ownership || "").toLowerCase();
  if (key === "game") return true;
  if (key === "box") return /cib|boxed|new/.test(old);
  if (key === "manual") return /cib/.test(old);
  if (key === "other") return /\+/.test(old);
  if (key === "sealed") return /new|sealed/.test(old);
  return false;
}

function shortPlatform(value) {
  const platform = String(value || "");
  if (/switch 2/i.test(platform)) return "Switch 2";
  if (/nintendo switch/i.test(platform)) return "Switch";
  if (/playstation 5|ps5/i.test(platform)) return "PS5";
  if (/playstation 4|ps4/i.test(platform)) return "PS4";
  if (/playstation 3|ps3/i.test(platform)) return "PS3";
  if (/playstation 2|ps2/i.test(platform)) return "PS2";
  if (/playstation\b|ps1|psx/i.test(platform)) return "PS1";
  if (/nintendo 3ds/i.test(platform)) return "3DS";
  if (/nintendo ds/i.test(platform)) return "DS";
  if (/windows|pc/i.test(platform)) return "PC";
  return platform;
}

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function auditHtml({ dollars, zeros }) {
  const payload = JSON.stringify({ dollars, zeros }).replace(/</g, "\\u003c");
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Shelf Price Audit</title>
  ${runnerStyle({ maxWidth: "1100px" })}
</head>
<body>
  <main>
    <h1>Shelf Price Audit</h1>
    <p>Games listed here either display in USD, have no saved currency so they can appear as dollars, or have their displayed collection value at 0.00.</p>
    <div class="actions"><a href="/shelf">Back to Shelf</a><a href="/api/shelf-price-audit?format=json">JSON</a><button id="copy" type="button">Copy Console List</button></div>
    <div class="lists">
      ${auditSection("Dollars / missing currency", dollars)}
      ${auditSection("Displayed as 0.00", zeros)}
    </div>
  </main>
  <script>
    const audit = ${payload};
    function label(item) {
      const value = item.value == null ? "no value" : Number(item.value).toFixed(2);
      return item.title + (item.platform ? " [" + item.platform + "]" : "") + " - " + value + " " + (item.currency || "(missing currency)") + " - " + item.reason;
    }
    console.group("Shelf games in dollars or missing currency (" + audit.dollars.length + ")");
    audit.dollars.forEach((item) => console.log(label(item)));
    console.groupEnd();
    console.group("Shelf games displayed as 0.00 (" + audit.zeros.length + ")");
    audit.zeros.forEach((item) => console.log(label(item)));
    console.groupEnd();
    document.querySelector("#copy").addEventListener("click", async () => {
      const text = [
        "Dollars / missing currency",
        ...audit.dollars.map(label),
        "",
        "Displayed as 0.00",
        ...audit.zeros.map(label),
      ].join("\\n");
      await navigator.clipboard.writeText(text);
    });
  </script>
</body>
</html>`;
}

function auditSection(title, rows) {
  return `<section><h2>${escapeHtml(title)} (${rows.length})</h2>${rows.length ? `<ol>${rows.map((row) => `<li>${escapeHtml(row.title)}${row.platform ? ` <small>[${escapeHtml(row.platform)}]</small>` : ""}<br><small>${escapeHtml(row.value == null ? "no value" : row.value.toFixed(2))} ${escapeHtml(row.currency || "(missing currency)")} - ${escapeHtml(row.reason)}</small></li>`).join("")}</ol>` : "<p>None.</p>"}</section>`;
}

function html(value, status = 200) {
  return new Response(value, { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}
