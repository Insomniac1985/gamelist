import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { onRequestPut as putGamelist } from "../functions/api/sync.js";
import { onRequestPut as putShelf, onRequestDelete as deleteShelf } from "../functions/api/shelf.js";
import { activityAllowsPsnCardTrophies, activityCoverOverride, activityTitleMatchScore, normalizeSearchText } from "../activity-ui.js";

const [appSource, shelfSource, shelfCss, shelfHtml, sharedCss, appHtml, collectionPriceSource] = await Promise.all([
  readFile(new URL("../app.js", import.meta.url), "utf8"),
  readFile(new URL("../shelf.js", import.meta.url), "utf8"),
  readFile(new URL("../shelf.css", import.meta.url), "utf8"),
  readFile(new URL("../shelf.html", import.meta.url), "utf8"),
  readFile(new URL("../styles.css", import.meta.url), "utf8"),
  readFile(new URL("../index.html", import.meta.url), "utf8"),
  readFile(new URL("../functions/api/collection-price.js", import.meta.url), "utf8"),
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
assert.match(shelfSource, /detailStorePricePanel\.hidden = true/, "Projected activity details must keep prices disabled");
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
assert.match(shelfHtml, /<html lang="en" class="theme-booting">[\s\S]*?window\.__initialThemeReady/, "Shelf must resolve the saved shared theme before first paint");
assert.match(shelfSource, /await window\.__initialThemeReady\?\.catch/, "Shelf must wait for the initial theme before rendering");
assert.doesNotMatch(shelfSource, /const FIXED_LAYOUT/, "Shelf settings must allow Currently Playing and Last Finished to move");
assert.match(shelfSource, /const DEFAULT_LAYOUT = \["playing", "latestFinished", "trophies", "kpis", "filters", "library"\]/, "Shelf settings must include playing sections in the movable layout");
assert.match(appSource, /playingSection\.hidden = el\.playingCurrent\.hidden && el\.playingFinished\.hidden/, "Main must keep Last Finished visible when Currently Playing is hidden");
assert.match(shelfSource, /finishedModule\.dataset\.module = "latestFinished"/, "Shelf must split Last Finished into its own movable module");
assert.match(shelfSource, /closest\("\[data-module='playing'\]"\)\.hidden = el\.playingCurrent\.hidden/, "Shelf must hide Currently Playing independently");
assert.match(shelfSource, /closest\("\[data-module='latestFinished'\]"\)\.hidden = el\.playingFinished\.hidden/, "Shelf must hide Last Finished independently");
assert.doesNotMatch(shelfHtml, /<option value="custom">Custom<\/option>/, "Shelf must not offer the Custom order filter");
const shelfLibraryOrder = shelfHtml.match(/<select id="sortFilter">([\s\S]*?)<\/select>/)?.[1] || "";
assert.doesNotMatch(shelfLibraryOrder, /value="time"/, "Shelf must not offer Time as a library order filter");
for (const [value, label] of [["added", "Last added"], ["title", "Name"], ["platform", "Platform"], ["region", "Region"], ["value", "Value"]]) assert.match(shelfSource, new RegExp(`value: "${value}", label: "${label}"`), `Shelf settings must offer ${label} as a default order`);
assert.match(shelfSource, /shelfDefaultOrder: el\.settingsDefaultOrder\.value/, "Shelf must persist its default independently from Main's order preference");
for (const source of [appSource, shelfSource]) assert.match(source, /Shelf Sync/, "Main and Shelf settings must expose Shelf Sync");
assert.match(appSource, /shelfSync: settings\.shelfSync !== false/, "Main must normalize Shelf Sync as enabled by default");
assert.match(shelfSource, /shelfSync: document\.querySelector\("#shelfSettingsSync"\)\?\.checked !== false/, "Shelf must persist the shared Shelf Sync setting");
assert.match(shelfSource, /shelfHidePrices: Boolean\(document\.querySelector\("#shelfSettingsHidePrices"\)\?\.checked\)/, "Shelf must persist the Hide prices setting without changing price data");
assert.match(shelfSource, /function shelfPricesVisible\(\)[\s\S]*?shelfHidePrices !== true/, "Shelf price visibility must be a display-only setting");
assert.doesNotMatch(appSource, /stat\("New additions"/, "Main must not show a New additions KPI");
assert.match(appSource, /function mobileSectionCounts\(\)/, "Main mobile tabs must show section counts");
assert.match(appSource, /function canSeeNewAdditions\(\)[\s\S]*?state\.canEdit/, "Main New additions must only appear while logged in");
assert.match(appSource, /function finishSetupGame\(id\)[\s\S]*?openEditor\(id\)/, "Main New additions must use Finish setup to complete missing info");
assert.match(appSource, /if \(game\.section === "new"\)[\s\S]*?completeAction\.addEventListener\("click", \(\) => startPlaying\(game\.id\)\)/, "Main New additions cards must play directly");
assert.match(appSource, /card\.querySelector\("\.meta"\)\.innerHTML = metaFor\(game, \{ includePsn: !game\.playing, includeOwners: true \}\)\.join\(""\)/, "Main cards must show owner tags inside card info");
assert.match(appSource, /const badges = `\$\{completedOwnerBadges\(game\)\}\$\{completedBadges\(game, \{ includePsn: false \}\)\}`[\s\S]*?itemClass: ownerCardClass\(game\)/, "Main Last Finished cards must include mini owner tags and owner color classes");
assert.match(appSource, /class="completed-row[\s\S]*?\$\{ownerCardClass\(game\)\}[\s\S]*?<span class="completed-platform">\$\{completedOwnerBadges\(game\)\}\$\{completedBadges\(game\)\}<\/span>/, "Main Finished list rows must include mini owner tags and owner color classes");
assert.doesNotMatch(shelfSource, /<span class="label">Shelf<\/span><span class="count">/, "Shelf must only show a count on New additions");
assert.match(shelfSource, /<span class="label">New additions<\/span><span class="count">\$\{pendingCount\}<\/span>/, "Shelf New additions tab must show its count");
assert.match(shelfSource, /--tab-index", state\.filters\.tab === "new" \? "1" : "0"/, "Shelf tab slider must move by active tab index");
assert.match(shelfSource, /const pendingCount = state\.canEdit \? state\.games\.filter\(isPendingCollectionGame\)\.length : 0/, "Shelf New additions must only appear while logged in");
assert.match(shelfSource, /isPendingCollectionGame\(game\) \? `<button class="primary-button add-collection-action[\s\S]*?data-action="add-collection"[\s\S]*?data-action="delete"/, "Shelf New additions cards must offer Delete beside Add to Collection");
assert.match(shelfSource, /function visibleShelfCardOwners\(owners = \[\]\)[\s\S]*?state\.gamelistSettings\.defaultOwner[\s\S]*?owners\.filter\(\(owner\) => owner !== defaultOwner\)/, "Shelf library cards must hide the default owner pill");
assert.match(shelfCss, /\.shelf-tabs button\s*\{[\s\S]*?min-height:\s*38px;[\s\S]*?transition:\s*color 180ms ease;[\s\S]*?\}\s*\.shelf-tabs button\.active/, "Shelf tab buttons must stay slim like Main tabs");
assert.doesNotMatch(shelfCss, /\.shelf-tabs button\s*\{[\s\S]*?padding:\s*8px 13px;/, "Shelf tabs must not keep the chunkier local padding");
assert.match(shelfCss, /\.shelf-tabs button:hover\s*\{\s*color:\s*var\(--accent\);[\s\S]*?\.shelf-tabs button\.active:hover\s*\{\s*color:\s*#ffffff;/, "Shelf tabs must use Main's accent hover text effect");
assert.match(shelfSource, /const badges = `\$\{visibleProjectionOwners\(game\)\.map\(ownerBadge\)\.join\(""\)\}[\s\S]*?itemClass: projectionOwnerCardClass\(game\)/, "Shelf Last Finished projection cards must include mini owner tags and owner color classes");
assert.match(shelfCss, /\.shelf-page \.game-card \.title-owners \.owner-pill,[\s\S]*?\.shelf-page \.game-row-core \.owner-pill[\s\S]*?font-size:\s*10px;/, "Shelf owner tags must stay compact");
assert.match(sharedCss, /\.playing-finished-game\.owner-card-judy strong,[\s\S]*?\.completed-row\.owner-card-jordi strong/, "Finished sliders and rows must support owner title colors");
for (const html of [appHtml, shelfHtml]) assert.doesNotMatch(html, /<nav class="nav-tabs"/, "Main and Shelf must not show the temporary cross-site navbar");
assert.match(shelfSource, /state\.viewMode === "list"[\s\S]*?games\.map\(gameRow\)/, "Shelf list mode must render Main-style compact rows");
assert.match(shelfSource, /syncViewModeButton\(el\.view, state\.viewMode/, "Shelf view control must show the current mode");
assert.match(shelfCss, /\.shelf-page \.stats\s*\{[\s\S]*?display:\s*grid;[\s\S]*?grid-template-columns:\s*1fr;/, "Shelf mobile KPIs must use naturally sized vertical rows");
assert.match(shelfCss, /\.shelf-toolbar\s*\{[\s\S]*?position:\s*static;[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)\s+var\(--toolbar-control-height\)/, "Shelf mobile order row must reserve square action controls like Main");
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
assert.match(shelfHtml, /<dialog id="addDialog">\s*<form method="dialog" class="modal add-modal"/, "Shelf physical editor must use Main's dialog and modal shell");
assert.match(shelfHtml, /<p class="eyebrow">Game data<\/p><h2>Add Game<\/h2>/, "Shelf physical editor must use a normal Add Game title beneath the Game data eyebrow");
for (const section of ["Collecting Information", "Physical Edition", "Game Data"]) assert.match(shelfHtml, new RegExp(`<h3>${section}<\\/h3>`), `Shelf physical editor must group ${section} like Main`);
assert.doesNotMatch(shelfHtml, /Added games are saved to this browser/, "Shelf must not show the obsolete browser-only save note");
assert.doesNotMatch(shelfCss, /^\.lookup-result/m, "Shelf lookup must use Main's shared result CSS");
assert.match(shelfSource, /classList\.add\("loaded"\)/, "Shelf lookup results must activate Main's visible result state");
assert.match(shelfSource, /lookupSource: "pricecharting"/, "Shelf lookup must show selectable PriceCharting editions");
assert.match(shelfSource, /physical \? result\.image : result\.cover/, "Shelf lookup must show PriceCharting covers when available");
assert.match(collectionPriceSource, /region-name=all&exclude-variants=false/, "PriceCharting edition search must include PAL, Japan, and other regional variants");
assert.match(collectionPriceSource, /cleanPriceChartingUrl/, "PriceCharting lookup must accept an exact product page URL");
assert.match(collectionPriceSource, /encodeURIComponent\(requestedUpc \|\| title \|\| query\)/, "PriceCharting search must fetch broad title results before ranking regional editions");
assert.match(collectionPriceSource, /rankCandidates\(await fetchPublicCandidates\(searchUrl\), query\)/, "PriceCharting results must rank PAL, Japan, and platform matches locally");
assert.match(collectionPriceSource, /hydrateSearchCandidateImages/, "PriceCharting search results must include cover images");
assert.match(collectionPriceSource, /fetchDirectCandidates\(fallbackUrls, query, searchUrl\)/, "PriceCharting must fall back to exact regional product pages when search returns no rows");
assert.doesNotMatch(shelfSource, /Loading the selected PriceCharting edition|Matching the physical edition/, "Selecting a lookup result must not replace it with fetching text");
assert.match(shelfCss, /\.condition-sealed input\[type="checkbox"\]:checked[\s\S]*?#ffe982[\s\S]*?#c8920a/, "The Sealed checkbox must use the gold condition treatment");
assert.match(shelfCss, /\.condition-sealed input\[type="checkbox"\]:checked[\s\S]*?stroke='%23fff'/, "The gold Sealed checkbox must retain a white checkmark");
assert.equal(normalizeSearchText("Pokémon"), normalizeSearchText("pokemon"), "Shared search must ignore accents");
assert.equal(normalizeSearchText("Afterimage: Deluxe"), normalizeSearchText("Afterimage Deluxe"), "Shared search must ignore punctuation");
for (const source of [appSource, shelfSource]) assert.match(source, /normalizeSearchText/, "Main and Shelf must share accent- and punctuation-insensitive search");

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
assert.deepEqual(shelf.games[0].tags, []);
assert.equal(shelf.games[0].pendingCollection, true);

const layout = { order: ["playing", "trophies", "kpis", "filters", "library"], hidden: ["trophies"] };
await putShelf({ request: request("https://example.test/api/shelf", { games: [...shelf.games, { id: "s2", title: "Shelf Add", platform: "Nintendo Switch", country: "Spain", owners: ["Jordi"], genre: "RPG" }], overrides: {}, layout }), env });
let list = await kv.get("gamelist-data", "json");
assert.equal(list.games.some((game) => game.shelfId === "s2" && game.section === "new"), true);
assert.deepEqual(list.games.find((game) => game.shelfId === "s2").owners, ["Jordi"]);

await putGamelist({ request: request("https://example.test/api/sync", { games: list.games.map((game) => game.shelfId === "s2" ? { ...game, section: "backlog" } : game), settings: {} }), env });
shelf = await kv.get("shelf-data", "json");
assert.equal(shelf.games.some((game) => game.gamelistId === "shelf-s2"), false, "Accepting a Shelf-origin addition into backlog must not sync it back to Shelf");
list = await kv.get("gamelist-data", "json");

await putGamelist({ request: request("https://example.test/api/sync", { games: list.games, settings: { shelfSync: false } }), env });
await putGamelist({ request: request("https://example.test/api/sync", { games: [...list.games, { id: "g2", title: "No Sync", platform: "PS5", section: "backlog", digital: false }], settings: { shelfSync: false } }), env });
shelf = await kv.get("shelf-data", "json");
assert.equal(shelf.games.some((game) => game.gamelistId === "g2"), false);
await putShelf({ request: request("https://example.test/api/shelf", { games: [...shelf.games, { id: "s3", title: "No Back Sync", platform: "Nintendo Switch", country: "Spain" }], overrides: {}, layout }), env });
list = await kv.get("gamelist-data", "json");
assert.equal(list.games.some((game) => game.shelfId === "s3"), false);

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
