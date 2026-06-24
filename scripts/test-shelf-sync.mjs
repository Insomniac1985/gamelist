import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { onRequestPut as putGamelist } from "../functions/api/sync.js";
import { onRequestPut as putShelf, onRequestDelete as deleteShelf } from "../functions/api/shelf.js";
import { activityAllowsPsnCardTrophies, activityCoverOverride, activityTitleMatchScore } from "../activity-ui.js";

const [appSource, shelfSource, shelfCss, shelfHtml, sharedCss, appHtml] = await Promise.all([
  readFile(new URL("../app.js", import.meta.url), "utf8"),
  readFile(new URL("../shelf.js", import.meta.url), "utf8"),
  readFile(new URL("../shelf.css", import.meta.url), "utf8"),
  readFile(new URL("../shelf.html", import.meta.url), "utf8"),
  readFile(new URL("../styles.css", import.meta.url), "utf8"),
  readFile(new URL("../index.html", import.meta.url), "utf8"),
]);
for (const source of [appSource, shelfSource]) {
  assert.match(source, /from "\.\/activity-ui\.js"/);
  for (const sharedBehavior of ["createGameCardShell", "bindActivityCardParallax", "finishedGameMarkup", "achievementCardMarkup", "achievementDashboardMarkup", "completedCardMarkup", "comparePlayingGames", "finishedDurationText", "activityTrailerUrl", "activityReleaseStatus"]) {
    assert.match(source, new RegExp(`\\b${sharedBehavior}\\b`), `${sharedBehavior} must remain shared between Gamelist and Shelf`);
  }
}
assert.match(shelfSource, /function gameCard\(game, options = \{\}\)[\s\S]*?querySelector\("\.card-trophies"\)\.remove\(\)/, "physical Shelf cards must not render outside trophy strips");
assert.match(shelfSource, /function gamelistProjectionCard\(game\)[\s\S]*?shelfCardTrophies\(game\)/, "Currently Playing cards must retain outside trophy strips");
assert.equal(activityCoverOverride("Mandagon"), "https://cdn2.steamgriddb.com/grid/a0ac3f221e625a1f87857b7d19c4c7d5.png");
assert.equal(activityCoverOverride("MANDAGON (Steam)"), "https://cdn2.steamgriddb.com/grid/a0ac3f221e625a1f87857b7d19c4c7d5.png");
assert.equal(activityTitleMatchScore("Mandagon", "MANDAGON Trophies") >= 75, true);
assert.equal(activityTitleMatchScore("Baldur's Gate III", "Baldur's Gate 3 Trophies") >= 75, true, "shared activity matching must normalize Roman numeral titles like Main");
for (const platform of ["PS1", "PS One", "PSX", "PlayStation 1", "Sony PlayStation", "PS2", "Sony PlayStation 2"]) assert.equal(activityAllowsPsnCardTrophies(platform), false, `${platform} must never show PSN trophies on cards`);
for (const platform of ["PS3", "PS4", "PS5", "Steam", "Xbox Series"]) assert.equal(activityAllowsPsnCardTrophies(platform), true, `${platform} must retain supported card achievements`);
for (const source of [appSource, shelfSource]) assert.match(source, /function (?:cardTrophiesFor|shelfCardTrophies)\(game\) \{\s*if \(!activityAllowsPsnCardTrophies\(game\.platform\)\) return "";/, "Main and Shelf must apply the shared PS1/PS2 trophy guard before matching");
assert.doesNotMatch(shelfCss, /^\.detail-cover\s*\{/m, "Shelf CSS must not override the shared activity detail cover");
assert.doesNotMatch(shelfCss, /^\.detail-trophies h3/m, "Shelf CSS must not override the shared activity trophy typography");
assert.match(shelfHtml, /<dialog id="detailDialog">\s*<article class="detail-modal glass">/, "Shelf details must use Main's detail component classes");
assert.doesNotMatch(shelfHtml, /gamelistDetailDialog/, "Shelf must not create a second activity detail component");
assert.match(shelfSource, /detailStorePrices\.hidden = true/, "Projected activity details must keep prices disabled");
assert.match(appSource, /function platinumCard\(item\)[\s\S]*?activityCoverOverride\(item\)/, "Main completed cards must apply shared cover overrides at render time");
assert.doesNotMatch(shelfSource, /card\.querySelector\("\.edit-action"\)\.remove\(\)/, "Shelf playing cards must retain Main's edit action");
assert.match(shelfSource, /el\.addButton\.hidden = false/, "Shelf must keep Add Game visible while logged out");
assert.match(shelfSource, /function openEditor\(game = null\) \{\s*if \(!state\.canEdit\) return openAuth\(\)/, "Shelf Add Game must request login while logged out");
assert.doesNotMatch(shelfSource, /toggle\.classList\.add\("edit-action-slot"\)/, "Shelf must keep Main's playing-card pause position");
assert.doesNotMatch(shelfSource, /querySelector\("\.edit-action"\)\.classList\.add\("trailer-secondary-action"\)/, "Shelf must keep Main's playing-card edit position");
assert.match(shelfSource, /dateText: \[formatLongDate\(game\.completedAt\), finishedDurationText\(game\.startedAt, game\.completedAt\)\]/, "Shelf finished carousel must use Main's date and duration format");
assert.doesNotMatch(shelfCss, /\.playing-finished/, "Shelf must use Main's finished-carousel CSS without local overrides");
assert.doesNotMatch(shelfCss, /achievement-(?:section|panel|summary|kpi|card)|rarity-graph|trophy-subtitle/, "Shelf must use Main's achievement component CSS without local overrides");
assert.match(shelfHtml, /<dialog id="shelfCompletedDialog" class="platinum-dialog">\s*<article class="platinum-modal glass">/, "Shelf completed popup must use Main's dialog component classes");
assert.match(shelfHtml, /class="platinum-title" id="shelfCompletedTitle"/, "Shelf completed popup must use Main's title component class");
assert.doesNotMatch(shelfHtml, /id="shelfCompletedDialog" class="shelf-dialog"/, "Shelf completed popup must not use Shelf dialog CSS");
for (const source of [appSource, shelfSource]) assert.match(source, /syncViewModeButton/, "Main and Shelf completed popups must share the same view toggle behavior");
assert.doesNotMatch(shelfHtml, /shelfAchievementProfileLink/, "Shelf must not show the activity profile link");
assert.doesNotMatch(appSource, /achievementProfileLink/, "Main must not render the activity profile link");
assert.match(sharedCss, /\.trophy-subtitle\s*\{[\s\S]*?font-size:\s*11px;/, "Latest Achievements must use the smaller shared label size");
assert.match(sharedCss, /\.platinum-title\s*\{[\s\S]*?font-family:\s*inherit;/, "Completed popup titles must use the normal UI font");
assert.match(appSource, /card-trophy trophy-steam/, "Main Steam card achievements must use the neutral Steam tone");
assert.match(shelfSource, /tone \|\| trophyTone/, "Shelf Steam card achievements must use the neutral Steam tone");
assert.match(shelfHtml, /<dialog id="layoutDialog" class="settings-dialog">\s*<form class="settings-modal glass"/, "Shelf settings must use Main's centered settings overlay and modal classes");
assert.doesNotMatch(shelfHtml, /id="layoutDialog" class="shelf-dialog"/, "Shelf settings must not use the taller, heavier Shelf overlay");
assert.match(shelfSource, /const FIXED_LAYOUT = \["playing", "latestFinished"\]/, "Shelf settings must separate Currently Playing and Last Finished like Main");
assert.match(appSource, /playingSection\.hidden = el\.playingCurrent\.hidden && el\.playingFinished\.hidden/, "Main must keep Last Finished visible when Currently Playing is hidden");
assert.match(shelfSource, /closest\("\[data-module='playing'\]"\)\.hidden = el\.playingCurrent\.hidden && el\.playingFinished\.hidden/, "Shelf must keep Last Finished visible when Currently Playing is hidden");
assert.doesNotMatch(shelfHtml, /<option value="custom">Custom<\/option>/, "Shelf must not offer the Custom order filter");
const shelfLibraryOrder = shelfHtml.match(/<select id="sortFilter">([\s\S]*?)<\/select>/)?.[1] || "";
assert.doesNotMatch(shelfLibraryOrder, /value="time"/, "Shelf must not offer Time as a library order filter");
for (const [value, label] of [["added", "Last added"], ["title", "Name"], ["platform", "Platform"], ["region", "Region"], ["value", "Value"]]) assert.match(shelfSource, new RegExp(`value: "${value}", label: "${label}"`), `Shelf settings must offer ${label} as a default order`);
assert.match(shelfSource, /shelfDefaultOrder: el\.settingsDefaultOrder\.value/, "Shelf must persist its default independently from Main's order preference");
for (const html of [appHtml, shelfHtml]) assert.doesNotMatch(html, /<nav class="nav-tabs"/, "Main and Shelf must not show the temporary cross-site navbar");
assert.match(shelfSource, /state\.viewMode === "list"[\s\S]*?games\.map\(gameRow\)/, "Shelf list mode must render Main-style compact rows");
assert.match(shelfSource, /syncViewModeButton\(el\.view, state\.viewMode/, "Shelf view control must show the current mode");
assert.match(shelfCss, /\.shelf-page \.stats \{ display:grid; grid-template-columns:1fr;/, "Shelf mobile KPIs must use naturally sized vertical rows");
assert.match(shelfCss, /\.shelf-toolbar \{ position:static; grid-template-columns:minmax\(0,1fr\) var\(--toolbar-control-height\)/, "Shelf mobile order row must reserve square action controls like Main");
assert.match(shelfCss, /\.shelf-grid\.list-view \.region-flag,[\s\S]*?\.condition-pill[\s\S]*?height:\s*24px;/, "Shelf list flags and condition pills must match the platform pill's rendered height");
assert.match(shelfSource, /function updateShelfRowTitleOverflow\(\)[\s\S]*?scrollWidth > title\.clientWidth/, "Shelf list titles must expose their full text on hover when truncated");
assert.match(shelfSource, /shelf-row-description/, "Shelf list rows must include a compact description excerpt");
assert.doesNotMatch(shelfCss, /cover-showcase|\.shelf-grid \.game-card\.has-art::before/, "Shelf grid cards must not override Main's cover or parallax effects");
assert.match(shelfSource, /fragment\.appendChild\(gameCard\(game, \{ imagePriority: index < 6 \? "eager" : "lazy" \}\)\)/, "Shelf grid must insert live cards with Main's image-priority lifecycle");
assert.match(shelfSource, /function gameCard\(game, options = \{\}\)[\s\S]*?bindActivityCardParallax\(card\)[\s\S]*?return card;/, "Shelf grid must bind Main's parallax before inserting the live card");
assert.doesNotMatch(shelfSource, /async function loadShelfCardTrophies\(game, remote\)[\s\S]*?renderLibrary\(\)/, "Async trophy loading must not rebuild the Shelf library or disturb scrolling");
assert.match(shelfSource, /async function loadTrophyActivity\(\)[\s\S]*?updateAllShelfTrophyStrips\(\)/, "Achievement refreshes must patch playing trophy strips in place");
for (const source of [appSource, shelfSource]) assert.match(source, /settings-preference-row/, "Main and Shelf must keep Theme and Default order together in the shared preference row");
assert.match(shelfSource, /function updateShelfCardTrophyStrips\(gameId\)[\s\S]*?\.game-card\[data-gamelist-id=[\s\S]*?shelfCardTrophies\(game\)/, "Shelf must update the visible playing-card trophy strip when its async data arrives");
assert.match(shelfSource, /async function loadShelfCardTrophies\(game, remote\)[\s\S]*?updateShelfCardTrophyStrips\(game\.id\)/, "Shelf PSN trophy loading must refresh the outside playing card directly");

class MemoryKv {
  values = new Map();
  async get(key, type) { const value = this.values.get(key); return type === "json" && value ? JSON.parse(value) : value || null; }
  async put(key, value) { this.values.set(key, value); }
}

const kv = new MemoryKv();
const env = { GAMELIST: kv, EDIT_PASSWORD: "test" };
const request = (url, body) => new Request(url, { method: "PUT", headers: { "Content-Type": "application/json", "x-edit-password": "test" }, body: JSON.stringify(body) });

await putGamelist({ request: request("https://example.test/api/sync", { games: [{ id: "g1", title: "Physical", platform: "PS5", section: "backlog", digital: false, owners: ["Judy"] }], settings: {} }), env });
let shelf = await kv.get("shelf-data", "json");
assert.equal(shelf.games.length, 1);
assert.deepEqual(shelf.games[0].owners, ["Judy"]);
assert.deepEqual(shelf.games[0].tags, ["Gamelist"]);

const layout = { order: ["playing", "trophies", "kpis", "filters", "library"], hidden: ["trophies"] };
await putShelf({ request: request("https://example.test/api/shelf", { games: [...shelf.games, { id: "s2", title: "Shelf Add", platform: "Nintendo Switch", country: "Spain", owners: ["Jordi"], genre: "RPG" }], overrides: {}, layout }), env });
let list = await kv.get("gamelist-data", "json");
assert.equal(list.games.some((game) => game.shelfId === "s2" && game.section === "backlog"), true);
assert.deepEqual(list.games.find((game) => game.shelfId === "s2").owners, ["Jordi"]);

const gameCount = list.games.length;
await putGamelist({ request: request("https://example.test/api/sync", { settingsOnly: true, settings: { stores: ["Amazon", "eBay"], region: "ES", currency: "EUR" } }), env });
list = await kv.get("gamelist-data", "json");
assert.equal(list.games.length, gameCount);
assert.deepEqual(list.settings.stores, ["Amazon", "eBay"]);

let denied = await deleteShelf({ request: new Request("https://example.test/api/shelf", { method: "DELETE", headers: { "x-edit-password": "wrong" } }), env });
assert.equal(denied.status, 401);
await deleteShelf({ request: new Request("https://example.test/api/shelf", { method: "DELETE", headers: { "x-edit-password": "test" } }), env });
shelf = await kv.get("shelf-data", "json");
assert.deepEqual(shelf, { sourceGames: [], games: [], overrides: {}, layout, updatedAt: shelf.updatedAt });
list = await kv.get("gamelist-data", "json");
assert.equal(list.games.some((game) => game.shelfId === "s2"), true);

console.log("Shelf/Gamelist synchronization checks passed.");
