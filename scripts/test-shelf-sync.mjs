import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { onRequestPut as putGamelist } from "../functions/api/sync.js";
import { onRequestPut as putShelf, onRequestDelete as deleteShelf } from "../functions/api/shelf.js";
import { activityAllowsPsnCardTrophies, activityCoverOverride, activityTitleMatchScore, normalizeSearchText, releaseGamesByDate } from "../activity-ui.js";

const [appSource, shelfSource, shelfCss, shelfHtml, sharedCss, appHtml, collectionPriceSource, themeSource, swSource] = await Promise.all([
  readFile(new URL("../app.js", import.meta.url), "utf8"),
  readFile(new URL("../shelf.js", import.meta.url), "utf8"),
  readFile(new URL("../shelf.css", import.meta.url), "utf8"),
  readFile(new URL("../shelf.html", import.meta.url), "utf8"),
  readFile(new URL("../styles.css", import.meta.url), "utf8"),
  readFile(new URL("../index.html", import.meta.url), "utf8"),
  readFile(new URL("../functions/api/collection-price.js", import.meta.url), "utf8"),
  readFile(new URL("../theme-system.js", import.meta.url), "utf8"),
  readFile(new URL("../service-worker.js", import.meta.url), "utf8"),
]);
for (const source of [appSource, shelfSource]) {
  assert.match(source, /from "\.\/activity-ui\.js"/);
  for (const sharedBehavior of ["createGameCardShell", "bindActivityCardParallax", "finishedGameMarkup", "achievementCardMarkup", "achievementDashboardMarkup", "completedCardMarkup", "comparePlayingGames", "finishedDurationText", "activityTrailerUrl", "activityReleaseStatus"]) {
    assert.match(source, new RegExp(`\\b${sharedBehavior}\\b`), `${sharedBehavior} must remain shared between Gamelist and Shelf`);
  }
  assert.match(source, /function showToast\(message, tone = "info"\)/, "Main and Shelf must expose the shared toast-style notification helper");
}
for (const source of [appSource, shelfSource]) assert.match(source, /from "\.\/theme-system\.js"/, "Main and Shelf must share the custom theme editor and renderer");
assert.match(themeSource, /function renderThemeDialog[\s\S]*?Main color[\s\S]*?Accent color[\s\S]*?Gradient color[\s\S]*?Extra color[\s\S]*?Title font[\s\S]*?Gradient titles[\s\S]*?Enable background glow[\s\S]*?Theme[\s\S]*?Light \(WIP\)[\s\S]*?Glow 1[\s\S]*?Glow 2[\s\S]*?Gamelist icon[\s\S]*?Shelf icon[\s\S]*?Big logo[\s\S]*?Game app icon[\s\S]*?Custom Background[\s\S]*?Custom Owner Colors/, "Theme editor must expose custom colors, title font, theme mode, glow controls, image uploads, icons, big logo, and owner colors");
assert.match(themeSource, /canvas\.toDataURL\("image\/webp"[\s\S]*?maxSize > 600 \? 0\.76 : 0\.82/, "Theme image uploads must be compressed to webp data URLs");
assert.match(themeSource, /name: theme\.title[\s\S]*?short_name: theme\.shortName[\s\S]*?icons: \[\{ src: absoluteAsset\(theme\.appIcon\)/, "Theme manifest must use the dynamic owner title and app icon");
assert.match(themeSource, /bigLogo: false[\s\S]*?kash:[\s\S]*?bigLogo: true[\s\S]*?theme-big-logo[\s\S]*?form\.elements\.bigLogo/, "Big logo must be a reusable theme setting with Kash enabled by default");
assert.match(sharedCss, /\.column-head h2\s*\{[\s\S]*?background: var\(--accent\);[\s\S]*?html\.theme-gradient \.column-head h2\s*\{[\s\S]*?linear-gradient\([\s\S]*?135deg,[\s\S]*?var\(--title-gradient-start/, "Titles must be flat accent unless Gradient titles is enabled");
assert.match(themeSource, /--title-gradient-start", theme\.gradient \? theme\.gradientColor : theme\.mainColor[\s\S]*?--title-gradient-end", theme\.mainColor/, "Custom title gradients must place the gradient color on the left and the accent color on the right");
assert.match(sharedCss, /body\.theme-big-logo \.brand-mark\s*\{[\s\S]*?width:\s*70px[\s\S]*?height:\s*70px/, "Big logo must reuse the old Kash logo sizing");
assert.match(sharedCss, /\.playing-slider-button:hover\s*\{[\s\S]*?color-mix\(in srgb, var\(--accent\) 58%[\s\S]*?\.ghost-button:not\(\.trophy-action\):hover,[\s\S]*?color-mix\(in srgb, var\(--accent\) 48%[\s\S]*?input:hover,[\s\S]*?color-mix\(in srgb, var\(--accent\) 34%/, "Core hover and focus effects must follow the selected accent color");
assert.match(themeSource, /--default-backdrop-image", theme\.mode === "light" \? "url\(\\"assets\/backdrop_light\.png\\"\)" : "url\(\\"assets\/backdrop\.png\\"\)"[\s\S]*?--custom-backdrop-image"[\s\S]*?var\(--default-backdrop-image\)/, "Light mode must use the light backdrop by default unless a custom image is uploaded");
assert.match(sharedCss, /html\.theme-light\s*\{[\s\S]*?--default-backdrop-image:\s*url\("assets\/backdrop_light\.png"\);[\s\S]*?--grid-texture:/, "Light mode must define a brighter default backdrop and grid texture");
assert.match(sharedCss, /html\.theme-light \.settings-layout-card,[\s\S]*?\.theme-upload-card[\s\S]*?background: rgba\(211, 221, 234, 0\.92\);[\s\S]*?html\.theme-light input,[\s\S]*?\.settings-sync-card \.settings-visible-check[\s\S]*?background-color: rgba\(197, 208, 224, 0\.94\);/, "Light mode settings cards and controls must use stronger contrast");
assert.doesNotMatch(sharedCss, /--jordi:\s|--judy:\s/, "Owner color variables must not be hard-coded as Jordi/Judy globals");
assert.match(themeSource, /owner-color-card-\$\{slug\}/, "Custom owner card classes must use the dynamic owner color namespace");
assert.match(swSource, /"\/theme-system\.js"[\s\S]*?"\/assets\/fonts\/Georgia-Bold\.ttf"[\s\S]*?"\/assets\/fonts\/pokemon-emerald\.ttf"[\s\S]*?"\/assets\/fonts\/04B_30\.TTF"[\s\S]*?"\/assets\/fonts\/Michroma\.ttf"[\s\S]*?"\/assets\/fonts\/Minecraft\.ttf"[\s\S]*?"\/assets\/fonts\/AntiqueOliveNord\.woff2"/, "Service worker must cache the custom theme module and accent fonts");
assert.match(swSource, /"\/assets\/backdrop\.png"[\s\S]*?"\/assets\/backdrop_light\.png"/, "Service worker must cache both dark and light default backdrops");
for (const source of [appSource, shelfSource]) assert.match(source, /value === "ps1" \|\| value === "ps2"[\s\S]*?playstation_retro\.png[\s\S]*?value === "ps5"[\s\S]*?playstation_modern\.png/, "Main and Shelf must use retro PlayStation icons for PS1/PS2 and modern icon for PS5");
assert.match(swSource, /"\/assets\/platforms\/playstation_retro\.png"[\s\S]*?"\/assets\/platforms\/playstation_modern\.png"/, "Service worker must cache the retro and modern PlayStation icons");
assert.match(sharedCss, /\.toast-notification\s*\{[\s\S]*?position:\s*fixed;[\s\S]*?left: max\(16px, env\(safe-area-inset-left\)\);[\s\S]*?bottom: max\(18px, env\(safe-area-inset-bottom\)\);[\s\S]*?background:\s*var\(--accent\);/, "Toast notifications must float bottom-left with accent styling");
assert.doesNotMatch(sharedCss, /\.toast-notification\.is-error\s*\{[\s\S]*?background:\s*var\(--danger\)/, "Toast notifications must keep the accent background for every tone");
assert.match(shelfSource, /function gameCard\(game, options = \{\}\)[\s\S]*?querySelector\("\.card-trophies"\)\.remove\(\)/, "physical Shelf cards must not render outside trophy strips");
assert.match(shelfSource, /function gamelistProjectionCard\(game(?:,\s*options = \{\})?\)[\s\S]*?shelfCardTrophies\(game,\s*\{\s*compactProgress:\s*true\s*\}\)/, "Currently Playing cards must retain compact outside trophy strips");
assert.equal(activityCoverOverride("Mandagon"), "https://cdn2.steamgriddb.com/grid/a0ac3f221e625a1f87857b7d19c4c7d5.png");
assert.equal(activityCoverOverride("MANDAGON (Steam)"), "https://cdn2.steamgriddb.com/grid/a0ac3f221e625a1f87857b7d19c4c7d5.png");
assert.equal(activityTitleMatchScore("Mandagon", "MANDAGON Trophies") >= 75, true);
assert.equal(activityTitleMatchScore("Baldur's Gate III", "Baldur's Gate 3 Trophies") >= 75, true, "shared activity matching must normalize Roman numeral titles like Main");
for (const platform of ["PS1", "PS One", "PSX", "PlayStation 1", "Sony PlayStation", "PS2", "Sony PlayStation 2"]) assert.equal(activityAllowsPsnCardTrophies(platform), false, `${platform} must never show PSN trophies on cards`);
for (const platform of ["PS3", "PS4", "PS5", "Steam", "Xbox Series"]) assert.equal(activityAllowsPsnCardTrophies(platform), true, `${platform} must retain supported card achievements`);
for (const source of [appSource, shelfSource]) assert.match(source, /function (?:cardTrophiesFor|shelfCardTrophies)\(game(?:,\s*options = \{\})?\) \{\s*if \(!activityAllowsPsnCardTrophies\(game\.platform\)\) return "";/, "Main and Shelf must apply the shared PS1/PS2 trophy guard before matching");
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
assert.doesNotMatch(shelfHtml, /id="syncButton"/, "Shelf must not show the manual refresh button");
assert.match(shelfHtml, /id="fetchPricesButton"/, "Shelf must keep the Fetch New Prices button");
assert.match(shelfHtml, /<html lang="en" class="theme-booting">[\s\S]*?window\.__initialThemeReady/, "Shelf must resolve the saved shared theme before first paint");
assert.match(shelfSource, /await window\.__initialThemeReady\?\.catch/, "Shelf must wait for the initial theme before rendering");
assert.doesNotMatch(shelfSource, /const FIXED_LAYOUT/, "Shelf settings must allow Currently Playing and Last Finished to move");
assert.match(shelfSource, /const DEFAULT_LAYOUT = \["playing", "latestFinished", "trophies", "calendar", "kpis", "filters", "library"\]/, "Shelf settings must include playing and calendar sections in the movable layout");
assert.match(appSource, /mountReleaseCalendar\(el\.releaseCalendar/, "Main must render the release calendar through the shared module");
assert.match(shelfSource, /mountReleaseCalendar\(el\.releaseCalendar/, "Shelf must render the release calendar through the shared module");
assert.match(appSource + shelfSource, /mountReleaseCalendar[\s\S]*?releaseCalendarOffset/, "Calendar navigation must keep page-specific offsets while sharing renderer code");
assert.match(shelfSource, /function openReleaseDialog\(date, games = \[\]\)[\s\S]*?gamelistProjectionCard\(game,\s*\{\s*releaseDialog:\s*true\s*\}\)[\s\S]*?openGamelistGameByTitle/, "Shelf release calendar cards must open projected game details");
assert.equal(releaseGamesByDate([{ id: "preorder-1", title: "Preorder Game", platform: "PS5", section: "upcoming", releaseDate: "2026-11-03", preorderStore: "Xtralife" }, { id: "preorder-1", title: "Preorder Game", platform: "PS5", section: "upcoming", releaseDate: "2026-11-03", preorderStore: "Xtralife" }]).get("2026-11-03").length, 1, "Calendar grouping must not duplicate preorder events");
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
assert.match(shelfSource, /shelfHidePrices: document\.querySelector\("#shelfSettingsShowPrices"\)\?\.checked === false/, "Shelf must persist the Show prices setting without changing price data");
assert.match(shelfSource, /function shelfPricesVisible\(\)[\s\S]*?shelfHidePrices !== true/, "Shelf price visibility must be a display-only setting");
assert.match(shelfHtml, /id="playstationUrlInput"[\s\S]*?id="nintendoUrlInput"[\s\S]*?id="steamUrlInput"[\s\S]*?id="xboxUrlInput"[\s\S]*?id="hltbUrlInput"/, "Shelf editor must use fixed website link slots");
assert.match(shelfSource, /kpis: "Highlights", filters: "Search"/, "Shelf settings must use shorter Highlights and Search labels");
assert.doesNotMatch(appSource, /stat\("New additions"/, "Main must not show a New additions KPI");
assert.match(appSource, /function mobileSectionCounts\(\)/, "Main mobile tabs must show section counts");
assert.match(appSource, /el\.board\.style\.setProperty\("--mobile-section-index", String\(index\)\)[\s\S]*?column\.classList\.toggle\("is-mobile-pane", columnIndex >= 0\)/, "Main mobile board must track New additions as a selectable mobile pane");
assert.match(sharedCss, /\.board\s*\{[\s\S]*?display:\s*block;[\s\S]*?overflow:\s*hidden;[\s\S]*?body\[data-mobile-section\][\s\S]*?\.board[\s\S]*?\.column\.is-mobile-pane:not\(\.is-mobile-active\):not\(\[hidden\]\)\s*\{[\s\S]*?display:\s*none !important;[\s\S]*?body\[data-mobile-section\] \.board \.column\.is-mobile-active:not\(\[hidden\]\)\s*\{[\s\S]*?display:\s*block !important;/, "Main mobile board must show only the active pane without translating stale columns into view");
assert.match(appSource, /button\.innerHTML = `<span class="label">\$\{escapeHtml\(label\)\}<\/span>\$\{button\.dataset\.mobileSection === "new" \? `<span class="count">\$\{count\}<\/span>` : ""\}`/, "Main New additions tab must include label and count by default");
assert.match(sharedCss, /@media \(max-width: 760px\)[\s\S]*?\.mobile-section-tabs button\[data-mobile-section="new"\] \.label\s*\{\s*display:\s*none;/, "Main mobile New additions tab must hide the label and keep only the count pill");
assert.match(appSource, /function canSeeNewAdditions\(\)[\s\S]*?state\.canEdit/, "Main New additions must only appear while logged in");
assert.match(appSource, /function finishSetupGame\(id\)[\s\S]*?openEditor\(id\)/, "Main New additions must use Finish setup to complete missing info");
assert.match(appSource, /if \(game\.section === "new"\)[\s\S]*?completeAction\.addEventListener\("click", \(\) => startPlaying\(game\.id\)\)/, "Main New additions cards must play directly");
assert.match(appSource, /row\.classList\.toggle\("new-addition-row", section === "new"\)/, "Main New additions must support list mode row styling");
assert.match(appSource, /function trashIcon\(\)[\s\S]*?class="trash-icon"/, "Main must provide a local delete icon helper");
assert.match(appSource, /row-delete-action[\s\S]*?trashIcon\(\)/, "Main New additions list rows must render the delete icon");
assert.match(sharedCss, /@media \(max-width: 760px\)[\s\S]*?\.game-row\.new-addition-row \.game-row-actions\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\) 34px;/, "Main New additions list rows must fit their Play, Finish setup, and Delete actions on mobile");
assert.match(appSource, /titleOwners\.innerHTML = visibleOwnerTags\(game\)\.map\(ownerBadge\)\.join\(""\)/, "Main cards must place compact owner pills directly after the title");
assert.match(appSource, /function cardChipsFor\(game\) \{\s*return chipsFor\(game\);/, "Main outside card chip rows must not duplicate owner pills");
assert.match(appSource, /el\.detailChips\.innerHTML = `\$\{visibleOwnerTags\(game\)\.map\(ownerBadge\)\.join\(""\)\}\$\{chipsFor\(game\)\.join\(""\)\}`/, "Main detail chips must place owner pills before category chips");
assert.match(appSource, /const badges = `\$\{completedOwnerBadges\(game\)\}\$\{completedBadges\(game, \{ includePsn: false \}\)\}`[\s\S]*?itemClass: ownerCardClass\(game\)/, "Main Last Finished cards must include mini owner tags and owner color classes");
assert.match(appSource, /class="completed-row[\s\S]*?\$\{ownerCardClass\(game\)\}[\s\S]*?<span class="completed-platform">\$\{completedOwnerBadges\(game\)\}\$\{completedBadges\(game\)\}<\/span>/, "Main Finished list rows must include mini owner tags and owner color classes");
assert.doesNotMatch(shelfSource, /<span class="label">Shelf<\/span><span class="count">/, "Shelf must only show a count on New additions");
assert.match(shelfSource, /<span class="label">New additions<\/span><span class="count">\$\{pendingCount\}<\/span>/, "Shelf New additions tab must show its count");
assert.match(shelfSource, /--tab-index", state\.filters\.tab === "new" \? "1" : "0"/, "Shelf tab slider must move by active tab index");
assert.match(shelfSource, /const pendingCount = state\.canEdit \? state\.games\.filter\(isPendingCollectionGame\)\.length : 0/, "Shelf New additions must only appear while logged in");
assert.match(shelfSource, /isPendingCollectionGame\(game\) \? `<button class="primary-button add-collection-action[\s\S]*?data-action="add-collection"[\s\S]*?data-action="delete"/, "Shelf New additions cards must offer Delete beside Add to Collection");
assert.match(shelfSource, /isPendingCollectionGame\(game\) \? `<button class="primary-button add-collection-action editor-only" data-action="add-collection"[\s\S]*?<button class="danger-button icon-only-button shelf-card-delete-action editor-only" data-action="delete"[\s\S]*?` : `<button class="ghost-button shelf-add-backlog-action editor-only" data-action="add-backlog"/, "Shelf New additions cards must not offer Add to Backlog");
assert.match(shelfSource, /data-action="add-backlog"/, "Shelf cards must offer Add to Backlog");
assert.doesNotMatch(shelfSource, /alert\("Added to Backlog\."\)/, "Shelf Add to Backlog must not show a success popup");
assert.match(shelfSource, /showToast\("Added to Backlog\."\)/, "Shelf Add to Backlog must show a floating success toast");
assert.match(shelfSource, /const existingIndex = games\.findIndex\([\s\S]*?item\.section === "new" && !item\.deletedAt/, "Shelf Add to Backlog must not reuse deleted or accepted Gamelist additions");
assert.match(shelfSource, /function nextShelfReplayCount\(games\)[\s\S]*?return Math\.max\(0, \.\.\.games\.map\(\(game\) => Number\(game\.replayCount\) \|\| 0\)\) \+ 1;/, "Shelf Add to Backlog must bump replay count for repeat additions");
assert.match(shelfSource, /function visibleShelfCardOwners\(owners = \[\]\)[\s\S]*?state\.gamelistSettings\.defaultOwner[\s\S]*?owners\.filter\(\(owner\) => owner !== defaultOwner\)/, "Shelf library cards must hide the default owner pill");
assert.match(shelfCss, /\.shelf-tabs button\s*\{[\s\S]*?min-height:\s*38px;[\s\S]*?transition:\s*color 180ms ease;[\s\S]*?\}\s*\.shelf-tabs button\.active/, "Shelf tab buttons must stay slim like Main tabs");
assert.doesNotMatch(shelfCss, /\.shelf-tabs button\s*\{[\s\S]*?padding:\s*8px 13px;/, "Shelf tabs must not keep the chunkier local padding");
assert.match(shelfCss, /\.shelf-tabs button:hover\s*\{\s*color:\s*var\(--accent\);[\s\S]*?\.shelf-tabs button\.active:hover\s*\{\s*color:\s*#ffffff;/, "Shelf tabs must use Main's accent hover text effect");
assert.match(shelfSource, /const badges = `\$\{visibleProjectionOwners\(game\)\.map\(ownerBadge\)\.join\(""\)\}[\s\S]*?itemClass: projectionOwnerCardClass\(game\)/, "Shelf Last Finished projection cards must include mini owner tags and owner color classes");
assert.match(shelfCss, /\.shelf-page \.game-card \.title-owners \.owner-pill\s*\{[\s\S]*?min-height:\s*18px;[\s\S]*?font-size:\s*10px;/, "Shelf card owner tags must stay compact");
assert.match(shelfCss, /\.shelf-page \.game-row-core \.owner-pill\s*\{[\s\S]*?min-height:\s*18px;[\s\S]*?font-size:\s*10px;/, "Shelf row owner tags must stay compact");
assert.match(shelfCss, /\.shelf-dialog #detailChips \.owner-pill\s*\{[\s\S]*?min-height:\s*24px;[\s\S]*?font-size:\s*12px;/, "Shelf detail owner tags must match category chip height");
assert.match(shelfSource, /isPendingCollectionGame\(game\) \? `<div class="game-row-actions-top">[\s\S]*?data-action="add-collection"[\s\S]*?<div class="game-row-actions-bottom">[\s\S]*?data-action="delete"/, "Shelf pending mobile list rows must place Add to Collection on top and Delete below");
assert.match(shelfCss, /\.shelf-dialog \.detail-cover#detailCoverWrap\s*\{[\s\S]*?height:\s*var\(--shelf-cover-height[\s\S]*?line-height:\s*0;[\s\S]*?font-size:\s*0;[\s\S]*?border-radius:\s*8px;[\s\S]*?\.shelf-dialog \.detail-cover#detailCoverWrap img#detailCover\s*\{[\s\S]*?display:\s*block;[\s\S]*?height:\s*100%;[\s\S]*?object-fit:\s*fill;/, "Shelf detail cover must enforce the exact measured image frame so bottom corners clip exactly");
assert.match(shelfSource, /const isDetailCover = frame\.classList\.contains\("detail-cover"\);[\s\S]*?const detailCap = window\.matchMedia\?\.\("\(max-width: 760px\)"\)\.matches \? 335 : 255;[\s\S]*?if \(isDetailCover\) \{[\s\S]*?frame\.style\.width = `\$\{width\}px`;[\s\S]*?frame\.style\.height = `\$\{renderedHeight\}px`;[\s\S]*?image\.style\.height = `\$\{renderedHeight\}px`;/, "Shelf detail cover must set real inline wrapper and image dimensions from the image aspect ratio with desktop/mobile width caps");
assert.match(shelfCss, /@media \(max-width: 760px\)[\s\S]*?\.shelf-grid \.game-card \.card-actions\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0,\s*max-content\) 42px;[\s\S]*?justify-content:\s*end;[\s\S]*?\.shelf-grid \.game-card \.shelf-card-delete-action\s*\{[\s\S]*?height:\s*42px;/, "Shelf mobile card actions must keep compact text actions beside a square Delete button");
assert.match(shelfCss, /\.shelf-grid\.list-view \.game-row-actions-top\s*\{[\s\S]*?justify-content:\s*flex-end;[\s\S]*?\.shelf-grid\.list-view \.game-row-actions-bottom\s*\{[\s\S]*?display:\s*grid;/, "Shelf mobile list rows must place edit/delete on top and Add to Backlog below");
assert.match(shelfCss, /@media \(max-width: 760px\)[\s\S]*?\.shelf-dialog \.detail-cover#detailCoverWrap\s*\{[\s\S]*?height:\s*var\(--shelf-cover-height, 520px\);/, "Shelf mobile detail cover must keep the exact measured frame without extra bottom space");
assert.match(appSource, /<div class="settings-check-field">[\s\S]*?data-shelf-sync/, "Main Shelf Sync check must sit inside a field wrapper");
assert.match(shelfSource, /<div class="settings-check-field">[\s\S]*?id="shelfSettingsSync"[\s\S]*?<div class="settings-check-field">[\s\S]*?id="shelfSettingsShowPrices"/, "Shelf Sync and Prices checks must sit inside field wrappers");
assert.match(sharedCss, /\.settings-sync-card \.settings-visible-check\s*\{[\s\S]*?background-color: rgba\(255, 255, 255, 0\.07\);[\s\S]*?border: 1px solid rgba\(255, 255, 255, 0\.14\);/, "Shelf Sync and Prices checks must sit in dropdown-like controls");
assert.match(sharedCss, /\.settings-sync-card \.settings-visible-check span\s*\{[\s\S]*?font-size:\s*11px;[\s\S]*?text-transform:\s*uppercase;/, "Shelf Sync and Prices check text must be sized like preference controls");
assert.match(sharedCss, /\.settings-theme-card,[\s\S]*?--settings-control-height:\s*42px;[\s\S]*?\.settings-sync-card \.settings-visible-check\s*\{[\s\S]*?min-height:\s*var\(--settings-control-height\);[\s\S]*?\.settings-theme-select select\s*\{[\s\S]*?min-height:\s*var\(--settings-control-height, 42px\);/, "Settings check controls must match Theme and Default order dropdown height");
assert.match(sharedCss, /\.playing-finished-game\.owner-card-judy strong,[\s\S]*?\.completed-row\.owner-card-jordi strong/, "Finished sliders and rows must support owner title colors");
assert.match(sharedCss, /\.playing-finished-game\.owner-card-judy,[\s\S]*?box-shadow: 0 0 20px rgba\(255, 158, 210, 0\.12\);[\s\S]*?\.playing-finished-game\.owner-card-jordi,[\s\S]*?box-shadow: 0 0 20px rgba\(255, 173, 95, 0\.12\);/, "Finished sliders and rows must support owner border glow");
assert.match(shelfSource, /function platformStoreProvidersForGame\(game\)[\s\S]*?return \["Nintendo"\][\s\S]*?return \["PlayStation"\][\s\S]*?return \["Steam"\][\s\S]*?return \["Xbox"\]/, "Shelf website links must follow platform-specific store rules");
assert.match(shelfSource, /state\.pendingLengthHours = result\.lengthHours \|\| state\.pendingLengthHours/, "Shelf metadata lookup must store HLTB time without displaying it");
assert.match(shelfSource, /currency: settings\.currency/, "Shelf navbar price fetch must use normalized selected currency");
assert.match(shelfSource, /function collectionPriceParams\(game[\s\S]*?priceChartingPageUrl\(priceChartingValue\)[\s\S]*?params\.set\("url", productUrl\)[\s\S]*?params\.set\("id", productId\)/, "Shelf price fetch must send PriceCharting pages as url and product IDs as id");
assert.match(shelfSource, /const games = state\.games\.filter\(\(game\) => game\.title && !isPendingCollectionGame\(game\)\)/, "Shelf bulk price fetch must not fetch pending New additions");
assert.match(shelfSource, /if \(index\) await delay\(450\)[\s\S]*?fetchCollectionPriceWithRetry\(game, settings\)[\s\S]*?await delay\(950\)[\s\S]*?return fetchCollectionPriceData\(game, settings\)/, "Shelf bulk price fetch must throttle and retry to avoid PriceCharting false failures");
assert.match(shelfSource, /function renderSavedStorePrices\(game\)[\s\S]*?placeholderStorePrices\(settings\)/, "Shelf store prices must show selected-store placeholders when no saved store prices exist");
assert.match(shelfSource, /if \(!response\.ok \|\| data\.error\)[\s\S]*?else applyCollectionPrice\(game, data\)[\s\S]*?Checking store prices/, "Shelf store price fetch must still run when collection value matching fails");
for (const source of [appSource, shelfSource]) assert.match(source, /showToast\("Fetching game info\.\.\."\)[\s\S]*?showToast\([^)]*(?:Found|matches|game matches)/, "Main and Shelf fetching must show toast feedback");
for (const source of [appSource, shelfSource]) assert.match(source, /showToast\(`Fetching prices for \$\{games\.length\} games\.\.\.`\)[\s\S]*?showToast\(`Updated prices for \$\{updated\} games/, "Main and Shelf price fetching must show toast feedback");
assert.match(shelfSource, /const collectionGames = visibleGames\.filter\(\(game\) => !isPendingCollectionGame\(game\)\)[\s\S]*?collectionGames\.reduce\(\(sum, game\) => sum \+ \(collectionValueFor\(game\) \|\| 0\), 0\)[\s\S]*?\[collectionGames\.length, "Physical games"/, "Shelf collection KPIs must exclude New additions until they are added to the collection");
assert.match(shelfSource, /if \(type === "value"\) return \(a, b\) => direction \* \(collectionValueFor\(a\) - collectionValueFor\(b\)\)/, "Shelf value sorting must use the latest fetched condition value");
for (const html of [appHtml, shelfHtml]) assert.doesNotMatch(html, /<nav class="nav-tabs"/, "Main and Shelf must not show the temporary cross-site navbar");
for (const source of [appSource, shelfSource]) assert.match(source, /initPagePullTransition\(\{ targetLabel: "[^"]+", targetUrl: "[^"]+" \}\)/, "Main and Shelf must initialize the pull-down page transition");
assert.match(sharedCss, /\*[\s\S]*?-webkit-tap-highlight-color:\s*transparent;[\s\S]*?@media \(hover: none\), \(pointer: coarse\)[\s\S]*?-webkit-touch-callout:\s*none;[\s\S]*?user-select:\s*none;/, "Mobile taps and drags must suppress default blue highlight and callouts");
assert.match(sharedCss, /\.page-pull-switch[\s\S]*?transform:\s*translateX\(-50%\) translateY\(var\(--pull-handle-y, 0px\)\);[\s\S]*?touch-action:\s*none;/, "Pull switch handle must physically move with the pull gesture");
assert.match(sharedCss, /\.page-pull-switch\.is-dragging\s*\{[\s\S]*?transition:\s*none;[\s\S]*?\.page-pull-switch::before[\s\S]*?height:\s*35px;[\s\S]*?background:\s*var\(--accent\);[\s\S]*?transform:\s*translateX\(-50%\) scaleX\(0\.42\) scaleY\(0\.17\);[\s\S]*?\.page-pull-switch span[\s\S]*?font-size:\s*13px;[\s\S]*?\.page-pull-switch:hover::before[\s\S]*?background:\s*var\(--accent\);[\s\S]*?transform:\s*translateX\(-50%\) scaleX\(1\) scaleY\(1\);/, "Pull switch must use a pure accent ultra-thin collapsed/35px expanded handle and smooth direct dragging");
assert.match(sharedCss, /\.page-pull-curtain[\s\S]*?transform:\s*translateY\(calc\(-102% \+ var\(--pull-distance, 0px\)\)\);[\s\S]*?\.page-pull-preview[\s\S]*?width:\s*100vw;[\s\S]*?filter:\s*blur\(var\(--pull-blur, 10px\)\);[\s\S]*?\.page-pull-frame[\s\S]*?height:\s*100vh;[\s\S]*?pointer-events:\s*none;[\s\S]*?body\.page-switching \.page-pull-curtain[\s\S]*?transform:\s*translateY\(0\);/, "Pull-down page transition must use a full-viewport real blurred destination preview");
for (const source of [appSource, shelfSource]) assert.match(source, /window\.innerHeight \* 0\.75[\s\S]*?--pull-handle-y[\s\S]*?--pull-blur[\s\S]*?\(1 - progress\) \* 10[\s\S]*?pull > window\.innerHeight \* 0\.75/, "Pull-down page transition must move the handle with the page and keep blur until three quarters of the viewport");
for (const source of [appSource, shelfSource]) {
  assert.match(source, /PULL_NAVIGATION_KEY[\s\S]*?sessionStorage\.setItem\(PULL_NAVIGATION_KEY[\s\S]*?localStorage\.setItem\(VERSION_STORAGE_KEY, SITE_VERSION\)[\s\S]*?pullNavigationUrl\(targetUrl\)/, "Pull-switch navigation must mark the transition and current version before leaving");
  assert.match(source, /function pullNavigationUrl\(targetUrl\)[\s\S]*?searchParams\.set\("pull", "1"\)[\s\S]*?searchParams\.set\("v", SITE_VERSION\)/, "Pull-switch navigation must cache-bust the destination URL");
  assert.match(source, /function consumeRecentPullNavigation\(\)[\s\S]*?searchParams\.get\("pull"\) === "1"[\s\S]*?history\.replaceState[\s\S]*?sessionStorage\.removeItem\(PULL_NAVIGATION_KEY\)/, "Pull-switch navigation must consume its transition marker and clean the landing URL");
  assert.match(source, /const fromPullNavigation = consumeRecentPullNavigation\(\)[\s\S]*?if \(fromPullNavigation\) \{[\s\S]*?clearSiteCaches\(\)\.catch/, "Pull-switch navigation must avoid an immediate version reload on landing");
}
for (const html of [appHtml, shelfHtml]) {
  assert.match(html, /html\.theme-booting:not\(\.from-pull-navigation\) body\{visibility:hidden\}/, "Pull-switch landings must not hide the destination during theme boot");
  assert.match(html, /URLSearchParams\(location\.search\)\.get\("pull"\) === "1"[\s\S]*?from-pull-navigation/, "Pull-switch landings must mark the initial document before first paint");
}
assert.match(sharedCss, /@media \(max-width: 760px\)[\s\S]*?\.page-pull-switch\s*\{[\s\S]*?width:\s*min\(340px, calc\(100vw - 20px\)\);[\s\S]*?height:\s*25px;/, "Mobile pull handle must keep a compact grab target that avoids navbar buttons");
for (const source of [appSource, shelfSource]) assert.match(source, /function formatShortDate\(value\)[\s\S]*?formatPillDate[\s\S]*?function formatLongDate\(value\)[\s\S]*?formatPillDate[\s\S]*?month:\s*"short",\s*day:\s*"2-digit",\s*year:\s*"numeric"/, "Main and Shelf date pills must render as Mon DD, YYYY");
for (const source of [appSource, shelfSource]) assert.doesNotMatch(source, /page-pull-preview-title/, "Pull-down destination preview must not show large text");
for (const source of [appSource, shelfSource]) assert.match(source, /pagePullPreviewMarkup\(targetUrl\)[\s\S]*?<iframe class="page-pull-frame" src="\$\{escapeHtml\(targetUrl\)\}"/, "Pull-down destination preview must use the real opposite page in an iframe");
assert.match(sharedCss, /@media \(max-width: 760px\)[\s\S]*?\.topbar\s*\{[\s\S]*?padding:\s*28px 14px 12px;[\s\S]*?body\.page-pull-hover \.topbar,[\s\S]*?body\.page-pulling \.topbar\s*\{[\s\S]*?transform:\s*translateY\(16px\);/, "Mobile topbar must leave room for the pull-down handle and move down when its label is showing");
assert.match(shelfSource, /state\.viewMode === "list"[\s\S]*?games\.map\(gameRow\)/, "Shelf list mode must render Main-style compact rows");
assert.match(shelfSource, /syncViewModeButton\(el\.view, state\.viewMode/, "Shelf view control must show the current mode");
assert.match(shelfCss, /\.shelf-page \.stats\s*\{[\s\S]*?display:\s*grid;[\s\S]*?grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);[\s\S]*?\.shelf-page \.stats \.stat-done\s*\{\s*grid-column:\s*1 \/ -1;/, "Shelf mobile KPIs must show physical games and platforms on one row with value underneath");
assert.match(shelfCss, /\.shelf-toolbar\s*\{[\s\S]*?position:\s*static;[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)\s+var\(--toolbar-control-height\)/, "Shelf mobile order row must reserve square action controls like Main");
assert.match(sharedCss, /@media \(max-width: 760px\)[\s\S]*?\.prices,[\s\S]*?\.game-card \.prices\s*\{[\s\S]*?grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\) !important;/, "Gamelist mobile store price grids must render as 2x2");
assert.match(appSource, /function syncMobileTabIndicator\(\)[\s\S]*?activeRect\.width/, "Main mobile tabs must measure the active tab so narrow New additions counts do not break the slider");
assert.match(sharedCss, /@media \(max-width: 760px\)[\s\S]*?\.mobile-section-tabs button\[data-mobile-section="new"\][\s\S]*?padding:\s*0;[\s\S]*?\.mobile-section-tabs button\[data-mobile-section="new"\] \.count\s*\{[\s\S]*?min-width:\s*18px;/, "Main mobile New additions count must be compact");
assert.match(shelfCss, /\.shelf-grid\.list-view \.region-flag,[\s\S]*?\.condition-pill[\s\S]*?height:\s*24px;/, "Shelf list flags and condition pills must match the platform pill's rendered height");
assert.match(shelfSource, /function updateShelfRowTitleOverflow\(\)[\s\S]*?scrollWidth > title\.clientWidth/, "Shelf list titles must expose their full text on hover when truncated");
assert.match(shelfSource, /shelf-row-description/, "Shelf list rows must include a compact description excerpt");
assert.match(shelfCss, /@media \(max-width: 760px\)[\s\S]*?\.shelf-grid\.list-view \.game-row-description\s*\{\s*display:\s*none;/, "Shelf mobile list view must hide row descriptions outside the card");
assert.doesNotMatch(shelfCss, /cover-showcase|\.shelf-grid \.game-card\.has-art::before/, "Shelf grid cards must not override Main's cover or parallax effects");
assert.match(shelfSource, /fragment\.appendChild\(gameCard\(game, \{ imagePriority: index < 6 \? "eager" : "lazy" \}\)\)/, "Shelf grid must insert live cards with Main's image-priority lifecycle");
assert.match(shelfSource, /function gameCard\(game, options = \{\}\)[\s\S]*?bindActivityCardParallax\(card\)[\s\S]*?return card;/, "Shelf grid must bind Main's parallax before inserting the live card");
assert.doesNotMatch(shelfSource, /async function loadShelfCardTrophies\(game, remote\)[\s\S]*?renderLibrary\(\)/, "Async trophy loading must not rebuild the Shelf library or disturb scrolling");
assert.match(shelfSource, /async function loadTrophyActivity\(\)[\s\S]*?updateAllShelfTrophyStrips\(\)/, "Achievement refreshes must patch playing trophy strips in place");
for (const source of [appSource, shelfSource]) assert.match(source, /settings-preference-row/, "Main and Shelf must keep Theme and Default order together in the shared preference row");
assert.match(shelfSource, /function updateShelfCardTrophyStrips\(gameId\)[\s\S]*?\.game-card\[data-gamelist-id=[\s\S]*?shelfCardTrophies\(game,\s*\{\s*compactProgress:\s*true\s*\}\)/, "Shelf must update the visible playing-card trophy strip when its async data arrives");
assert.match(shelfSource, /async function loadShelfCardTrophies\(game, remote\)[\s\S]*?updateShelfCardTrophyStrips\(game\.id\)/, "Shelf PSN trophy loading must refresh the outside playing card directly");
assert.match(shelfHtml, /<dialog id="addDialog">\s*<form method="dialog" class="modal add-modal"/, "Shelf physical editor must use Main's dialog and modal shell");
assert.match(shelfHtml, /<p class="eyebrow">Game data<\/p><h2>Add Game<\/h2>/, "Shelf physical editor must use a normal Add Game title beneath the Game data eyebrow");
for (const section of ["Collecting Information", "Physical Edition", "Game Data"]) assert.match(shelfHtml, new RegExp(`<h3>${section}<\\/h3>`), `Shelf physical editor must group ${section} like Main`);
assert.doesNotMatch(shelfHtml, /Added games are saved to this browser/, "Shelf must not show the obsolete browser-only save note");
assert.doesNotMatch(shelfCss, /^\.lookup-result/m, "Shelf lookup must use Main's shared result CSS");
assert.match(shelfSource, /classList\.add\("loaded"\)/, "Shelf lookup results must activate Main's visible result state");
assert.match(shelfSource, /lookupSource: "pricecharting"/, "Shelf lookup must show selectable PriceCharting editions");
assert.match(shelfSource, /const metadata = bestGameMetadata\(result\.productName \|\| query\)[\s\S]*?cover: metadata\?\.cover \|\| ""[\s\S]*?lookupSource: "pricecharting"/, "Shelf PriceCharting lookup rows must reuse matching game metadata covers when available");
assert.match(shelfSource, /const image = coverUrl\(result\.cover \|\| ""\)[\s\S]*?shelf-lookup-result\$\{image \? "" : " no-cover"\}/, "Shelf lookup rows must only use the no-cover state when no cover exists");
assert.match(shelfCss, /\.shelf-dialog \.lookup-result \.lookup-placeholder\s*\{[\s\S]*?background: color-mix\(in srgb, var\(--muted\) 30%, transparent\);[\s\S]*?opacity:\s*0\.3;[\s\S]*?\.shelf-dialog \.lookup-result\.no-cover strong,[\s\S]*?\.shelf-dialog \.lookup-result\.no-cover p\s*\{[\s\S]*?opacity:\s*0\.3;/, "Shelf lookup rows without covers must show muted 30% placeholders");
assert.match(shelfSource, /searches\.push\(\{ title, platform: selectedPlatform \}\);[\s\S]*?searches\.push\(\{ title, platform: "" \}\);[\s\S]*?bestPhysicalSearchScore/, "Shelf physical search must retry broadly so selected platform defaults do not hide exact games like WWE Day of Reckoning");
assert.match(shelfSource, /if \(result\.cover && !el\.fields\.cover\.value\) el\.fields\.cover\.value = result\.cover;/, "Shelf metadata lookup must apply a found cover to the editor");
assert.match(collectionPriceSource, /region-name=all&exclude-variants=false/, "PriceCharting edition search must include PAL, Japan, and other regional variants");
assert.match(collectionPriceSource, /cleanPriceChartingUrl/, "PriceCharting lookup must accept an exact product page URL");
assert.match(collectionPriceSource, /const requestedIdUrl = cleanPriceChartingUrl\(rawRequestedId\)/, "PriceCharting lookup must recover if a saved page URL is passed as id");
assert.match(collectionPriceSource, /fetchApiProduct\(token, \{ id: requestedId, upc: requestedUpc, query \}\)/, "PriceCharting must still use saved product IDs for API lookups");
assert.match(collectionPriceSource, /encodeURIComponent\(requestedUpc \|\| query \|\| title \|\| requestedId\)/, "PriceCharting public search must prefer title, region, and platform text over numeric IDs");
assert.match(collectionPriceSource, /const idSearchUrl = requestedId \? `\$\{SITE_URL\}\/search-products\?id=\$\{encodeURIComponent\(requestedId\)\}`/, "PriceCharting public fallback must build an exact product ID search URL");
assert.match(collectionPriceSource, /productPageUrl\(rawProductName, consoleName\)/, "PriceCharting public ID fallback must turn ID search rows into game product pages");
assert.match(collectionPriceSource, /const exactCandidate = rawCandidates\.find\(\(item\) => requestedId && item\.productId === requestedId\)[\s\S]*?const broadExactCandidate = requestedUrl \|\| idCandidate \|\| exactCandidate \|\| !requestedId \? null : await exactCandidateFromSearchUrls\(broadSearchUrls, requestedId\)[\s\S]*?const candidates = exactCandidate \|\| broadExactCandidate \? \[\] : filterVideoGameCandidates\(rawCandidates, query\)[\s\S]*?const candidate = requestedUrl \? \{ url: requestedUrl, productId: requestedId \} : idCandidate \|\| exactCandidate \|\| broadExactCandidate \|\|/, "PriceCharting public fallback must prefer the exact saved product ID before platform-filtered title matching");
assert.match(collectionPriceSource, /idCandidate \|\| exactCandidate \|\| broadExactCandidate \|\| directCandidate \|\| bestCandidate\(candidates, query\)/, "PriceCharting public fallback must try exact product pages before ranked physical title matching when the free public site cannot resolve a saved ID");
assert.match(collectionPriceSource, /if \(\/\\b\(\?:sony \)\?playstation\\b\|\\bps \?one\\b\|\\bpsx\\b\/\.test\(textValue\)\) return "playstation 1"/, "PriceCharting platform matching must understand Sony PlayStation as PS1");
assert.match(collectionPriceSource, /if \(\/\\bpc games\?\\b\|\\bpc\\b\/\.test\(textValue\)\) return "pc"/, "PriceCharting platform matching must keep PC games from matching console editions");
assert.match(collectionPriceSource, /filterVideoGameCandidates/, "PriceCharting search must reject cards, comics, and other non-video-game categories");
assert.match(collectionPriceSource, /rankCandidates\(filterVideoGameCandidates\(await fetchPublicCandidates\(searchUrl\), query\), query\)/, "PriceCharting results must rank PAL, Japan, and platform matches locally after filtering non-games");
assert.doesNotMatch(collectionPriceSource, /hydrateSearchCandidateImages/, "PriceCharting search results must not hydrate images from possible non-game matches");
assert.match(collectionPriceSource, /fetchDirectCandidates\(fallbackUrls, query, searchUrl\)/, "PriceCharting must fall back to exact regional product pages when search returns no rows");
assert.doesNotMatch(shelfSource, /Loading the selected PriceCharting edition|Matching the physical edition/, "Selecting a lookup result must not replace it with fetching text");
assert.match(shelfSource, /lookup-placeholder/, "Shelf PriceCharting lookup rows must keep a blank image slot when no image is available");
assert.match(shelfSource, /if \(data\.productUrl \|\| data\.productId\) el\.fields\.pricechartingId\.value = data\.productUrl \|\| data\.productId;/, "Shelf physical lookup must keep the PriceCharting page URL when available");
assert.match(shelfSource, /const productUrl = game\.collectionProductUrl \|\| priceChartingPageUrl\(game\.pricechartingId\)[\s\S]*?collection-price-grid[\s\S]*?<a href="\$\{escapeHtml\(productUrl\)\}"/, "Shelf collection value boxes must link to the PriceCharting product page");
assert.match(shelfSource, /function applyCollectionPrice\(game, data\)[\s\S]*?game\.priceHistory[\s\S]*?game\.updatedAt = new Date\(\)\.toISOString\(\);/, "Shelf price fetch must update price data only");
assert.doesNotMatch(shelfSource, /function applyCollectionPrice\(game, data\)[\s\S]*?game\.(?:cover|pricechartingId|upc|sku|asin|epid|releaseDate) =/, "Shelf price fetch must not overwrite metadata, ids, or cover art");
assert.match(shelfCss, /\.condition-sealed input\[type="checkbox"\]:checked[\s\S]*?#ffe982[\s\S]*?#c8920a/, "The Sealed checkbox must use the gold condition treatment");
assert.match(shelfCss, /\.condition-sealed input\[type="checkbox"\]:checked[\s\S]*?stroke='%23fff'/, "The gold Sealed checkbox must retain a white checkmark");
assert.equal(normalizeSearchText("Pokémon"), normalizeSearchText("pokemon"), "Shared search must ignore accents");
assert.equal(normalizeSearchText("Afterimage: Deluxe"), normalizeSearchText("Afterimage Deluxe"), "Shared search must ignore punctuation");
for (const source of [appSource, shelfSource]) assert.match(source, /normalizeSearchText/, "Main and Shelf must share accent- and punctuation-insensitive search");
assert.match(appSource, /gamegear: "Game Gear"/, "Main must canonicalize Game Gear");
assert.match(appSource, /function platformClass\(platform\)[\s\S]*?isSegaPlatform\(value\)/, "Main must force Sega platforms through the Sega platform pill style");
assert.match(shelfSource, /gamegear: "Game Gear"/, "Shelf must canonicalize Game Gear");
assert.match(shelfSource, /function platformClass\(platform\)[\s\S]*?isSegaPlatform\(value\)/, "Shelf must support Sega platform pill styles");
assert.match(shelfSource, /"Game Boy Advance"[\s\S]*?"Game Boy"[\s\S]*?"Sega Game Gear"/, "Shelf platform autofill must include classic Nintendo and Sega platforms");
assert.match(shelfSource, /gameboyadvance: "GBA"/, "Shelf must canonicalize Game Boy Advance");
assert.match(shelfSource, /gameboy: "GB"/, "Shelf must canonicalize Game Boy");
assert.match(shelfSource, /supernintendoentertainmentsystem: "SNES"/, "Shelf must canonicalize SNES");

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
