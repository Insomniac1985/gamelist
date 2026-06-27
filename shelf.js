import { normalizeSearchText, createGameCardShell, bindActivityCardParallax, mountActivitySlider, finishedGameMarkup, achievementCardMarkup, achievementDashboardMarkup, achievementPanelMarkup, completedCardMarkup, horizontalCarouselState, syncViewModeButton, slideHorizontalCarousel, comparePlayingGames, finishedDurationText, timeBadgeMarkup, guideLinksMarkup, storeButtonsMarkup, activityTrailerUrl, syncFocusedActivityTrailer, activityReleaseStatus, activityCoverOverride, activityLocalGameForTitle, activityTitleMatchScore, activityAllowsPsnCardTrophies, formatFooterDate, formatFooterDateTime, confirmGameDelete } from "./activity-ui.js";

mountActivitySlider(document.querySelector("[data-module='playing']"), { count: "shelfPlayingCount", previous: "shelfPlayingPrev", next: "shelfPlayingNext", list: "playingCarousel", finished: "shelfPlayingFinished", finishedList: "finishedCarousel" });
splitShelfPlayingModules();

const SESSION_KEY = "gamelist-editor";
const KASH_TWITCH_URL = "https://www.twitch.tv/kashhoward";
const SITE_VERSION = "v205";
const SITE_UPDATED_AT = "2026-06-27T18:36:11+02:00";
const VERSION_STORAGE_KEY = "gamelist:site-version";
const VIEW_KEY = "shelf:view-mode:v2";
const LAYOUT_KEY = "shelf:layout:v2";
const LOCAL_DRAFT_KEY = "shelf:draft-data:v2";
const DEFAULT_LAYOUT = ["playing", "latestFinished", "trophies", "kpis", "filters", "library"];
const LAYOUT_KEYS = [...DEFAULT_LAYOUT];
const DEFAULT_HIDDEN_MODULES = ["playing", "trophies"];
const STORE_OPTIONS = ["Amazon", "eBay", "GAME.es", "Xtralife", "Retro Island NY", "GameStop", "Walmart"];
const DEFAULT_PRICE_STORES = ["Amazon", "eBay", "Xtralife", "GAME.es"];
const MAX_PRICE_STORES = 5;
const THEMES = {
  shabii: { title: "Shabii's Shelf", icon: "assets/Icon_shelf.png", color: "#ff0039" },
  kash: { title: "Kash's Shelf", icon: "assets/kh_icon.png", color: "#005cff" },
};
const MODULE_NAMES = { playing: "Currently Playing", latestFinished: "Last Finished", trophies: "Achievements", kpis: "Collection highlights", filters: "Search and filters", library: "Shelf" };
const PLATFORM_OPTIONS = [
  "Nintendo Switch", "Nintendo Switch 2", "Sony PlayStation 5", "Sony PlayStation 4",
  "Sony PlayStation 2", "Sony PlayStation", "Nintendo 3DS", "Nintendo DS", "Nintendo 64",
];
const COUNTRY_OPTIONS = [
  ["Australia", "Australia"], ["China", "China"], ["Europe", "EU"], ["France", "France"], ["Germany", "Germany"],
  ["Japan", "Japan"], ["Spain", "Spain"], ["Taiwan", "Taiwan"], ["United Kingdom", "United Kingdom"],
  ["United States of America", "United States"], ["World", "World"],
];

const state = {
  sourceGames: [],
  additions: [],
  overrides: {},
  games: [],
  gamelistGames: [],
  gamelistSettings: loadSharedSettings(),
  metadataLookupResults: [],
  trophyActivity: null,
  steamActivity: { achievements: [], games: [], completed: [], totalEarned: 0, sourceUrl: "" },
  xboxActivity: { achievements: [], games: [], completed: [], totalEarned: 0, sourceUrl: "" },
  cardTrophies: {},
  canEdit: sessionStorage.getItem(SESSION_KEY) === "true",
  editingId: "",
  lookupResults: [],
  filters: { query: "", platform: "all", region: "all", condition: "all", category: "all", tab: "all", sort: "platform", direction: "asc" },
  viewMode: localStorage.getItem(VIEW_KEY) === "list" ? "list" : "grid",
  completedYear: "all", completedPlatform: "all", completedSort: "time", completedDirection: "desc", completedView: "grid",
  gamelistDetailGame: null, gamelistDetailTrophyData: [], gamelistDetailTrophyEarned: 0, gamelistDetailTrophyTotal: 0, gamelistDetailTrophyKind: "TROPHIES", gamelistDetailTrophyDirection: "asc",
  completedCoverCache: {},
  playingTrailerFrame: 0,
  playingHeightFrame: 0,
  shelfSwipeStart: null,
  layout: loadLayout(),
};

const el = {
  brandLink: document.querySelector(".brand"),
  stats: document.querySelector("#shelfStats"),
  count: document.querySelector("#resultCount"),
  shelf: document.querySelector("#gameShelf"),
  empty: document.querySelector("#emptyState"),
  search: document.querySelector("#searchInput"),
  platform: document.querySelector("#platformFilter"),
  region: document.querySelector("#regionFilter"),
  condition: document.querySelector("#conditionFilter"),
  category: document.querySelector("#categoryFilter"),
  sort: document.querySelector("#sortFilter"),
  sortDirection: document.querySelector("#sortDirectionButton"),
  view: document.querySelector("#viewToggleButton"),
  clear: document.querySelector("#clearFilters"),
  login: document.querySelector("#loginButton"),
  addButton: document.querySelector("#addButton"),
  layoutButton: document.querySelector("#settingsButton"),
  syncButton: document.querySelector("#syncButton"),
  fetchPricesButton: document.querySelector("#fetchPricesButton"),
  modules: document.querySelector("#shelfModules"),
  tabs: document.querySelector("#shelfTabs"),
  playingCarousel: document.querySelector("#playingCarousel"),
  playingCurrent: document.querySelector("[data-module='playing'] .playing-current"),
  finishedCarousel: document.querySelector("#finishedCarousel"),
  playingFinished: document.querySelector("#shelfPlayingFinished"), playingCount: document.querySelector("#shelfPlayingCount"),
  playingPrev: document.querySelector("#shelfPlayingPrev"), playingNext: document.querySelector("#shelfPlayingNext"),
  trophyCard: document.querySelector("#shelfTrophyCard"),
  footerUpdate: document.querySelector("#footerDataUpdate"),
  footerVersion: document.querySelector("#footerVersion"),
  scrollTop: document.querySelector("#scrollTopButton"),
  floatingActions: document.querySelector("#floatingEditActions"), floatingAdd: document.querySelector("#floatingAddButton"),
  detailDialog: document.querySelector("#detailDialog"),
  detailClose: document.querySelector("#detailClose"),
  detailTitle: document.querySelector("#detailTitle"),
  detailStudio: document.querySelector("#detailStudio"), detailMeta: document.querySelector("#detailMeta"),
  detailDates: document.querySelector("#detailDates"), detailDescription: document.querySelector("#detailDescription"),
  detailCover: document.querySelector("#detailCover"),
  detailChips: document.querySelector("#detailChips"), detailGuides: document.querySelector("#detailGuides"),
  detailNote: document.querySelector("#detailNote"),
  detailCondition: document.querySelector("#detailCondition"), detailConditionPanel: document.querySelector("#detailConditionPanel"), detailLinks: document.querySelector("#detailLinks"),
  detailGuideLinks: document.querySelector("#detailGuideLinks"), detailStorePricePanel: document.querySelector("#detailStorePricePanel"), detailStorePrices: document.querySelector("#detailStorePrices"),
  fetchValue: document.querySelector("#fetchValueButton"), detailPricePanel: document.querySelector("#detailPricePanel"), detailPriceToggle: document.querySelector("#detailPriceToggle"), detailPriceContent: document.querySelector("#detailPriceContent"), detailPriceHeadline: document.querySelector("#detailPriceHeadline"), detailPriceSummary: document.querySelector("#detailPriceSummary"),
  detailPriceGraph: document.querySelector("#detailPriceGraph"), detailTrophies: document.querySelector("#shelfDetailTrophies"),
  detailTrophyTitle: document.querySelector("#shelfTrophyTitle"), detailTrophyCount: document.querySelector("#shelfTrophyCount"), detailTrophyPercent: document.querySelector("#shelfTrophyPercent"), detailTrophyList: document.querySelector("#shelfTrophyList"),
  detailTrophySort: document.querySelector("#shelfTrophySort"), detailTrophyDirection: document.querySelector("#shelfTrophyDirection"),
  addDialog: document.querySelector("#addDialog"),
  addForm: document.querySelector("#addGameForm"),
  addClose: document.querySelector("#addClose"),
  editDelete: document.querySelector("#editDeleteButton"),
  lookupInput: document.querySelector("#lookupInput"),
  lookupButton: document.querySelector("#lookupButton"),
  lookupResults: document.querySelector("#lookupResults"),
  fields: {
    title: document.querySelector("#titleInput"), platform: document.querySelector("#platformInput"),
    country: document.querySelector("#countryInput"), price: document.querySelector("#priceInput"),
    owners: document.querySelector("#ownersInput"),
    releaseDate: document.querySelector("#releaseDateInput"), trophyName: document.querySelector("#trophyNameInput"),
    upc: document.querySelector("#upcInput"), sku: document.querySelector("#skuInput"), asin: document.querySelector("#asinInput"),
    epid: document.querySelector("#epidInput"), pricechartingId: document.querySelector("#pricechartingIdInput"),
    websites: document.querySelector("#websitesInput"),
    publisher: document.querySelector("#publisherInput"), developer: document.querySelector("#developerInput"),
    genre: document.querySelector("#genreInput"), cover: document.querySelector("#coverInput"), notes: document.querySelector("#notesInput"), description: document.querySelector("#shelfDescriptionInput"),
    coverProject: document.querySelector("#coverProjectInput"),
  },
  coverProjectButton: document.querySelector("#coverProjectButton"),
  conditionFields: { game: document.querySelector("#conditionGameInput"), manual: document.querySelector("#conditionManualInput"), box: document.querySelector("#conditionBoxInput"), other: document.querySelector("#conditionOtherInput"), sealed: document.querySelector("#conditionSealedInput") },
  layoutDialog: document.querySelector("#layoutDialog"),
  layoutForm: document.querySelector("#layoutForm"),
  layoutClose: document.querySelector("#layoutClose"),
  layoutList: document.querySelector("#layoutList"),
  platformOptions: document.querySelector("#shelfPlatformOptions"),
  settingsTheme: document.querySelector("#shelfSettingsTheme"), settingsDefaultOrder: document.querySelector("#shelfSettingsDefaultOrder"),
  settingsCurrency: document.querySelector("#shelfSettingsCurrency"), settingsRegion: document.querySelector("#shelfSettingsRegion"),
  settingsStores: document.querySelector("#shelfSettingsStores"),
  settingsPsnUser: document.querySelector("#shelfSettingsPsnUser"), settingsMicrosoftUser: document.querySelector("#shelfSettingsMicrosoftUser"),
  settingsSteamUser: document.querySelector("#shelfSettingsSteamUser"), settingsDefaultOwner: document.querySelector("#shelfSettingsDefaultOwner"),
  completedDialog: document.querySelector("#shelfCompletedDialog"), completedClose: document.querySelector("#shelfCompletedClose"), completedTitle: document.querySelector("#shelfCompletedTitle"), completedCount: document.querySelector("#shelfCompletedCount"), completedYear: document.querySelector("#shelfCompletedYear"), completedPlatform: document.querySelector("#shelfCompletedPlatform"), completedSort: document.querySelector("#shelfCompletedSort"), completedDirection: document.querySelector("#shelfCompletedDirection"), completedView: document.querySelector("#shelfCompletedView"), completedList: document.querySelector("#shelfCompletedList"),
  authDialog: document.querySelector("#authDialog"),
  authForm: document.querySelector("#authForm"),
  authClose: document.querySelector("#authCloseButton"),
  authCancel: document.querySelector("#authCancelButton"),
  authPassword: document.querySelector("#authPasswordInput"),
  authError: document.querySelector("#authError"),
};
let selectOverflowPopover = null;
let selectMeasureContext = null;

init();

async function init() {
  if (await checkSiteVersion()) return;
  await window.__initialThemeReady?.catch(() => "shabii");
  applyTheme();
  document.documentElement.classList.remove("theme-booting");
  registerServiceWorker();
  bindTextureParallax();
  populateEditorOptions();
  bindEvents();
  const [shelfData, auth, gamelistData] = await Promise.all([
    fetch("/api/shelf", { cache: "no-store" }).then((response) => response.ok ? response.json() : null).catch(() => null),
    fetch("/api/auth", { cache: "no-store" }).then((response) => response.ok).catch(() => false),
    fetch("/api/sync", { cache: "no-store" }).then((response) => response.ok ? response.json() : null).catch(() => null),
  ]);
  state.sourceGames = shelfData?.sourceGames || [];
  const draft = loadDraft();
  state.additions = draft.games || shelfData?.games || [];
  state.overrides = draft.overrides || shelfData?.overrides || {};
  state.layout = normalizeLayout(shelfData?.layout || state.layout);
  state.canEdit = state.canEdit || auth;
  state.updatedAt = shelfData?.updatedAt || "";
  state.gamelistGames = gamelistData?.games || [];
  state.gamelistSettings = gamelistData?.settings || state.gamelistSettings;
  applyShelfDefaultOrder(state.gamelistSettings.shelfDefaultOrder ?? state.gamelistSettings.defaultOrder);
  applyTheme();
  loadTrophyActivity();
  rebuildGames();
  renderAll();
}
function loadSharedSettings() { try { return JSON.parse(localStorage.getItem("gamelist:settings:v1") || "{}"); } catch { return {}; } }

function bindEvents() {
  el.brandLink?.addEventListener("click", (event) => {
    event.preventDefault();
    if ((THEMES[state.gamelistSettings.theme] ? state.gamelistSettings.theme : "shabii") === "kash") {
      window.open(KASH_TWITCH_URL, "_blank", "noopener,noreferrer");
      return;
    }
    scrollToShelfLibrary();
  });
  el.search.addEventListener("input", () => { state.filters.query = normalizeSearchText(el.search.value); renderLibrary(); });
  el.platform.addEventListener("change", () => { state.filters.platform = el.platform.value; renderLibrary(); });
  el.region.addEventListener("change", () => { state.filters.region = el.region.value; renderLibrary(); });
  el.condition.addEventListener("change", () => { state.filters.condition = el.condition.value; renderLibrary(); });
  el.category.addEventListener("change", () => { state.filters.category = el.category.value; renderLibrary(); });
  el.sort.addEventListener("change", () => { state.filters.sort = el.sort.value; if (["added", "value"].includes(state.filters.sort)) state.filters.direction = "desc"; renderChrome(); renderLibrary(); });
  el.sortDirection.addEventListener("click", () => { state.filters.direction = state.filters.direction === "asc" ? "desc" : "asc"; renderChrome(); renderLibrary(); });
  el.view.addEventListener("click", toggleView);
  el.playingPrev.addEventListener("click", () => slidePlaying(-1));
  el.playingNext.addEventListener("click", () => slidePlaying(1));
  el.playingCarousel.addEventListener("scroll", () => { updatePlayingControls(); scheduleShelfTrailerUpdate(); }, { passive: true });
  el.finishedCarousel.addEventListener("scroll", updateFinishedControls, { passive: true });
  el.clear.addEventListener("click", clearFilters);
  el.login.addEventListener("click", toggleEditMode);
  el.addButton.addEventListener("click", () => openEditor());
  el.floatingAdd.addEventListener("click", () => state.canEdit ? openEditor() : openAuth());
  el.layoutButton.addEventListener("click", openLayout);
  el.syncButton.addEventListener("click", syncShelfNow);
  el.fetchPricesButton.addEventListener("click", refreshAllShelfPrices);
  el.scrollTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  el.footerVersion.addEventListener("click", clearSiteCachesAndReload);
  window.addEventListener("scroll", updateFloatingActions, { passive: true });
  window.addEventListener("storage", (event) => { if (event.key === "gamelist-editor-signal") refreshSharedAuth(); });
  window.addEventListener("focus", refreshSharedAuth);
  window.addEventListener("resize", () => { updatePlayingControls(); updateFinishedControls(); schedulePlayingCardHeightSync(); }, { passive: true });
  document.addEventListener("pointerover", handleSelectOverflowTitle);
  document.addEventListener("focusin", handleSelectOverflowTitle);
  document.addEventListener("pointerout", handleSelectOverflowLeave);
  document.addEventListener("focusout", handleSelectOverflowLeave);

  el.shelf.addEventListener("click", handleShelfClick);
  el.shelf.addEventListener("keydown", (event) => { if (event.key !== "Enter" && event.key !== " ") return; const card = event.target.closest("[data-id]"); if (!card || event.target.closest("button, a, input")) return; event.preventDefault(); const game = state.games.find((item) => item.id === card.dataset.id); if (game) openDetails(game); });
  el.fetchValue.addEventListener("click", fetchCollectionValue);
  el.detailPriceToggle.addEventListener("click", toggleCollectionValuePanel);
  el.tabs.addEventListener("click", (event) => { const tab = event.target.closest("[data-shelf-tab]"); if (!tab) return; setShelfTab(tab.dataset.shelfTab); });
  el.shelf.addEventListener("touchstart", handleShelfSwipeStart, { passive: true });
  el.shelf.addEventListener("touchend", handleShelfSwipeEnd, { passive: true });
  el.tabs.addEventListener("touchstart", handleShelfSwipeStart, { passive: true });
  el.tabs.addEventListener("touchend", handleShelfSwipeEnd, { passive: true });
  el.detailClose.addEventListener("click", () => closeDialog(el.detailDialog));
  el.detailDialog.addEventListener("click", (event) => { if (event.target === el.detailDialog) closeDialog(el.detailDialog); });
  el.detailTrophySort.addEventListener("change", renderGamelistDetailTrophyList);
  el.detailTrophyDirection.addEventListener("click", () => { state.gamelistDetailTrophyDirection = state.gamelistDetailTrophyDirection === "asc" ? "desc" : "asc"; renderGamelistDetailTrophyList(); });

  el.addClose.addEventListener("click", () => closeDialog(el.addDialog));
  el.editDelete.addEventListener("click", deleteCurrentEditedGame);
  el.addDialog.addEventListener("click", (event) => { if (event.target === el.addDialog) closeDialog(el.addDialog); });
  el.addForm.addEventListener("submit", saveEditor);
  el.lookupButton.addEventListener("click", lookupGame);
  el.lookupInput.addEventListener("keydown", (event) => { if (event.key === "Enter") { event.preventDefault(); lookupGame(); } });
  el.lookupResults.addEventListener("click", chooseLookupResult);
  el.coverProjectButton.addEventListener("click", findCoverProjectCover);
  Object.values(el.conditionFields).forEach((input) => input.addEventListener("change", () => syncConditionInputs(input)));
  document.addEventListener("error", handleCoverImageError, true);

  el.layoutClose.addEventListener("click", () => closeDialog(el.layoutDialog));
  el.layoutDialog.addEventListener("click", (event) => { if (event.target === el.layoutDialog) closeDialog(el.layoutDialog); });
  el.layoutForm.addEventListener("submit", saveLayout);
  el.layoutList.addEventListener("click", handleLayoutMove);
  el.completedClose.addEventListener("click", () => closeDialog(el.completedDialog));
  el.completedDialog.addEventListener("click", (event) => { if (event.target === el.completedDialog) closeDialog(el.completedDialog); });
  el.authClose.addEventListener("click", () => closeDialog(el.authDialog));
  el.authCancel.addEventListener("click", () => closeDialog(el.authDialog));
  el.authDialog.addEventListener("click", (event) => { if (event.target === el.authDialog) closeDialog(el.authDialog); });
  el.authForm.addEventListener("submit", submitAuth);
}

function rebuildGames() {
  const source = state.sourceGames.map((game) => ({ ...game, ...(state.overrides[game.id] || {}), sourceRecord: true }));
  state.games = [...source, ...state.additions.map((game) => ({ ...game, sourceRecord: false }))].filter((game) => !game.deletedAt);
}

function renderAll() {
  applyLayout();
  renderChrome();
  renderFilters();
  renderStats();
  renderGamelistModules();
  renderLibrary();
}

function renderChrome() {
  document.body.classList.toggle("can-edit", state.canEdit);
  document.body.classList.toggle("list-view-mode", state.viewMode === "list");
  el.addButton.hidden = false;
  el.layoutButton.hidden = !state.canEdit;
  el.syncButton.hidden = !state.canEdit;
  el.fetchPricesButton.hidden = !state.canEdit || !shelfPricesVisible();
  el.fetchPricesButton.innerHTML = `${currencyIcon()}<span class="button-label">Fetch New Prices</span>`;
  el.login.innerHTML = state.canEdit
    ? `<svg class="pause-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14"></path></svg><span class="button-label">Stop Editing</span>`
    : `<svg class="pencil-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4l11-11a2.8 2.8 0 0 0-4-4L4 16v4Z"></path><path d="M13.5 6.5l4 4"></path></svg>`;
  el.login.title = state.canEdit ? "Stop Editing" : "Edit";
  el.login.setAttribute("aria-label", el.login.title);
  syncViewModeButton(el.view, state.viewMode, { gridIcon, linesIcon });
  el.sortDirection.innerHTML = sortArrowIcon(state.filters.direction === "desc");
  el.sortDirection.classList.toggle("desc", state.filters.direction === "desc");
  el.sortDirection.title = `Sort ${state.filters.direction === "desc" ? "descending" : "ascending"}`;
  el.footerUpdate.textContent = state.updatedAt ? `Last edit ${formatFooterDate(state.updatedAt)}` : "Last edit -";
  el.footerVersion.textContent = `${SITE_VERSION} · Updated ${formatFooterDateTime(SITE_UPDATED_AT)}`;
  updateFloatingActions();
}

function updateFloatingActions() {
  const visible = window.scrollY > 180 && !document.body.classList.contains("dialog-open");
  el.scrollTop.classList.toggle("visible", visible);
  el.floatingActions.classList.toggle("visible", visible);
}

async function syncShelfNow() {
  el.syncButton.disabled = true;
  try {
    const [shelfData, gamelistData] = await Promise.all([
      fetch("/api/shelf", { cache: "no-store" }).then((response) => response.ok ? response.json() : null),
      fetch("/api/sync", { cache: "no-store" }).then((response) => response.ok ? response.json() : null),
    ]);
    if (shelfData) {
      state.sourceGames = shelfData.sourceGames || [];
      state.additions = shelfData.games || [];
      state.overrides = shelfData.overrides || {};
      state.layout = normalizeLayout(shelfData.layout || state.layout);
      state.updatedAt = shelfData.updatedAt || state.updatedAt;
    }
    if (gamelistData) {
      state.gamelistGames = gamelistData.games || [];
      state.gamelistSettings = gamelistData.settings || state.gamelistSettings;
    }
    rebuildGames();
    renderAll();
    loadTrophyActivity();
  } finally {
    el.syncButton.disabled = false;
  }
}

async function refreshAllShelfPrices() {
  if (!state.canEdit || !shelfPricesVisible()) return;
  const games = state.games.filter((game) => game.title);
  if (!games.length) return;
  el.fetchPricesButton.disabled = true;
  let updated = 0;
  let failed = 0;
  try {
    for (const [index, game] of games.entries()) {
      el.fetchPricesButton.innerHTML = `${currencyIcon()}<span class="button-label">Prices ${index + 1}/${games.length}</span>`;
      el.fetchPricesButton.title = `Prices ${index + 1}/${games.length}`;
      el.fetchPricesButton.setAttribute("aria-label", el.fetchPricesButton.title);
      try {
        const params = new URLSearchParams({ title: game.title, platform: shortPlatform(game.platform), region: game.country || game.region || "", currency: state.gamelistSettings.currency || "EUR" });
        if (game.pricechartingId) params.set("id", game.pricechartingId); else if (game.upc) params.set("upc", game.upc);
        const response = await fetch(`/api/collection-price?${params}`);
        const data = await response.json();
        if (!response.ok || data.error) throw new Error(data.error || "Price unavailable");
        applyCollectionPrice(game, data);
        updated += 1;
      } catch {
        failed += 1;
      }
    }
    await persistShelf();
    renderAll();
    alert(`Updated prices for ${updated} games${failed ? `, ${failed} failed` : ""}.`);
  } finally {
    el.fetchPricesButton.disabled = false;
    el.fetchPricesButton.innerHTML = `${currencyIcon()}<span class="button-label">Fetch New Prices</span>`;
    el.fetchPricesButton.title = "Fetch New Prices";
    el.fetchPricesButton.setAttribute("aria-label", "Fetch New Prices");
  }
}

function applyTheme() {
  const key = THEMES[state.gamelistSettings.theme] ? state.gamelistSettings.theme : "shabii";
  const theme = THEMES[key];
  document.documentElement.classList.toggle("theme-kash", key === "kash");
  document.body.classList.toggle("theme-kash", key === "kash");
  document.title = theme.title;
  document.querySelector("meta[name='theme-color']")?.setAttribute("content", theme.color);
  document.querySelector("link[rel='icon']")?.setAttribute("href", theme.icon);
  const brandMark = document.querySelector(".brand-mark");
  const brandText = document.querySelector(".brand span:last-child");
  if (brandMark) brandMark.src = theme.icon;
  if (brandText) brandText.textContent = theme.title;
  el.brandLink?.setAttribute("aria-label", theme.title);
  el.brandLink?.setAttribute("href", key === "kash" ? KASH_TWITCH_URL : "#gameShelf");
  el.brandLink?.toggleAttribute("target", key === "kash");
  if (key === "kash") el.brandLink?.setAttribute("rel", "noreferrer");
  else el.brandLink?.removeAttribute("rel");
}

function scrollToShelfLibrary() {
  document.querySelector("[data-module='library']")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderStats() {
  const visibleGames = visibleShelfGames();
  const value = visibleGames.reduce((sum, game) => sum + (Number(game.price) || 0), 0);
  const valueText = state.gamelistSettings.currency === "USD" ? `$${Math.round(value).toLocaleString("en")}` : `${Math.round(value).toLocaleString("en")}€`;
  const rows = [
    [visibleGames.length, "Physical games", "stat-backlog"],
    [new Set(visibleGames.map((game) => game.platform)).size, "Platforms", "stat-available"],
    ...(shelfPricesVisible() ? [[valueText, "Estimated value", "stat-done"]] : []),
  ];
  el.stats.innerHTML = rows.map(([valueText, label, className]) => `<div class="stat glass ${className}"><strong>${escapeHtml(valueText)}</strong><span>${escapeHtml(label)}</span></div>`).join("");
}

function renderFilters() {
  if (!shelfPricesVisible() && state.filters.sort === "value") {
    state.filters.sort = "platform";
    state.filters.direction = "asc";
  }
  const visibleGames = visibleShelfGames();
  const platforms = uniqueSorted(visibleGames.map((game) => game.platform));
  const countries = uniqueSorted(visibleGames.map((game) => game.country));
  const categories = uniqueSorted(visibleGames.flatMap((game) => [...String(game.genre || "").split(","), ...(game.genres || [])].map((value) => value.trim()).filter(Boolean)));
  el.platform.innerHTML = `<option value="all">All consoles</option>${platforms.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(shortPlatform(value))}</option>`).join("")}`;
  el.region.innerHTML = `<option value="all">All regions</option>${countries.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(regionName(value))}</option>`).join("")}`;
  el.category.innerHTML = `<option value="all">All categories</option>${categories.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join("")}`;
  el.platform.value = state.filters.platform;
  el.region.value = state.filters.region;
  el.category.value = state.filters.category;
  const valueOption = el.sort.querySelector("option[value='value']");
  if (valueOption) {
    valueOption.hidden = !shelfPricesVisible();
    valueOption.disabled = !shelfPricesVisible();
  }
  el.sort.value = state.filters.sort;
  [el.platform, el.region, el.condition, el.category, el.sort].forEach(updateSelectOverflowTitle);
}

function renderLibrary() {
  const pendingCount = state.canEdit ? state.games.filter(isPendingCollectionGame).length : 0;
  state.filters.tab = normalizedShelfTab(pendingCount ? state.filters.tab : "shelf");
  const games = filteredGames();
  el.tabs.hidden = !pendingCount;
  el.tabs.dataset.activeTab = state.filters.tab;
  el.tabs.style.setProperty("--tab-count", "2");
  el.tabs.style.setProperty("--tab-width", "calc((100% - 18px) / 2)");
  el.tabs.style.setProperty("--tab-index", state.filters.tab === "new" ? "1" : "0");
  el.tabs.innerHTML = pendingCount ? `<button class="${state.filters.tab !== "new" ? "active" : ""}" data-shelf-tab="shelf" type="button"><span class="label">Shelf</span></button><button class="${state.filters.tab === "new" ? "active" : ""}" data-shelf-tab="new" type="button"><span class="label">New additions</span><span class="count">${pendingCount}</span></button>` : "";
  el.count.textContent = `${games.length} ${games.length === 1 ? "game" : "games"}`;
  el.shelf.classList.toggle("list-view", state.viewMode === "list");
  el.shelf.innerHTML = "";
  if (state.viewMode === "list") {
    el.shelf.innerHTML = games.map(gameRow).join("");
    el.shelf.querySelectorAll(".game-row-cover").forEach(bindRowCoverFrame);
    requestAnimationFrame(updateShelfRowTitleOverflow);
  } else {
    const fragment = document.createDocumentFragment();
    games.forEach((game, index) => fragment.appendChild(gameCard(game, { imagePriority: index < 6 ? "eager" : "lazy" })));
    el.shelf.appendChild(fragment);
  }
  el.empty.hidden = games.length > 0;
}

function normalizedShelfTab(tab) {
  return tab === "new" ? "new" : "shelf";
}

function setShelfTab(tab) {
  const next = normalizedShelfTab(tab);
  if (state.filters.tab === next) return;
  state.filters.tab = next;
  renderLibrary();
}

function handleShelfSwipeStart(event) {
  if (!window.matchMedia("(max-width: 760px)").matches || el.tabs.hidden) return;
  const touch = event.changedTouches?.[0];
  if (!touch) return;
  state.shelfSwipeStart = { x: touch.clientX, y: touch.clientY };
}

function handleShelfSwipeEnd(event) {
  const start = state.shelfSwipeStart;
  state.shelfSwipeStart = null;
  if (!start || !window.matchMedia("(max-width: 760px)").matches || el.tabs.hidden) return;
  const touch = event.changedTouches?.[0];
  if (!touch) return;
  const dx = touch.clientX - start.x;
  const dy = touch.clientY - start.y;
  if (Math.abs(dx) < 34 || Math.abs(dx) < Math.abs(dy) * 1.15) return;
  const tabs = ["shelf", "new"];
  const current = normalizedShelfTab(state.filters.tab);
  const index = tabs.indexOf(current);
  const next = dx < 0 ? tabs[index + 1] : tabs[index - 1];
  if (next) setShelfTab(next);
}

function updateShelfRowTitleOverflow() {
  el.shelf.querySelectorAll(".game-row-identity strong").forEach((title) => title.classList.toggle("is-overflowing", title.scrollWidth > title.clientWidth + 1));
}

function filteredGames() {
  return visibleShelfGames().filter((game) => {
    const haystack = normalizeSearchText(`${game.title} ${game.platform} ${game.publisher} ${game.developer} ${game.genre} ${game.notes} ${(game.tags || []).join(" ")} ${(game.owners || []).join(" ")}`);
    return !game.deletedAt
      && (state.filters.platform === "all" || game.platform === state.filters.platform)
      && (state.filters.region === "all" || game.country === state.filters.region)
      && conditionMatches(game, state.filters.condition)
      && (state.filters.category === "all" || [...String(game.genre || "").split(","), ...(game.genres || [])].map((value) => value.trim()).includes(state.filters.category))
      && (normalizedShelfTab(state.filters.tab) === "new" ? isPendingCollectionGame(game) : !isPendingCollectionGame(game))
      && (!state.filters.query || haystack.includes(state.filters.query));
  }).sort(sorter(state.filters.sort));
}
function isPendingCollectionGame(game) { return Boolean(game?.pendingCollection); }
function visibleShelfGames() { return state.canEdit ? state.games : state.games.filter((game) => !isPendingCollectionGame(game)); }

function gameCard(game, options = {}) {
  const fallbackCover = coverUrl(game.cover || "") || platformFallback(game.platform);
  const cover = fallbackCover;
  const studio = [game.developer, game.publisher && game.publisher !== game.developer ? game.publisher : ""].filter(Boolean).join(" · ");
  const owners = game.owners || [];
  const visibleOwners = visibleShelfCardOwners(owners);
  const ownerClasses = `${(game.owners || []).includes("Judy") ? " owner-card-judy" : ""}${hasJordiToneOwner(game.owners) ? " owner-card-jordi" : ""}`;
  const tags = [...(game.tags || []), game.category && game.category !== "Game" ? game.category : "", ...String(game.genre || "").split(",")].map((tag) => String(tag).trim()).filter((tag, index, list) => tag && normalize(tag) !== "game" && list.indexOf(tag) === index);
  const condition = conditionLabel(game);
  const card = createGameCardShell(document);
  card.dataset.id = game.id;
  card.setAttribute("role", "button"); card.tabIndex = 0;
  card.className += `${cover ? " has-art" : ""}${ownerClasses}`;
  if (cover) {
    card.style.setProperty("--card-art", `url("${escapeCss(cover)}")`);
    bindActivityCardParallax(card);
  }
  card.querySelector(".card-trailer")?.remove(); card.querySelector(".trailer-toggle")?.remove();
  const image = card.querySelector(".cover-button img"); image.src = cover; image.dataset.coverFallback = fallbackCover; image.alt = `${game.title} cover`; image.loading = options.imagePriority || "lazy"; image.fetchPriority = options.imagePriority === "eager" ? "high" : "low"; image.decoding = "async"; bindCoverFrame(image);
  card.querySelector(".cover-button").dataset.action = "details";
  const title = card.querySelector("h3"); title.textContent = game.title; title.classList.toggle("owner-judy", owners.includes("Judy")); title.classList.toggle("owner-jordi", hasJordiToneOwner(owners));
  card.querySelector(".title-owners").innerHTML = visibleOwners.map(ownerBadge).join("");
  const edit = card.querySelector(".edit-action"); edit.dataset.action = "edit";
  card.querySelector(".studio-line").textContent = studio || game.genre || "Physical edition";
  card.querySelector(".meta").innerHTML = `<span class="region-flag" title="${escapeHtml(game.country)}">${flagIcon(game.country)}</span>${platformBadge(game.platform)}${conditionBadge(condition)}${shelfProgressPill(game)}`;
  card.querySelector(".play-dates").remove();
  card.querySelector(".chips").innerHTML = tags.map((tag) => `<span class="chip genre">${escapeHtml(tag)}</span>`).join("");
  card.querySelector(".card-trophies").remove();
  card.querySelector(".card-actions").innerHTML = isPendingCollectionGame(game) ? `<button class="primary-button add-collection-action editor-only" data-action="add-collection" type="button">Add to Collection</button><button class="danger-button icon-only-button shelf-card-delete-action editor-only" data-action="delete" type="button" title="Delete" aria-label="Delete">${trashIcon()}</button>` : `<button class="danger-button icon-only-button shelf-card-delete-action editor-only" data-action="delete" type="button" title="Delete" aria-label="Delete">${trashIcon()}</button>`;
  card.querySelector(".prices").remove();
  const note = card.querySelector(".notes"); note.textContent = game.notes || ""; note.classList.add("shelf-card-notes"); note.hidden = !game.notes;
  if (game.description) note.insertAdjacentHTML("afterend", `<p class="shelf-card-description">${escapeHtml(game.description)}</p>`);
  return card;
}

function gameRow(game) {
  const cover = coverUrl(game.cover || "") || platformFallback(game.platform);
  const studio = [game.developer, game.publisher && game.publisher !== game.developer ? game.publisher : ""].filter(Boolean).join(" · ");
  const owners = game.owners || [];
  const visibleOwners = visibleShelfCardOwners(owners);
  const ownerClasses = `${owners.includes("Judy") ? " owner-card-judy" : ""}${hasJordiToneOwner(owners) ? " owner-card-jordi" : ""}`;
  const tags = [...(game.tags || []), game.category && game.category !== "Game" ? game.category : "", ...String(game.genre || "").split(",")].map((tag) => String(tag).trim()).filter((tag, index, list) => tag && normalize(tag) !== "game" && list.indexOf(tag) === index);
  const description = game.description || "";
  const actions = isPendingCollectionGame(game) ? `<button class="primary-button add-collection-action" data-action="add-collection" type="button">Add to Collection</button><button class="icon-button danger-button row-delete-action" data-action="delete" type="button" title="Delete" aria-label="Delete">${trashIcon()}</button>` : `<button class="icon-button row-edit-action" data-action="edit" type="button" title="Edit" aria-label="Edit">${pencilIcon()}</button><button class="icon-button danger-button row-delete-action" data-action="delete" type="button" title="Delete" aria-label="Delete">${trashIcon()}</button>`;
  return `<article class="game-row${ownerClasses}" data-id="${escapeHtml(game.id)}" role="button" tabindex="0" aria-label="${escapeHtml(`Open ${game.title}`)}"><span class="game-row-cover-wrap"><img class="game-row-cover" src="${escapeHtml(cover)}" alt="" loading="lazy" decoding="async"><img class="game-row-cover-preview" src="${escapeHtml(cover)}" alt="" loading="lazy" decoding="async" aria-hidden="true"></span><div class="game-row-identity"><strong class="${owners.includes("Judy") ? "owner-judy" : ""} ${hasJordiToneOwner(owners) ? "owner-jordi" : ""}">${escapeHtml(game.title)}</strong>${studio ? `<span>${escapeHtml(studio)}</span>` : ""}</div><div class="game-row-core"><span class="region-flag" title="${escapeHtml(game.country)}">${flagIcon(game.country)}</span>${platformBadge(game.platform)}${conditionBadge(conditionLabel(game))}${visibleOwners.map(ownerBadge).join("")}${shelfProgressPill(game)}</div><div class="game-row-tags">${tags.map((tag) => `<span class="chip genre">${escapeHtml(tag)}</span>`).join("")}</div>${description ? `<div class="game-row-description shelf-row-description">${escapeHtml(description)}</div>` : ""}<div class="game-row-actions">${actions}</div></article>`;
}

function visibleShelfCardOwners(owners = []) {
  const defaultOwner = state.gamelistSettings.defaultOwner || "Xavi";
  return owners.filter((owner) => owner !== defaultOwner);
}

function conditionBadge(condition) { const tone = condition === "Complete +" ? "complete-plus" : normalize(condition).replace(/ /g, "-"); return `<span class="condition-pill condition-${tone}"><img src="assets/platforms/disk.png" alt="" width="18" height="18"><span>${escapeHtml(condition)}</span></span>`; }

function handleShelfClick(event) {
  const card = event.target.closest("[data-id]");
  const action = event.target.closest("[data-action]")?.dataset.action;
  if (!card) return;
  const game = state.games.find((item) => item.id === card.dataset.id);
  if (!game) return;
  if (action === "edit") state.canEdit ? openEditor(game) : openAuth();
  else if (action === "add-collection") state.canEdit ? openEditor(game) : openAuth();
  else if (action === "delete") state.canEdit ? deleteGame(game) : openAuth();
  else openDetails(game);
}

function openDetails(game) {
  el.detailDialog.dataset.id = game.id;
  el.detailDialog.dataset.projection = game._gamelistProjection ? "true" : "false";
  el.detailTitle.textContent = game.title;
  el.detailTitle.classList.toggle("owner-judy", (game.owners || []).includes("Judy"));
  el.detailTitle.classList.toggle("owner-jordi", hasJordiToneOwner(game.owners));
  el.detailStudio.textContent = [game.developer, game.publisher && game.publisher !== game.developer ? game.publisher : ""].filter(Boolean).join(" · ");
  el.detailMeta.innerHTML = `${game.country ? `<span class="region-flag" title="${escapeHtml(game.country)}">${flagIcon(game.country)}</span>` : ""}${platformBadge(game.platform)}`;
  const fallbackCover = coverUrl(game.cover || "") || platformFallback(game.platform);
  el.detailCover.src = fallbackCover;
  el.detailCover.dataset.coverFallback = fallbackCover;
  el.detailCover.parentElement.classList.remove("has-wrap");
  el.detailCover.alt = `${game.title} cover`;
  bindCoverFrame(el.detailCover);
  const detailTags = [...(game.tags || []), game.category && game.category !== "Game" ? game.category : "", ...String(game.genre || "").split(",")].map((value) => String(value).trim()).filter((value, index, list) => value && normalize(value) !== "game" && list.indexOf(value) === index);
  el.detailChips.innerHTML = `${(game.owners || []).map(ownerBadge).join("")}${detailTags.map((value) => `<span class="chip genre">${escapeHtml(value)}</span>`).join("")}`;
  el.detailDates.innerHTML = `${game.releaseDate ? `<span class="release-pill history-date-pill"><small>Released</small><strong>${escapeHtml(formatDate(game.releaseDate))}</strong></span>` : ""}${game.createdAt ? `<span class="history-pill history-date-pill"><small>Added</small><strong>${escapeHtml(formatDate(game.createdAt))}</strong></span>` : ""}`;
  el.detailDates.hidden = !el.detailDates.innerHTML;
  el.detailNote.hidden = !game.notes;
  el.detailNote.textContent = game.notes || "";
  el.detailDescription.textContent = game.description || "";
  el.detailDescription.hidden = !game.description;
  el.detailPricePanel.classList.remove("is-collapsed");
  el.detailPriceToggle.setAttribute("aria-expanded", "true");
  el.detailCondition.innerHTML = ["game", "manual", "box", "other", "sealed"].map((key) => `<label class="check-filter toggle-check detail-condition-check condition-${key}"><input type="checkbox" ${conditionValue(game, key) ? "checked" : ""} disabled><span>${escapeHtml(key[0].toUpperCase() + key.slice(1))}</span></label>`).join("");
  el.detailConditionPanel.hidden = Boolean(game._gamelistProjection);
  const links = websiteLinks(game);
  el.detailLinks.innerHTML = storeLinkButtons(game, links);
  const guides = activityGuideLinks(game);
  el.detailGuides.hidden = !guides.length;
  el.detailGuideLinks.innerHTML = guides.join("");
  const showPrices = shelfPricesVisible() && !game._gamelistProjection;
  el.detailStorePricePanel.hidden = !showPrices;
  el.detailPricePanel.hidden = !showPrices;
  if (showPrices) {
    renderSavedStorePrices(game);
    renderPriceDetails(game);
  } else {
    el.detailStorePrices.innerHTML = "";
    el.detailPriceSummary.innerHTML = "";
    el.detailPriceHeadline.textContent = "";
    el.detailPriceGraph.innerHTML = "";
  }
  loadShelfTrophies(game);
  openDialog(el.detailDialog);
}

function openEditor(game = null) {
  if (!state.canEdit) return openAuth();
  state.editingId = game?.id || "";
  state.lookupResults = [];
  el.lookupResults.classList.remove("loaded");
  el.lookupResults.innerHTML = "";
  el.lookupInput.value = game?.title || "";
  const values = game || { platform: "Nintendo Switch", country: "United Kingdom", game: true, box: true, manual: true };
  for (const [key, input] of Object.entries(el.fields)) input.value = values[key] ?? "";
  el.fields.owners.value = (values.owners || []).join(", ");
  el.fields.websites.value = websiteLinks(values).join(", ");
  Object.entries(el.conditionFields).forEach(([key, input]) => { input.checked = conditionValue(values, key); });
  syncConditionInputs();
  el.addForm.querySelector(".modal-head h2").textContent = game?.pendingCollection ? "Add to Collection" : game ? "Edit Game" : "Add Game";
  el.addForm.querySelector("button[type='submit']").textContent = game?.pendingCollection ? "Add to Collection" : game ? "Save changes" : "Add to Shelf";
  el.editDelete.hidden = !game;
  openDialog(el.addDialog);
}

async function deleteCurrentEditedGame() {
  const game = state.games.find((item) => item.id === state.editingId);
  if (!game) return;
  await deleteGame(game);
}

async function lookupGame() {
  const query = el.lookupInput.value.trim() || el.fields.title.value.trim();
  if (!query) return;
  el.lookupButton.disabled = true;
  el.lookupButton.classList.add("is-loading");
  el.lookupButton.title = "Fetching game information";
  el.lookupResults.classList.remove("loaded");
  el.lookupResults.innerHTML = `<div class="empty">Searching game data and PriceCharting editions…</div>`;
  el.lookupResults.classList.add("loaded");
  try {
    const directUrl = priceChartingPageUrl(query);
    if (directUrl) {
      const physical = await fetchPhysicalMetadata(el.fields.title.value.trim(), { url: directUrl });
      if (!physical) throw new Error("PriceCharting edition unavailable");
      el.fields.platform.value = bestCollectionPlatform([physical.consoleName], el.fields.platform.value);
      applyPriceChartingRegion(physical.consoleName);
      applyPhysicalMetadata(physical);
      renderPhysicalSelection(physical);
      return;
    }
    const [gameDataResult, physicalData] = await Promise.allSettled([
      fetchGameMetadataData(query),
      fetchPhysicalSearchData(query),
    ]);
    const gameData = gameDataResult.status === "fulfilled" ? gameDataResult.value : { results: [] };
    const gameResults = (gameData.results || []).slice(0, 6).map((result) => ({ ...result, lookupSource: "game" }));
    state.metadataLookupResults = gameResults;
    const physicalResults = (physicalData.status === "fulfilled" ? physicalData.value.results || [] : []).slice(0, 8).map((result) => ({ ...result, title: result.productName, platform: result.consoleName, lookupSource: "pricecharting" }));
    state.lookupResults = physicalResults.length ? physicalResults : gameResults;
    if (physicalResults[0]) {
      await prefillPhysicalResult(physicalResults[0]);
      applyGameMetadata(bestGameMetadata(physicalResults[0].productName || query));
    }
    renderShelfLookupResults();
  } catch {
    el.lookupResults.innerHTML = `<div class="empty">Lookup is unavailable right now. Manual entry still works.</div>`;
  } finally {
    requestAnimationFrame(() => el.lookupResults.classList.add("loaded"));
    el.lookupButton.disabled = false;
    el.lookupButton.classList.remove("is-loading");
    el.lookupButton.title = "Fetch info";
  }
}

async function fetchGameMetadataData(query) {
  for (const title of gameMetadataQueries(query)) {
    const response = await fetch(`/api/search?q=${encodeURIComponent(title)}`);
    const data = response.ok ? await response.json() : { results: [] };
    if ((data.results || []).length) return data;
  }
  return { results: [] };
}

function gameMetadataQueries(query) {
  const plain = String(query || "").trim();
  const withoutBrackets = plain.replace(/\s*[\[(][^\])]*(?:edition|collector|collectors|limited|special|deluxe|agent|day one|steelbook)[^\])]*[\])]\s*/gi, " ").trim();
  const withoutEditionSuffix = withoutBrackets.replace(/\s+(?:special|collector'?s?|limited|deluxe|complete|ultimate|definitive|premium|gold|standard|day one|steelbook)(?:\s+\w+){0,3}\s+edition\s*$/i, "").trim();
  const normalized = normalize(plain);
  return [...new Set([plain, withoutBrackets, withoutEditionSuffix, normalized].filter(Boolean))];
}

async function fetchPhysicalSearchData(query) {
  for (const title of physicalLookupQueries(query)) {
    const params = new URLSearchParams({ mode: "search", title, platform: shortPlatform(el.fields.platform.value), region: el.fields.country.value, currency: state.gamelistSettings.currency || "EUR" });
    const response = await fetch(`/api/collection-price?${params}`);
    const data = response.ok ? await response.json() : { results: [] };
    if ((data.results || []).length) return data;
  }
  return { results: [] };
}

function physicalLookupQueries(query) {
  const values = [query, normalize(query), normalize(query).replace(/\bcollectors\b/g, "collector").replace(/\bspecial\b/g, "deluxe")];
  return [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))];
}

function renderShelfLookupResults() {
  el.lookupResults.classList.remove("loaded");
  if (!state.lookupResults.length) {
    el.lookupResults.innerHTML = `<div class="empty">No close match found. You can still enter the details manually.</div>`;
    requestAnimationFrame(() => el.lookupResults.classList.add("loaded"));
    return;
  }
  el.lookupResults.innerHTML = state.lookupResults.map((result, index) => {
    const physical = result.lookupSource === "pricecharting";
    const platforms = (result.platforms || [result.platform]).filter(Boolean);
    const image = coverUrl((physical ? result.image : result.cover) || "");
    return `<div class="lookup-result"><img src="${escapeHtml(image)}" alt="" ${image ? "" : "hidden"}><div><strong>${escapeHtml(result.title || "Untitled game")}</strong><p>${escapeHtml(platforms.join(" · ") || "Platform unknown")}</p></div><button class="ghost-button" type="button" data-result-index="${index}">Use</button></div>`;
  }).join("");
  requestAnimationFrame(() => el.lookupResults.classList.add("loaded"));
}

async function chooseLookupResult(event) {
  const button = event.target.closest("[data-result-index]");
  if (!button) return;
  const result = state.lookupResults[Number(button.dataset.resultIndex)];
  if (!result) return;
  if (result.lookupSource === "pricecharting") {
    const physical = await prefillPhysicalResult(result);
    applyGameMetadata(bestGameMetadata(result.productName));
    renderPhysicalSelection(physical || result);
    return;
  }
  el.fields.title.value = result.title || el.fields.title.value;
  el.fields.platform.value = bestCollectionPlatform(result.platforms || [result.platform], el.fields.platform.value);
  el.fields.publisher.value = result.publisher || "";
  el.fields.developer.value = result.developer || "";
  el.fields.genre.value = (result.genres || []).join(", ");
  el.fields.cover.value = result.cover || "";
  el.fields.releaseDate.value = result.releaseDate || "";
  el.fields.websites.value = Object.values(result.storeLinks || {}).filter(Boolean).join(", ");
  el.fields.description.value = result.description || "";
  const physical = await fetchPhysicalMetadata(result.title);
  if (physical) applyPhysicalMetadata(physical);
  renderPhysicalSelection(physical, result.title);
}

function bestGameMetadata(title) {
  const wanted = normalizeSearchText(title || "");
  return state.metadataLookupResults.find((result) => normalizeSearchText(result.title || "") === wanted)
    || state.metadataLookupResults.find((result) => wanted && normalizeSearchText(result.title || "").includes(wanted.split(" ")[0] || wanted))
    || state.metadataLookupResults[0]
    || null;
}

function applyGameMetadata(result) {
  if (!result) return;
  if (result.publisher && !el.fields.publisher.value) el.fields.publisher.value = result.publisher;
  if (result.developer && !el.fields.developer.value) el.fields.developer.value = result.developer;
  if ((result.genres || []).length && !el.fields.genre.value) el.fields.genre.value = result.genres.join(", ");
  if (result.releaseDate && !el.fields.releaseDate.value) el.fields.releaseDate.value = result.releaseDate;
  if (result.description && !el.fields.description.value) el.fields.description.value = result.description;
  const links = Object.values(result.storeLinks || {}).filter(Boolean);
  if (links.length) el.fields.websites.value = [...new Set([...splitValues(el.fields.websites.value), ...links])].join(", ");
}

async function prefillPhysicalResult(result) {
  el.fields.title.value = result.productName || el.fields.title.value;
  el.fields.platform.value = bestCollectionPlatform([result.consoleName], el.fields.platform.value);
  applyPriceChartingRegion(result.consoleName);
  applyPriceChartingSearchResult(result);
  const physical = await fetchPhysicalMetadata(result.productName, { id: result.productId, url: result.url });
  if (physical) applyPhysicalMetadata(physical);
  return physical;
}

async function fetchPhysicalMetadata(title, options = {}) {
  try {
    const params = new URLSearchParams({ title, platform: shortPlatform(el.fields.platform.value), region: el.fields.country.value, currency: state.gamelistSettings.currency || "EUR" });
    if (el.fields.upc.value.trim()) params.set("upc", el.fields.upc.value.trim());
    const enteredPriceCharting = el.fields.pricechartingId.value.trim();
    const requestedUrl = options.url || priceChartingPageUrl(enteredPriceCharting);
    if (requestedUrl) params.set("url", requestedUrl);
    else if (options.id || enteredPriceCharting) params.set("id", options.id || enteredPriceCharting);
    const response = await fetch(`/api/collection-price?${params}`);
    const data = await response.json();
    return response.ok && !data.error ? data : null;
  } catch { return null; }
}

function applyPhysicalMetadata(data) {
  if (data.productName && !el.fields.title.value) el.fields.title.value = data.productName;
  if (data.releaseDate) el.fields.releaseDate.value = data.releaseDate;
  if (data.upc) el.fields.upc.value = data.upc;
  if (data.sku) el.fields.sku.value = data.sku;
  if (data.asin) el.fields.asin.value = data.asin;
  if (data.epid) el.fields.epid.value = data.epid;
  if (data.productId) el.fields.pricechartingId.value = data.productId;
  if (data.genre && !el.fields.genre.value) el.fields.genre.value = data.genre;
  if (data.publisher && !el.fields.publisher.value) el.fields.publisher.value = data.publisher;
  if (data.developer && !el.fields.developer.value) el.fields.developer.value = data.developer;
  const estimate = estimatedPhysicalValue(data);
  if (estimate != null) el.fields.price.value = Number(estimate).toFixed(2);
  if (data.productUrl) el.fields.websites.value = [...new Set([...splitValues(el.fields.websites.value), data.productUrl])].join(", ");
  if (data.image) el.fields.cover.value = data.image;
}

function applyPriceChartingSearchResult(result) {
  if (result.productId) el.fields.pricechartingId.value = result.productId;
  const estimate = estimatedPhysicalValue(result);
  if (estimate != null) el.fields.price.value = Number(estimate).toFixed(2);
  if (result.url) el.fields.websites.value = [...new Set([...splitValues(el.fields.websites.value), result.url])].join(", ");
  if (result.image) el.fields.cover.value = result.image;
}

function estimatedPhysicalValue(data) {
  const prices = data?.prices || {};
  if (el.conditionFields.sealed.checked) return prices.sealed ?? prices.complete ?? prices.loose ?? data?.mainValue ?? null;
  if (el.conditionFields.game.checked && el.conditionFields.box.checked) return prices.complete ?? prices.loose ?? prices.sealed ?? data?.mainValue ?? null;
  return prices.loose ?? prices.complete ?? prices.sealed ?? data?.mainValue ?? null;
}

function renderPhysicalSelection(physical, fallbackTitle = "") {
  el.lookupResults.classList.add("loaded");
  el.lookupResults.innerHTML = `<div class="lookup-selected physical-lookup-selected"><img src="${physical?.image ? escapeHtml(physical.image) : physical ? "https://www.pricecharting.com/images/favicon.ico" : "assets/Icon_shelf.png"}" alt=""><span>${physical ? `Using ${escapeHtml(physical.productName || fallbackTitle)}${physical.consoleName ? ` · ${escapeHtml(physical.consoleName)}` : ""}` : "Game information loaded."}</span></div>`;
}

function priceChartingPageUrl(value) { const match = String(value || "").trim().match(/^https:\/\/www\.pricecharting\.com\/(?:[a-z]{2}\/)?game\/[^?#]+/i); return match?.[0] || ""; }
function applyPriceChartingRegion(consoleName) { const value = normalize(consoleName); if (value.startsWith("jp ")) el.fields.country.value = "Japan"; else if (value.startsWith("pal ") && !["United Kingdom", "Spain", "France", "Germany", "Europe", "Australia"].includes(el.fields.country.value)) el.fields.country.value = "Europe"; else if (!value.startsWith("pal ") && !value.startsWith("jp ") && ["Japan", "Europe"].includes(el.fields.country.value)) el.fields.country.value = "United States of America"; }

async function saveEditor(event) {
  event.preventDefault();
  if (!state.canEdit) return;
  const existing = state.games.find((game) => game.id === state.editingId);
  const game = {
    ...(existing || {}),
    id: existing?.id || `shelf-${crypto.randomUUID()}`,
    title: el.fields.title.value.trim(), platform: el.fields.platform.value, country: el.fields.country.value,
    region: regionFor(el.fields.country.value), ...conditionFromInputs(),
    price: numberOrNull(el.fields.price.value), publisher: el.fields.publisher.value.trim(), developer: el.fields.developer.value.trim(),
    genre: el.fields.genre.value.trim(), cover: rawCoverUrl(el.fields.cover.value.trim()), notes: el.fields.notes.value.trim(),
    owners: splitValues(el.fields.owners.value).map(canonicalOwner).filter(Boolean), category: existing?.category || "Game",
    releaseDate: el.fields.releaseDate.value, trophyName: el.fields.trophyName.value.trim(), websites: splitValues(el.fields.websites.value),
    upc: el.fields.upc.value.trim(), sku: el.fields.sku.value.trim(), asin: el.fields.asin.value.trim(), epid: el.fields.epid.value.trim(),
    pricechartingId: el.fields.pricechartingId.value.trim(), description: el.fields.description.value.trim(),
    coverProject: el.fields.coverProject.value.trim(),
    pendingCollection: false,
    createdAt: existing?.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString(), recordType: "Owned", releaseType: existing?.releaseType || "Official",
  };
  if (!game.title) return;
  if (existing?.sourceRecord) state.overrides[game.id] = stripRuntimeFields(game);
  else {
    const index = state.additions.findIndex((item) => item.id === game.id);
    if (index >= 0) state.additions[index] = stripRuntimeFields(game);
    else state.additions.unshift(stripRuntimeFields(game));
  }
  await persistShelf();
  rebuildGames();
  renderAll();
  closeDialog(el.addDialog);
}

async function resetGame(game) {
  delete state.overrides[game.id];
  await persistShelf();
  rebuildGames();
  renderAll();
  closeDialog(el.detailDialog);
  closeDialog(el.addDialog);
}

async function deleteGame(game) {
  if (!confirmGameDelete(game?.title)) return false;
  if (game.sourceRecord) state.overrides[game.id] = { ...(state.overrides[game.id] || {}), deletedAt: new Date().toISOString() };
  else state.additions = state.additions.filter((item) => item.id !== game.id);
  await persistShelf();
  rebuildGames();
  renderAll();
  closeDialog(el.detailDialog);
  closeDialog(el.addDialog);
  return true;
}

async function persistShelf() {
  const payload = { games: state.additions, overrides: state.overrides, layout: state.layout };
  localStorage.setItem(LOCAL_DRAFT_KEY, JSON.stringify(payload));
  try {
    const password = sessionStorage.getItem(`${SESSION_KEY}:password`) || "";
    const response = await fetch("/api/shelf", { method: "PUT", headers: { "Content-Type": "application/json", "x-edit-password": password }, body: JSON.stringify(payload) });
    if (!response.ok) throw new Error("Save failed");
    const data = await response.json();
    state.updatedAt = data.updatedAt || new Date().toISOString();
    localStorage.removeItem(LOCAL_DRAFT_KEY);
  } catch {
    state.updatedAt = new Date().toISOString();
  }
}

async function toggleEditMode() {
  if (!state.canEdit) return openAuth();
  await fetch("/api/auth", { method: "DELETE" }).catch(() => {});
  state.canEdit = false;
  sessionStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(`${SESSION_KEY}:password`);
  signalAuthChange();
  renderAll();
}

function openAuth() {
  el.authPassword.value = "";
  el.authError.hidden = true;
  openDialog(el.authDialog);
  requestAnimationFrame(() => el.authPassword.focus());
}

async function submitAuth(event) {
  event.preventDefault();
  const response = await fetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: el.authPassword.value }) }).catch(() => null);
  if (!response?.ok) { el.authError.hidden = false; return; }
  state.canEdit = true;
  sessionStorage.setItem(SESSION_KEY, "true");
  sessionStorage.setItem(`${SESSION_KEY}:password`, el.authPassword.value);
  signalAuthChange();
  closeDialog(el.authDialog);
  renderAll();
}

async function refreshSharedAuth() {
  const active = await fetch("/api/auth", { cache: "no-store" }).then((response) => response.ok).catch(() => state.canEdit);
  if (active === state.canEdit) return;
  state.canEdit = active;
  if (active) sessionStorage.setItem(SESSION_KEY, "true");
  else sessionStorage.removeItem(SESSION_KEY);
  renderAll();
}

function signalAuthChange() { localStorage.setItem("gamelist-editor-signal", String(Date.now())); }

function openLayout() {
  renderLayoutEditor();
  openDialog(el.layoutDialog);
}

function renderLayoutEditor() {
  el.layoutList.className = "settings-layout";
  el.layoutList.innerHTML = [
    ...state.layout.order.map((key, index) => settingsLayoutCard(key, index)),
    `<div class="settings-preference-row">${settingsSelectCard("theme", "Theme", "shelfSettingsTheme", [{ value: "shabii", label: "Shabii" }, { value: "kash", label: "Kash" }])}${settingsSelectCard("order", "Default order", "shelfSettingsDefaultOrder", [{ value: "added", label: "Last added" }, { value: "title", label: "Name" }, { value: "platform", label: "Platform" }, { value: "region", label: "Region" }, { value: "value", label: "Value" }])}${settingsShelfSyncCard()}${settingsShelfPricesCard()}</div>`,
  ].join("");
  el.settingsTheme = document.querySelector("#shelfSettingsTheme");
  el.settingsDefaultOrder = document.querySelector("#shelfSettingsDefaultOrder");
  const settings = normalizePriceSettings(state.gamelistSettings);
  el.settingsTheme.value = THEMES[state.gamelistSettings.theme] ? state.gamelistSettings.theme : "shabii";
  el.settingsDefaultOrder.value = shelfSortForDefault(state.gamelistSettings.shelfDefaultOrder ?? state.gamelistSettings.defaultOrder);
  el.settingsCurrency.value = settings.currency;
  el.settingsRegion.value = settings.region;
  el.settingsPsnUser.value = state.gamelistSettings.psnUser || "";
  el.settingsMicrosoftUser.value = state.gamelistSettings.microsoftUser || "";
  el.settingsSteamUser.value = state.gamelistSettings.steamUser || "";
  el.settingsDefaultOwner.value = state.gamelistSettings.defaultOwner || "";
  el.settingsStores.innerHTML = STORE_OPTIONS.map((store) => `<label class="check-filter toggle-check settings-store-check"><input type="checkbox" value="${escapeHtml(store)}" ${settings.stores.includes(store) ? "checked" : ""}><span>${escapeHtml(store)}</span></label>`).join("");
  el.settingsStores.querySelectorAll("input").forEach((input) => input.addEventListener("change", () => {
    const checked = [...el.settingsStores.querySelectorAll("input:checked")];
    if (checked.length > MAX_PRICE_STORES) input.checked = false;
  }));
  el.settingsTheme.onchange = () => { state.gamelistSettings.theme = el.settingsTheme.value; applyTheme(); };
}

function settingsLayoutCard(key, index) {
  const visible = !state.layout.hidden.includes(key);
  const wire = { latestFinished: "latest-finished", kpis: "highlights", filters: "search", library: "list" }[key] || key;
  return `<article class="settings-layout-card ${visible ? "" : "is-hidden-section"}" data-layout-key="${key}"><div class="settings-wire wire-${wire}" aria-hidden="true">${Array.from({ length: 6 }, () => "<span></span>").join("")}</div><strong>${escapeHtml(MODULE_NAMES[key])}</strong><div class="settings-layout-actions"><button class="icon-button" type="button" data-layout-move="-1" ${index === 0 ? "disabled" : ""} title="Move up" aria-label="Move ${escapeHtml(MODULE_NAMES[key])} up">↑</button><button class="icon-button" type="button" data-layout-move="1" ${index === state.layout.order.length - 1 ? "disabled" : ""} title="Move down" aria-label="Move ${escapeHtml(MODULE_NAMES[key])} down">↓</button><label class="check-filter toggle-check settings-visible-check" title="${visible ? "Visible" : "Hidden"}"><input type="checkbox" data-layout-visible value="${key}" ${visible ? "checked" : ""}><span>${visible ? "Show" : "Hide"}</span></label></div></article>`;
}

function settingsSelectCard(type, title, id, options) {
  return `<article class="settings-layout-card settings-${type === "theme" ? "theme" : "order"}-card"><div class="settings-wire wire-${type}" aria-hidden="true">${Array.from({ length: 3 }, () => "<span></span>").join("")}</div><label class="settings-theme-select"><span>${escapeHtml(title)}</span><select id="${id}">${options.map((option) => `<option value="${option.value}">${escapeHtml(option.label)}</option>`).join("")}</select></label></article>`;
}

function settingsShelfSyncCard() {
  return `<article class="settings-layout-card settings-sync-card"><div class="settings-wire wire-list" aria-hidden="true"><span></span><span></span><span></span></div><label class="check-filter toggle-check settings-visible-check" title="Shelf Sync"><input type="checkbox" id="shelfSettingsSync" ${state.gamelistSettings.shelfSync === false ? "" : "checked"}><span>Shelf Sync</span></label></article>`;
}

function settingsShelfPricesCard() {
  return `<article class="settings-layout-card settings-sync-card"><div class="settings-wire wire-list" aria-hidden="true"><span></span><span></span><span></span></div><label class="check-filter toggle-check settings-visible-check" title="Hide prices"><input type="checkbox" id="shelfSettingsHidePrices" ${state.gamelistSettings.shelfHidePrices ? "checked" : ""}><span>Hide prices</span></label></article>`;
}

function handleLayoutMove(event) {
  const button = event.target.closest("[data-layout-move]");
  const row = button?.closest("[data-layout-key]");
  if (!button || !row) return;
  const from = state.layout.order.indexOf(row.dataset.layoutKey);
  const to = from + Number(button.dataset.layoutMove);
  if (from < 0 || to < 0 || to >= state.layout.order.length) return;
  [state.layout.order[from], state.layout.order[to]] = [state.layout.order[to], state.layout.order[from]];
  renderLayoutEditor();
}

async function saveLayout(event) {
  event.preventDefault();
  state.layout.hidden = LAYOUT_KEYS.filter((key) => !el.layoutList.querySelector(`[data-layout-visible][value="${key}"]`)?.checked);
  localStorage.setItem(LAYOUT_KEY, JSON.stringify(state.layout));
  const stores = [...el.settingsStores.querySelectorAll("input:checked")].map((input) => input.value).filter((store) => STORE_OPTIONS.includes(store)).slice(0, MAX_PRICE_STORES);
  state.gamelistSettings = { ...state.gamelistSettings, theme: el.settingsTheme.value, shelfDefaultOrder: el.settingsDefaultOrder.value, currency: el.settingsCurrency.value, region: el.settingsRegion.value, psnUser: el.settingsPsnUser.value.trim(), microsoftUser: el.settingsMicrosoftUser.value.trim(), steamUser: el.settingsSteamUser.value.trim(), defaultOwner: el.settingsDefaultOwner.value.trim(), stores, storeSettingsVersion: 2, shelfSync: document.querySelector("#shelfSettingsSync")?.checked !== false, shelfHidePrices: Boolean(document.querySelector("#shelfSettingsHidePrices")?.checked) };
  localStorage.setItem("gamelist:settings:v1", JSON.stringify(state.gamelistSettings));
  applyShelfDefaultOrder(state.gamelistSettings.shelfDefaultOrder);
  await Promise.all([persistShelf(), persistGamelistSettings()]);
  applyLayout();
  applyTheme();
  renderAll();
  if (!state.layout.hidden.includes("trophies") && !state.trophyActivity) loadTrophyActivity();
  closeDialog(el.layoutDialog);
}

function normalizePriceSettings(settings = {}) {
  const selectedStores = Array.isArray(settings.stores) ? settings.stores.filter((store) => STORE_OPTIONS.includes(store)) : DEFAULT_PRICE_STORES;
  const stores = settings.storeSettingsVersion === 2 || selectedStores.includes("eBay") ? selectedStores : [...selectedStores, "eBay"];
  return {
    currency: settings.currency === "USD" ? "USD" : "EUR",
    region: ["ES", "US", "UK"].includes(settings.region) ? settings.region : "ES",
    stores: stores.slice(0, MAX_PRICE_STORES),
  };
}

function shelfPricesVisible() {
  return state.gamelistSettings.shelfHidePrices !== true;
}

async function persistGamelistSettings() {
  const password = sessionStorage.getItem(`${SESSION_KEY}:password`) || "";
  const response = await fetch("/api/sync", { method: "PUT", headers: { "Content-Type": "application/json", "x-edit-password": password }, body: JSON.stringify({ settingsOnly: true, settings: state.gamelistSettings }) });
  if (!response.ok) throw new Error("Price settings could not be synced");
}

function applyLayout() {
  const order = new Map(state.layout.order.map((key, index) => [key, index + 1]));
  el.modules.querySelectorAll("[data-module]").forEach((section) => {
    section.style.order = String(order.get(section.dataset.module) ?? 99);
    if (section.dataset.module !== "playing") section.hidden = state.layout.hidden.includes(section.dataset.module);
  });
  syncShelfActivityVisibility();
}

function syncShelfActivityVisibility() {
  el.playingCurrent.hidden = state.layout.hidden.includes("playing") || !el.playingCarousel.children.length;
  el.playingFinished.hidden = state.layout.hidden.includes("latestFinished") || !el.finishedCarousel.children.length;
  el.playingCurrent.closest("[data-module='playing']").hidden = el.playingCurrent.hidden;
  el.playingFinished.closest("[data-module='latestFinished']").hidden = el.playingFinished.hidden;
}

function toggleView() {
  state.viewMode = state.viewMode === "grid" ? "list" : "grid";
  localStorage.setItem(VIEW_KEY, state.viewMode);
  renderChrome();
  renderLibrary();
}

function clearFilters() {
  state.filters = { query: "", platform: "all", region: "all", condition: "all", category: "all", tab: "all", sort: state.filters.sort, direction: state.filters.direction };
  el.search.value = "";
  el.condition.value = "all";
  el.category.value = "all";
  renderFilters();
  renderLibrary();
}

function openDialog(dialog) { dialog.showModal(); document.body.classList.add("dialog-open"); }
function closeDialog(dialog) { if (dialog.open) dialog.close(); document.body.classList.toggle("dialog-open", document.querySelector("dialog[open]") !== null); }

function populateEditorOptions() {
  el.platformOptions.innerHTML = PLATFORM_OPTIONS.map((platform) => `<option value="${platform}">${shortPlatform(platform)}</option>`).join("");
  el.fields.country.innerHTML = COUNTRY_OPTIONS.map(([value, label]) => `<option value="${value}">${label}</option>`).join("");
}

function loadLayout() {
  try {
    const value = JSON.parse(localStorage.getItem(LAYOUT_KEY) || "{}");
    const order = Array.isArray(value.order) ? value.order.filter((key) => DEFAULT_LAYOUT.includes(key)) : [];
    const hasSavedLayout = Array.isArray(value.order);
    return { order: [...order, ...DEFAULT_LAYOUT.filter((key) => !order.includes(key))], hidden: hasSavedLayout && Array.isArray(value.hidden) ? value.hidden.filter((key) => LAYOUT_KEYS.includes(key)) : [...DEFAULT_HIDDEN_MODULES] };
  } catch { return { order: [...DEFAULT_LAYOUT], hidden: [...DEFAULT_HIDDEN_MODULES] }; }
}

function normalizeLayout(value) {
  const order = Array.isArray(value?.order) ? value.order.filter((key) => DEFAULT_LAYOUT.includes(key)) : [];
  const hidden = Array.isArray(value?.hidden) ? value.hidden.filter((key) => LAYOUT_KEYS.includes(key)) : [...DEFAULT_HIDDEN_MODULES];
  return { order: [...order, ...DEFAULT_LAYOUT.filter((key) => !order.includes(key))], hidden };
}

function splitShelfPlayingModules() {
  const playingModule = document.querySelector("[data-module='playing']");
  const finishedSection = document.querySelector("#shelfPlayingFinished");
  if (!playingModule || !finishedSection || finishedSection.closest("[data-module='latestFinished']")) return;
  const finishedModule = document.createElement("section");
  finishedModule.className = playingModule.className;
  finishedModule.dataset.module = "latestFinished";
  finishedModule.hidden = true;
  finishedModule.appendChild(finishedSection);
  playingModule.after(finishedModule);
}

function loadDraft() { try { return JSON.parse(localStorage.getItem(LOCAL_DRAFT_KEY) || "{}"); } catch { return {}; } }
function bindTextureParallax() { if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return; let frame = 0; window.addEventListener("pointermove", (event) => { if (frame) return; frame = requestAnimationFrame(() => { frame = 0; const x = ((event.clientX / window.innerWidth) - .5) * -14; const y = ((event.clientY / window.innerHeight) - .5) * -14; document.documentElement.style.setProperty("--grid-x", `${x.toFixed(2)}px`); document.documentElement.style.setProperty("--grid-y", `${y.toFixed(2)}px`); }); }, { passive: true }); }
function renderGamelistModules() {
  const playing = state.gamelistGames.filter((game) => game.playing && !game.deletedAt).sort(comparePlayingGames);
  const finished = state.gamelistGames.filter((game) => game.completedAt && !game.deletedAt).sort((a, b) => String(b.completedAt).localeCompare(String(a.completedAt)) || String(a.title || "").localeCompare(String(b.title || ""), undefined, { sensitivity: "base" })).slice(0, 10);
  el.playingCarousel.innerHTML = playing.map(gamelistProjectionCard).join("");
  el.finishedCarousel.innerHTML = finished.map(finishedProjectionCard).join("");
  el.playingCarousel.querySelectorAll(".game-card.has-art").forEach(bindActivityCardParallax);
  el.playingCarousel.querySelectorAll(".cover-button img").forEach((image) => { bindCoverFrame(image); image.addEventListener("load", schedulePlayingCardHeightSync, { once: true }); });
  el.playingCarousel.querySelectorAll(".trailer-toggle").forEach((button) => button.addEventListener("click", (event) => { event.stopPropagation(); const card = button.closest(".game-card"); const paused = card.classList.toggle("trailer-user-paused"); button.innerHTML = paused ? playTrailerIcon() : pauseTrailerIcon(); button.title = paused ? "Play trailer" : "Pause trailer"; button.setAttribute("aria-label", button.title); scheduleShelfTrailerUpdate(); }));
  el.playingCarousel.querySelectorAll(".edit-action").forEach((button) => button.addEventListener("click", (event) => { event.stopPropagation(); const game = state.gamelistGames.find((item) => item.id === button.closest("[data-gamelist-id]")?.dataset.gamelistId); if (!state.canEdit) openAuth(); else if (game) openGamelistDetails(game); }));
  [...el.playingCarousel.querySelectorAll("[data-gamelist-id]"), ...el.finishedCarousel.querySelectorAll("[data-gamelist-id]")].forEach((card) => { const open = (event) => { if (event?.target.closest("a,.edit-action,.trailer-toggle")) return; const game = state.gamelistGames.find((item) => item.id === card.dataset.gamelistId); if (game) openGamelistDetails(game); }; card.addEventListener("click", open); card.addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); open(); } }); });
  syncShelfActivityVisibility();
  el.playingCount.textContent = `Playing ${playing.length} ${playing.length === 1 ? "game" : "games"}`;
  schedulePlayingCardHeightSync();
  requestAnimationFrame(() => { updatePlayingControls(); updateFinishedControls(); scheduleShelfTrailerUpdate(); });
}
function projectedDetailGame(game) { const shelf = state.games.find((item) => item.gamelistId === game.id || game.shelfId === item.id); return { ...(shelf || {}), ...game, country: shelf?.country || "", genre: shelf?.genre || (game.genres || []).join(", "), category: shelf?.category || "", notes: shelf?.notes || game.notes || "", _gamelistProjection: true }; }
function activityGuideLinks(game) { return guideLinksMarkup(game, { title: game.title, playstation: ["PS4", "PS5"].includes(shortPlatform(game.platform || "").toUpperCase()), escape: escapeHtml }); }
function openGamelistDetails(sourceGame) {
  const game = projectedDetailGame(sourceGame);
  state.gamelistDetailGame = game;
  el.detailDialog.dataset.id = game.id;
  el.detailDialog.dataset.projection = "true";
  const cover = coverUrl(game.cover || "") || platformFallback(game.platform);
  const owners = Array.isArray(game.owners) && game.owners.length ? game.owners : [state.gamelistSettings.defaultOwner || "Xavi"];
  el.detailTitle.textContent = game.title;
  el.detailTitle.classList.toggle("owner-judy", owners.includes("Judy"));
  el.detailTitle.classList.toggle("owner-jordi", hasJordiToneOwner(owners));
  el.detailStudio.textContent = [game.developer, game.publisher].filter(Boolean).join(" / ");
  el.detailStudio.hidden = !el.detailStudio.textContent;
  el.detailMeta.innerHTML = projectionMeta(game, { includePast: true });
  el.detailDates.innerHTML = `${game.startedAt ? `<span class="history-pill history-date-pill"><small>Started</small><strong>${escapeHtml(formatShortDate(game.startedAt))}</strong></span>` : ""}${game.completedAt ? `<span class="history-pill history-date-pill"><small>Finished</small><strong>${escapeHtml(formatLongDate(game.completedAt))}</strong></span>` : ""}${finishedDurationText(game.startedAt, game.completedAt) ? `<span class="history-pill history-date-pill"><small>Time</small><strong>${escapeHtml(finishedDurationText(game.startedAt, game.completedAt))}</strong></span>` : ""}`;
  el.detailDates.hidden = !el.detailDates.innerHTML;
  el.detailChips.innerHTML = (game.genres || []).slice(0, 4).map((genre) => `<span class="chip genre">${escapeHtml(genre)}</span>`).join("");
  el.detailCover.src = cover;
  el.detailCover.hidden = !cover;
  el.detailCover.alt = cover ? `${game.title} cover` : "";
  bindCoverFrame(el.detailCover);
  el.detailDescription.textContent = game.description || "No description yet.";
  el.detailDescription.hidden = false;
  el.detailPricePanel.classList.remove("is-collapsed");
  el.detailPriceToggle.setAttribute("aria-expanded", "true");
  el.detailLinks.innerHTML = activityStoreLinks(game);
  el.detailStorePrices.innerHTML = "";
  el.detailStorePricePanel.hidden = true;
  el.detailNote.hidden = true;
  el.detailPricePanel.hidden = true;
  el.detailConditionPanel.hidden = true;
  const guides = activityGuideLinks(game);
  el.detailGuides.hidden = !guides.length;
  el.detailGuideLinks.innerHTML = guides.join("");
  loadGamelistDetailTrophies(game);
  openDialog(el.detailDialog);
}
function activityStoreLinks(game) {
  const platform = shortPlatform(game.platform || "").toLowerCase();
  const q = encodeURIComponent(game.title);
  const links = game.storeLinks || {};
  const stores = [];
  if (/ps[1-5]|playstation/.test(platform)) stores.push({ label: "PlayStation", url: links.playstation || `https://store.playstation.com/search/${q}`, cls: "store-playstation", icon: "assets/sites/playstation.png" });
  else if (/switch|nintendo/.test(platform)) stores.push({ label: "Nintendo", url: links.nintendo || `https://www.nintendo.com/search/#q=${q}`, cls: "store-nintendo", icon: "assets/sites/nintendo.png" });
  else if (/steam|\bpc\b/.test(platform)) stores.push({ label: "Steam", url: links.steam || `https://store.steampowered.com/search/?term=${q}`, cls: "store-steam", icon: "assets/sites/steam.png" });
  else if (/xbox|x360|xone/.test(platform)) stores.push({ label: "Xbox", url: links.xbox || `https://www.xbox.com/search?q=${q}`, cls: "store-xbox", icon: "assets/platforms/xbox.png" });
  else stores.push({ label: "Wikipedia", url: `https://en.wikipedia.org/wiki/Special:Search?search=${q}`, cls: "store-wikipedia", icon: "assets/sites/wikipedia.ico" });
  stores.push({ label: "HowLongToBeat", url: game.hltbUrl || game.howLongToBeatUrl || `https://howlongtobeat.com/?q=${q}`, cls: "store-hltb", icon: "assets/sites/howlongtobeat.png" });
  return storeButtonsMarkup(stores, escapeHtml);
}
function slidePlaying(direction) { slideHorizontalCarousel(el.playingCarousel, direction); }
function updatePlayingControls() { const state = horizontalCarouselState(el.playingCarousel); const section = el.playingCarousel.closest(".playing-section"); section?.classList.toggle("playing-at-start", state.atStart); section?.classList.toggle("playing-at-end", state.atEnd); el.playingPrev.hidden = !state.overflow; el.playingNext.hidden = !state.overflow; el.playingPrev.disabled = state.atStart; el.playingNext.disabled = state.atEnd; }
function updateFinishedControls() { const max = Math.max(0, el.finishedCarousel.scrollWidth - el.finishedCarousel.clientWidth - 1); const overflow = max > 2; el.playingFinished.classList.toggle("finished-has-overflow", overflow); el.playingFinished.classList.toggle("finished-at-start", !overflow || el.finishedCarousel.scrollLeft <= 2); el.playingFinished.classList.toggle("finished-at-end", !overflow || el.finishedCarousel.scrollLeft >= max); }
function schedulePlayingCardHeightSync() { cancelAnimationFrame(state.playingHeightFrame); state.playingHeightFrame = requestAnimationFrame(() => { state.playingHeightFrame = requestAnimationFrame(equalizeMobilePlayingCards); }); }
function equalizeMobilePlayingCards() { state.playingHeightFrame = 0; el.playingCarousel.style.removeProperty("--mobile-playing-card-height"); if (!window.matchMedia("(max-width: 760px)").matches) return; const cards = [...el.playingCarousel.querySelectorAll(".game-card.playing-card")]; if (!cards.length) return; const height = Math.ceil(Math.max(...cards.map((card) => card.scrollHeight), 252)); el.playingCarousel.style.setProperty("--mobile-playing-card-height", `${height}px`); }
function scheduleShelfTrailerUpdate() { if (state.playingTrailerFrame) return; state.playingTrailerFrame = requestAnimationFrame(() => { state.playingTrailerFrame = 0; if (document.hidden || document.body.classList.contains("dialog-open")) return; syncFocusedActivityTrailer(el.playingCarousel, escapeHtml); }); }
function gamelistProjectionCard(game) {
  const cover = coverUrl(game.cover || "") || platformFallback(game.platform);
  const owners = Array.isArray(game.owners) && game.owners.length ? game.owners : [state.gamelistSettings.defaultOwner || "Xavi"];
  const ownerClasses = `${owners.includes("Judy") ? " owner-card-judy" : ""}${hasJordiToneOwner(owners) ? " owner-card-jordi" : ""}`;
  const studio = [game.developer, game.publisher].filter(Boolean).join(" / ");
  const card = createGameCardShell(document);
  card.dataset.gamelistId = game.id; card.setAttribute("role", "button"); card.tabIndex = 0;
  card.className += ` playing-card has-art${ownerClasses}${game.digital ? " digital-card" : ""}${game.stream ? " stream-card" : ""}${game.platinum ? " completed-trophy-card" : ""}`;
  card.style.setProperty("--card-art", `url('${escapeCss(cover)}')`);
  const trailer = card.querySelector(".card-trailer"); const trailerUrl = window.matchMedia("(min-width: 900px)").matches ? activityTrailerUrl(game.trailerUrl, window.location.origin) : ""; if (trailerUrl) { card.classList.add("has-trailer"); trailer.dataset.src = trailerUrl; const toggle = card.querySelector(".trailer-toggle"); toggle.hidden = false; toggle.innerHTML = pauseTrailerIcon(); } else { trailer.remove(); card.querySelector(".trailer-toggle")?.remove(); }
  const image = card.querySelector(".cover-button img"); image.src = cover; image.alt = `${game.title} cover`; image.loading = "eager"; image.fetchPriority = "high"; image.decoding = "async"; bindCoverFrame(image);
  const title = card.querySelector("h3"); title.textContent = game.title; title.classList.toggle("owner-judy", owners.includes("Judy")); title.classList.toggle("owner-jordi", hasJordiToneOwner(owners)); title.classList.toggle("completed-achievements-title", Boolean(game.platinum));
  const visibleOwners = owners.filter((owner) => owner !== (state.gamelistSettings.defaultOwner || "Xavi")); card.querySelector(".title-owners").innerHTML = visibleOwners.map(ownerBadge).join("");
  card.querySelector(".edit-action").classList.remove("editor-only");
  const studioLine = card.querySelector(".studio-line"); studioLine.textContent = studio; studioLine.hidden = !studio;
  card.querySelector(".meta").innerHTML = projectionMeta(game);
  const dates = card.querySelector(".play-dates"); dates.innerHTML = game.startedAt ? `<span class="history-pill history-date-pill"><small>Started</small><strong>${escapeHtml(formatShortDate(game.startedAt))}</strong></span>` : ""; dates.hidden = !dates.innerHTML;
  card.querySelector(".chips").innerHTML = (game.genres || []).slice(0, 4).map((tag) => `<span class="chip genre">${escapeHtml(tag)}</span>`).join("");
  const trophies = card.querySelector(".card-trophies"); trophies.innerHTML = shelfCardTrophies(game); trophies.hidden = !trophies.innerHTML;
  card.querySelector(".card-actions").remove(); card.querySelector(".prices").remove();
  const note = card.querySelector(".notes"); note.textContent = shortDescription(game.description || ""); note.hidden = !note.textContent;
  return card.outerHTML;
}
function projectionMeta(game, options = {}) { const release = activityReleaseStatus(game, { includePast: Boolean(options.includePast) }); return `${platformBadge(game.platform)}${game.digital ? `<span class="digital-pill">Digital</span>` : ""}${game.emulator ? `<span class="emulator-pill">Emulator</span>` : ""}${game.lengthHours ? timeBadgeMarkup(game.lengthHours, game.hltbUrl || game.howLongToBeatUrl || `https://howlongtobeat.com/?q=${encodeURIComponent(game.title)}`, escapeHtml) : ""}${game.stream ? `<span class="stream-pill">Stream</span>` : ""}${release ? releaseStatusPill(release) : ""}${game.coop ? `<span class="coop-pill">Coop</span>` : ""}${game.replayCount ? `<span class="replay-pill">Replay ${escapeHtml(game.replayCount)}</span>` : ""}`; }
function releaseStatusPill(value) {
  const text = String(value || "").trim();
  const match = text.match(/^(Released|Releases)\s+(.+)$/i);
  if (!match) return `<span class="release-pill">${escapeHtml(text)}</span>`;
  const label = match[1].toLowerCase() === "released" ? "Released" : "Releases";
  const date = formatShortDate(match[2]) || match[2];
  return `<span class="release-pill history-date-pill"><small>${label}</small><strong>${escapeHtml(date)}</strong></span>`;
}
function activityGameFor(game) {
  if (!/(^|\s)ps[1-5](\s|$)|playstation/i.test(shortPlatform(game.platform || ""))) return null;
  return (state.trophyActivity?.games || []).map((item) => ({ item, score: activityTitleMatchScore(game.trophyName || game.title, item.title || item.game || "") })).filter(({ score }) => score >= 75).sort((a, b) => b.score - a.score)[0]?.item || null;
}
function activityProgressFor(game) {
  const external = externalActivityFor(game); if (external?.total) return Math.round((external.earned / external.total) * 100);
  const remote = activityGameFor(game);
  const cached = remote?.npCommunicationId ? state.cardTrophies[remote.npCommunicationId] : null;
  if (cached?.total) return Math.round((cached.earned / cached.total) * 100);
  const match = String(remote?.game || "").match(/(\d{1,3})%/);
  return match ? Math.min(100, Number(match[1])) : null;
}
function shelfProgressPill(game) {
  const progress = activityProgressFor(game);
  return progress != null ? `<span class="psn-progress-pill shelf-progress-pill">${trophyIcon()}<em style="--progress:${progress}%"></em><strong>${progress}%</strong></span>` : "";
}
function shelfCardTrophies(game) {
  if (!activityAllowsPsnCardTrophies(game.platform)) return "";
  const guides = activityGuideLinks(game);
  const guideRow = guides.length ? `<div class="guide-links card-guide-row">${guides.join("")}</div>` : "";
  const external = externalActivityFor(game);
  if (external) {
    if (external.loading) return `<div class="card-trophy-head">${trophyIcon()}<span>Loading achievements...</span></div>${guideRow}`;
    const earned = external.achievements.filter((item) => item.earned !== false && item.earnedAt).sort((a, b) => (Date.parse(b.rawEarnedAt || b.earnedAt || 0) || 0) - (Date.parse(a.rawEarnedAt || a.earnedAt || 0) || 0)).slice(0, 3);
    const progress = external.total ? Math.round((external.earned / external.total) * 100) : null;
    if (!earned.length && progress == null) return guideRow;
    const tone = ["steam", "pc"].includes(normalize(shortPlatform(game.platform))) ? "steam" : "";
    return `<div class="card-trophy-head">${trophyIcon()}<span>Latest achievements</span>${progress != null ? `<span class="psn-progress-pill card-trophy-progress"><em style="--progress:${progress}%"></em><strong>${progress}%</strong></span>` : ""}</div>${guideRow}${earned.length ? `<div class="card-trophy-list">${earned.map((item) => `<a class="card-trophy trophy-${tone || trophyTone(item.type || item.rarity)}" href="${escapeHtml(item.url || (shortPlatform(game.platform).toLowerCase().includes("xbox") ? state.xboxActivity.sourceUrl : state.steamActivity.sourceUrl) || "#")}" target="_blank" rel="noreferrer" title="${escapeHtml([item.title, item.earnedAt].filter(Boolean).join(" · "))}"><img src="${escapeHtml(item.icon || platformLogo(game.platform))}" alt=""><span>${escapeHtml(item.title || "Achievement")}</span>${item.earnedAt ? `<small class="card-trophy-meta">${escapeHtml(item.earnedAt)}</small>` : ""}</a>`).join("")}</div>` : ""}`;
  }
  const remote = activityGameFor(game);
  const cacheKey = remote?.npCommunicationId || remote?.id || "";
  const cached = cacheKey ? state.cardTrophies[cacheKey] : null;
  if (cacheKey && !cached) loadShelfCardTrophies(game, remote);
  const query = normalize(game.trophyName || game.title);
  const recent = (state.trophyActivity?.achievements || []).filter((item) => { const value = normalize(item.game || ""); return value && (value.includes(query) || query.includes(value)); });
  const trophies = (cached?.trophies?.length ? cached.trophies : recent).slice(0, 3);
  if (!trophies.length && cached?.loading) return `<div class="card-trophy-head">${trophyIcon()}<span>Loading trophies...</span></div>${guideRow}`;
  if (!trophies.length) return guideRow;
  const progress = activityProgressFor(game);
  return `<div class="card-trophy-head">${trophyIcon()}<span>Latest trophies</span>${progress != null ? `<span class="psn-progress-pill card-trophy-progress"><em style="--progress:${progress}%"></em><strong>${progress}%</strong></span>` : ""}</div>${guideRow}<div class="card-trophy-list">${trophies.map((item) => `<a class="card-trophy trophy-${trophyTone(item.type || item.rarity)}" href="${escapeHtml(item.url || state.trophyActivity?.sourceUrl || "#")}" target="_blank" rel="noreferrer" title="${escapeHtml([item.title, item.earnedAt].filter(Boolean).join(" · "))}"><img src="${escapeHtml(item.icon || platformLogo("PS5"))}" alt=""><span>${escapeHtml(item.title || "Trophy")}</span>${item.earnedAt ? `<small class="card-trophy-meta">${escapeHtml(item.earnedAt)}</small>` : ""}</a>`).join("")}</div>`;
}

async function loadGamelistDetailTrophies(game) {
  el.detailTrophies.hidden = true;
  el.detailTrophyList.innerHTML = "";
  const external = externalActivityFor(game);
  if (external) {
    if (external.loading) { el.detailTrophies.hidden = false; el.detailTrophyTitle.textContent = "ACHIEVEMENTS"; el.detailTrophyPercent.innerHTML = ""; el.detailTrophyList.innerHTML = `<div class="detail-trophy-empty">Loading earned achievements...</div>`; return; }
    renderGamelistDetailTrophies(game, external.achievements, external.earned, external.total, "ACHIEVEMENTS");
    return;
  }
  const remote = activityGameFor(game);
  const id = remote?.npCommunicationId || remote?.id || "";
  if (!id) {
    const recent = (state.trophyActivity?.achievements || []).filter((item) => activityTitleMatchScore(game.trophyName || game.title, item.game || item.title || "") >= 75);
    if (recent.length) renderGamelistDetailTrophies(game, recent, recent.length, recent.length, "TROPHIES");
    return;
  }
  el.detailTrophies.hidden = false;
  el.detailTrophyList.innerHTML = `<div class="detail-trophy-empty">Loading earned trophies...</div>`;
  try {
    const response = await fetch(`/api/trophies?id=${encodeURIComponent(id)}&service=${encodeURIComponent(remote.npServiceName || "trophy")}&user=${encodeURIComponent(state.gamelistSettings.psnUser || "")}`);
    const data = await response.json();
    const trophies = Array.isArray(data.trophies) ? data.trophies : [];
    renderGamelistDetailTrophies(game, trophies, trophies.filter((item) => item.earned).length, trophies.length, "TROPHIES");
  } catch {
    el.detailTrophyList.innerHTML = `<div class="detail-trophy-empty">Could not load trophies right now.</div>`;
  }
}

function renderGamelistDetailTrophies(game, trophies, earned, total, title) {
  state.gamelistDetailGame = game;
  state.gamelistDetailTrophyData = trophies;
  state.gamelistDetailTrophyEarned = earned;
  state.gamelistDetailTrophyTotal = total;
  state.gamelistDetailTrophyKind = title;
  el.detailTrophies.hidden = false;
  el.detailTrophyTitle.textContent = title;
  el.detailTrophyCount.textContent = "";
  const progress = total ? Math.round((earned / total) * 100) : 0;
  el.detailTrophyPercent.innerHTML = total ? `<span class="psn-progress-pill"><em style="--progress:${progress}%"></em><strong>${progress}%</strong></span>` : "";
  renderGamelistDetailTrophyList();
}

function renderGamelistDetailTrophyList() {
  const game = state.gamelistDetailGame;
  const direction = state.gamelistDetailTrophyDirection === "asc" ? 1 : -1;
  const sort = el.detailTrophySort.value;
  const trophies = [...state.gamelistDetailTrophyData].sort((a, b) => {
    if (sort === "name") return direction * String(a.title || "").localeCompare(String(b.title || ""), undefined, { sensitivity: "base" });
    if (sort === "completed") return direction * (Number(Boolean(a.earned)) - Number(Boolean(b.earned))) || String(a.earnedAt || "").localeCompare(String(b.earnedAt || ""));
    return direction * (Number(a.order ?? a.index ?? 0) - Number(b.order ?? b.index ?? 0));
  });
  el.detailTrophyDirection.innerHTML = sortArrowIcon(state.gamelistDetailTrophyDirection === "desc");
  el.detailTrophyDirection.classList.toggle("desc", state.gamelistDetailTrophyDirection === "desc");
  el.detailTrophyDirection.title = state.gamelistDetailTrophyDirection === "asc" ? "Sort ascending" : "Sort descending";
  el.detailTrophyDirection.setAttribute("aria-label", el.detailTrophyDirection.title);
  const tone = ["steam", "pc"].includes(normalize(shortPlatform(game?.platform))) ? "steam" : "";
  el.detailTrophyList.innerHTML = trophies.length ? trophies.map((item) => `<article class="detail-trophy-card trophy-${tone || trophyTone(item.type || item.rarity)} ${item.earned ? "earned" : "missing"}"><img src="${escapeHtml(item.icon || platformLogo(game?.platform || "PS5"))}" alt=""><div><strong>${escapeHtml(item.title || "Achievement")}</strong><span>${escapeHtml([item.earned ? item.earnedAt || "Earned" : "Missing", item.rarity].filter(Boolean).join(" · "))}</span>${item.description ? `<p>${escapeHtml(item.description)}</p>` : ""}</div></article>`).join("") : `<div class="detail-trophy-empty">No ${state.gamelistDetailTrophyKind === "TROPHIES" ? "trophies" : "achievements"} found for this game yet.</div>`;
}
function externalActivityFor(game) {
  const platform = normalize(shortPlatform(game.platform)); const title = game.trophyName || game.title;
  if (platform.includes("steam") || platform === "pc") { const appId = steamAppIdForShelfGame(game); const cached = appId ? state.cardTrophies[`steam:${appId}`] : null; if (cached) return { achievements: cached.achievements || [], earned: cached.earned || 0, total: cached.total || 0, loading: cached.loading }; const match = state.steamActivity.games.map((item) => ({ item, score: activityTitleMatchScore(title, item.name || item.title) })).filter(({ score }) => score >= 75).sort((a, b) => b.score - a.score)[0]?.item; if (!match) { if (appId) loadShelfSteamCardAchievements(game, appId); return appId ? { achievements: [], earned: 0, total: 0, loading: true } : null; } const achievements = match.achievements || []; return { achievements, earned: achievements.filter((item) => item.earned).length, total: achievements.length }; }
  if (platform.includes("xbox") || platform === "x360" || platform === "xone") { const match = state.xboxActivity.games.map((item) => ({ item, score: activityTitleMatchScore(title, item.title || item.game) })).filter(({ score }) => score >= 75).sort((a, b) => b.score - a.score)[0]?.item; if (!match) return null; const achievements = match.achievements || []; return { achievements, earned: Number(match.earned || achievements.filter((item) => item.earned).length), total: Number(match.total || achievements.length) }; }
  return null;
}
function steamAppIdForShelfGame(game) { const direct = String(game.steamAppId || "").replace(/\D/g, ""); if (direct) return direct; const value = game.storeLinks?.steam || ""; try { const parts = new URL(value).pathname.split("/").filter(Boolean); const index = parts.indexOf("app"); return index >= 0 ? String(parts[index + 1] || "").replace(/\D/g, "") : ""; } catch { return ""; } }
async function loadShelfSteamCardAchievements(game, appId) { const key = `steam:${appId}`; if (state.cardTrophies[key]) return; state.cardTrophies[key] = { loading: true, achievements: [], earned: 0, total: 0 }; try { const params = new URLSearchParams({ appId, debug: "1" }); if (state.gamelistSettings.steamUser) params.set("user", state.gamelistSettings.steamUser); const response = await fetch(`/api/steam-achievements?${params}`); const data = await response.json(); const achievements = Array.isArray(data.achievements) ? data.achievements : []; state.cardTrophies[key] = { loading: false, achievements, earned: Number(data.earnedCount ?? achievements.filter((item) => item.earned).length), total: Number(data.count ?? achievements.length) }; } catch { state.cardTrophies[key] = { loading: false, achievements: [], earned: 0, total: 0 }; } updateShelfCardTrophyStrips(game.id); if (el.detailDialog.open && el.detailDialog.dataset.id === game.id) loadGamelistDetailTrophies(game); }
async function loadShelfCardTrophies(game, remote) {
  const cacheKey = remote?.npCommunicationId || remote?.id || "";
  if (!cacheKey || state.cardTrophies[cacheKey]) return;
  state.cardTrophies[cacheKey] = { loading: true, trophies: [], earned: 0, total: 0 };
  try {
    const params = new URLSearchParams({ id: cacheKey, service: remote.npServiceName || "trophy", user: state.gamelistSettings.psnUser || "" });
    const response = await fetch(`/api/trophies?${params}`);
    const data = await response.json();
    const all = Array.isArray(data.trophies) ? data.trophies : [];
    state.cardTrophies[cacheKey] = { loading: false, trophies: all.filter((item) => item.earned).sort((a, b) => Date.parse(b.rawEarnedAt || b.earnedAt || 0) - Date.parse(a.rawEarnedAt || a.earnedAt || 0)).slice(0, 3), earned: all.filter((item) => item.earned).length, total: all.length };
  } catch { state.cardTrophies[cacheKey] = { loading: false, trophies: [], earned: 0, total: 0 }; }
  updateShelfCardTrophyStrips(game.id);
}
function updateShelfCardTrophyStrips(gameId) {
  const game = state.gamelistGames.find((item) => item.id === gameId && !item.deletedAt);
  if (!game) return;
  document.querySelectorAll(`.game-card[data-gamelist-id="${CSS.escape(gameId)}"] .card-trophies`).forEach((node) => {
    node.innerHTML = game.playing ? shelfCardTrophies(game) : "";
    node.hidden = !node.innerHTML;
  });
  if (game.playing) schedulePlayingCardHeightSync();
}
function updateAllShelfTrophyStrips() {
  state.gamelistGames.filter((game) => game.playing && !game.deletedAt).forEach((game) => updateShelfCardTrophyStrips(game.id));
}
function updateShelfPhysicalProgressPills() {
  el.shelf.querySelectorAll("[data-id]").forEach((node) => {
    const game = state.games.find((item) => item.id === node.dataset.id);
    if (!game) return;
    node.querySelectorAll(".shelf-progress-pill").forEach((pill) => pill.remove());
    const progress = shelfProgressPill(game);
    if (!progress) return;
    const target = node.classList.contains("game-row") ? node.querySelector(".game-row-core") : node.querySelector(".meta");
    target?.insertAdjacentHTML("beforeend", progress);
  });
}
function finishedProjectionCard(game) {
  const cover = coverUrl(game.cover || "") || platformFallback(game.platform);
  const progress = activityProgressFor(game);
  const badges = `${platformBadge(game.platform)}${game.digital ? `<span class="digital-pill">Digital</span>` : ""}${game.emulator ? `<span class="emulator-pill">Emulator</span>` : ""}${game.coop ? `<span class="coop-pill">Coop</span>` : ""}${game.stream ? `<span class="stream-pill">Stream</span>` : ""}${game.replayCount ? `<span class="replay-pill">Replay ${escapeHtml(game.replayCount)}</span>` : ""}`;
  return finishedGameMarkup({ id: game.id, title: game.title, cover, completedClass: game.platinum ? "completed-trophy-card" : "", badges, dateText: [formatLongDate(game.completedAt), finishedDurationText(game.startedAt, game.completedAt)].filter(Boolean).join(" · "), progress, dataName: "gamelist-id", escape: escapeHtml });
}
async function loadTrophyActivity() {
  const module = el.trophyCard.closest("[data-module]");
  const user = state.gamelistSettings.psnUser || "";
  el.trophyCard.innerHTML = `<span class="lookup-loading">Loading trophy activity…</span>`;
  try {
    const [psnResult, steamResult, xboxResult] = await Promise.allSettled([fetch(`/api/achievements?user=${encodeURIComponent(user)}&schema=3`).then((response) => response.ok ? response.json() : null), fetchShelfSteamActivity(), fetchShelfXboxActivity()]);
    state.trophyActivity = psnResult.status === "fulfilled" ? psnResult.value : null;
    state.steamActivity = steamResult.status === "fulfilled" ? steamResult.value : { achievements: [], games: [], completed: [], totalEarned: 0, sourceUrl: "" };
    state.xboxActivity = xboxResult.status === "fulfilled" ? xboxResult.value : { achievements: [], games: [], completed: [], totalEarned: 0, sourceUrl: "" };
    const panel = achievementPanelMarkup({ psn: state.trophyActivity || {}, steam: state.steamActivity, xbox: state.xboxActivity, trophyIconHtml: trophyIcon(), platformBadge, platformLogo, trophyTone, escape: escapeHtml });
    el.trophyCard.innerHTML = panel.html;
    el.trophyCard.querySelector("[data-action='platinums']")?.addEventListener("click", openCompletedGames);
    updateAllShelfTrophyStrips();
    updateShelfPhysicalProgressPills();
  } catch { el.trophyCard.innerHTML = `<span>Trophy activity is unavailable.</span>`; }
  module.hidden = state.layout.hidden.includes("trophies");
}
async function fetchShelfSteamActivity() {
  const user = state.gamelistSettings.steamUser || "";
  if (!user) return { achievements: [], games: [], completed: [], totalEarned: 0, sourceUrl: "" };
  const games = []; let cursor = 0;
  for (let page = 0; page < 20 && cursor !== null; page += 1) {
    const params = new URLSearchParams({ activity: "1", cursor: String(cursor), limit: "20" }); params.set("user", user);
    const response = await fetch(`/api/steam-achievements?${params}`); const data = await response.json();
    if (!response.ok || data.error || data.needsSetup) break;
    games.push(...(data.games || [])); cursor = data.nextCursor !== null && Number.isFinite(Number(data.nextCursor)) ? Number(data.nextCursor) : null;
  }
  const achievements = games.flatMap((game) => (game.achievements || []).filter((item) => item.earned && item.earnedAt).map((item) => ({ ...item, title: item.title || "Achievement unlocked", game: game.name, platform: "Steam", source: "steam", rawEarnedAt: item.rawEarnedAt || item.earnedAt, icon: item.icon || platformLogo("Steam") })));
  const completed = games.filter((game) => (game.achievements || []).length && (game.achievements || []).every((item) => item.earned)).map((game) => { const latest = [...game.achievements].filter((item) => item.earned).sort((a, b) => (Date.parse(b.rawEarnedAt || b.earnedAt || 0) || 0) - (Date.parse(a.rawEarnedAt || a.earnedAt || 0) || 0))[0]; const local = activityLocalGameForTitle(game.name, state.gamelistGames); return { title: game.name, cover: activityCoverOverride(game.name) || local?.cover || (game.appId ? `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${encodeURIComponent(game.appId)}/library_600x900.jpg` : ""), trophyName: "100% Achievements", trophyIcon: game.imgIconUrl ? `https://media.steampowered.com/steamcommunity/public/images/apps/${game.appId}/${game.imgIconUrl}.jpg` : platformLogo("Steam"), platform: "Steam", earnedAt: latest?.earnedAt || "", rawEarnedAt: latest?.rawEarnedAt || latest?.earnedAt || "" }; });
  return { achievements, games, completed, totalEarned: games.reduce((sum, game) => sum + (game.achievements || []).filter((item) => item.earned).length, 0), sourceUrl: /^https?:/i.test(user) ? user : `https://steamcommunity.com/id/${encodeURIComponent(user)}/games/?tab=all` };
}
async function fetchShelfXboxActivity() {
  const params = new URLSearchParams({ schema: "2" }); if (state.gamelistSettings.microsoftUser) params.set("user", state.gamelistSettings.microsoftUser);
  const response = await fetch(`/api/xbox-achievements?${params}`); const data = await response.json();
  if (!response.ok || data.error || data.authError) return { achievements: [], games: [], completed: [], totalEarned: 0, sourceUrl: "" };
  return { achievements: data.achievements || [], games: data.games || [], completed: data.completed || [], totalEarned: Number(data.totalEarned || 0), sourceUrl: data.sourceUrl || "" };
}
function openGamelistGameByTitle(title) { const game = activityLocalGameForTitle(title, state.gamelistGames); if (game) openGamelistDetails(game); }
function openCompletedGames() {
  const remote = [...(state.trophyActivity?.platinums || []), ...state.steamActivity.completed, ...state.xboxActivity.completed];
  const completed = (remote.length ? remote : state.gamelistGames.filter((game) => game.platinum || game.completedAt)).map((item) => { const title = item.title || item.game || "Completed game"; const local = activityLocalGameForTitle(title, state.gamelistGames); return { ...item, title, cover: activityCoverOverride(item) || local?.cover || item.cover || "", trophyIcon: item.icon || item.trophyIcon || platformLogo(item.platform || local?.platform || "PS5"), trophyName: item.trophyName || "Platinum", platform: item.platform || local?.platform || "PlayStation", earnedAt: item.earnedAt || (local?.completedAt ? formatLongDate(local.completedAt) : ""), rawEarnedAt: item.rawEarnedAt || local?.completedAt || "" }; });
  renderCompletedGames(completed);
  openDialog(el.completedDialog);
  hydrateCompletedCovers(completed);
}

async function hydrateCompletedCovers(items) {
  const missing = items.filter((item) => !item.cover && !state.completedCoverCache[normalize(item.title)]);
  if (!missing.length) return;
  await Promise.all(missing.map(async (item) => {
    const key = normalize(item.title);
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(item.title)}`);
      const data = response.ok ? await response.json() : { results: [] };
      const result = (data.results || [])[0];
      state.completedCoverCache[key] = result?.cover ? coverUrl(result.cover) : "__missing";
      if (state.completedCoverCache[key] !== "__missing") item.cover = state.completedCoverCache[key];
    } catch { state.completedCoverCache[key] = "__missing"; }
  }));
  if (el.completedDialog.open) renderCompletedGames(items);
}
function renderCompletedGames(items) {
  const years = uniqueSorted(items.map(completedYearFor).filter(Boolean)).reverse();
  const platforms = uniqueSorted(items.map((item) => completedPlatformFor(item.platform)));
  if (state.completedYear !== "all" && !years.includes(state.completedYear)) state.completedYear = "all";
  if (state.completedPlatform !== "all" && !platforms.includes(state.completedPlatform)) state.completedPlatform = "all";
  const direction = state.completedDirection === "asc" ? 1 : -1;
  const visible = items.filter((item) => (state.completedYear === "all" || completedYearFor(item) === state.completedYear) && (state.completedPlatform === "all" || completedPlatformFor(item.platform) === state.completedPlatform)).sort((a, b) => state.completedSort === "name" ? direction * a.title.localeCompare(b.title) : direction * ((Date.parse(a.rawEarnedAt || a.earnedAt || 0) || 0) - (Date.parse(b.rawEarnedAt || b.earnedAt || 0) || 0)));
  el.completedTitle.innerHTML = `${trophyIcon()} <span>COMPLETED</span>`;
  el.completedCount.textContent = `${visible.length} completed`;
  el.completedYear.innerHTML = `<option value="all">All</option>${years.map((year) => `<option value="${year}">${year}</option>`).join("")}`;
  el.completedYear.value = state.completedYear;
  el.completedPlatform.innerHTML = `<option value="all">All</option>${platforms.map((platform) => `<option value="${escapeHtml(platform)}">${escapeHtml(platform)}</option>`).join("")}`;
  el.completedPlatform.value = state.completedPlatform;
  el.completedSort.value = state.completedSort;
  el.completedDirection.innerHTML = sortArrowIcon(state.completedDirection === "desc");
  el.completedDirection.classList.toggle("desc", state.completedDirection === "desc");
  syncViewModeButton(el.completedView, state.completedView, { gridIcon, linesIcon });
  el.completedList.classList.toggle("list-view", state.completedView === "list");
  el.completedList.innerHTML = visible.map(completedCard).join("") || `<div class="empty">No completed games tracked yet.</div>`;
  el.completedList.querySelectorAll("[data-completed-title]").forEach((button) => button.addEventListener("click", () => { closeDialog(el.completedDialog); openGamelistGameByTitle(button.dataset.completedTitle); }));
  el.completedYear.onchange = () => { state.completedYear = el.completedYear.value; renderCompletedGames(items); };
  el.completedPlatform.onchange = () => { state.completedPlatform = el.completedPlatform.value; renderCompletedGames(items); };
  el.completedSort.onchange = () => { state.completedSort = el.completedSort.value; renderCompletedGames(items); };
  el.completedDirection.onclick = () => { state.completedDirection = state.completedDirection === "asc" ? "desc" : "asc"; renderCompletedGames(items); };
  el.completedView.onclick = () => { state.completedView = state.completedView === "grid" ? "list" : "grid"; renderCompletedGames(items); };
}
function completedCard(item) { return completedCardMarkup({ title: item.title, cover: activityCoverOverride(item) || item.cover, trophyIcon: item.trophyIcon, trophyName: item.trophyName, platform: item.platform, earnedAt: item.earnedAt, actionAttribute: `data-completed-title="${escapeHtml(item.title)}"`, escape: escapeHtml, cssEscape: escapeCss }); }
function completedYearFor(item) { const value = String(item.rawEarnedAt || item.earnedAt || ""); const match = value.match(/\b(19|20)\d{2}\b/); return match?.[0] || ""; }
function completedPlatformFor(value) { const platform = shortPlatform(value || ""); if (/ps\d|playstation/i.test(platform)) return "PlayStation"; if (/xbox|x360|xone/i.test(platform)) return "Xbox"; if (/steam|pc/i.test(platform)) return "Steam"; return platform || "Other"; }
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
function conditionLabel(game) {
  if (conditionValue(game, "sealed")) return "Sealed";
  if (conditionValue(game, "game") && conditionValue(game, "box")) return conditionValue(game, "manual") || conditionValue(game, "other") ? "Complete +" : "Complete";
  return "Loose";
}
function syncConditionInputs(changed) {
  if (changed === el.conditionFields.sealed && changed.checked) {
    el.conditionFields.game.checked = true; el.conditionFields.box.checked = true; el.conditionFields.other.checked = true; el.conditionFields.manual.checked = false;
  }
  if (!el.conditionFields.game.checked || !el.conditionFields.box.checked) el.conditionFields.sealed.checked = false;
  el.conditionFields.sealed.disabled = !el.conditionFields.game.checked || !el.conditionFields.box.checked;
}
function conditionFromInputs() { return Object.fromEntries(Object.entries(el.conditionFields).map(([key, input]) => [key, input.checked])); }
function splitValues(value) { return String(value || "").split(",").map((item) => item.trim()).filter(Boolean); }
function formatMoney(value, currency = "USD") {
  const number = Number(value);
  const amount = Number.isFinite(number) ? number.toFixed(2) : "0.00";
  return currency === "USD" ? `$${amount}` : `${amount}€`;
}
function normalizePriceLabel(value, currency = "USD") {
  if (!value) return currency === "USD" ? "- $" : "- €";
  const text = String(value).trim();
  return currency === "USD" ? text : text.replace(/€\s*([0-9][0-9.,]*)/g, "$1€").replace(/\bEUR\s*([0-9][0-9.,]*)/gi, "$1€");
}
function websiteLinks(game) { return [...new Set([...(game.websites || []), ...Object.values(game.storeLinks || {})].filter(Boolean))]; }
function storeLinkButtons(game, links = websiteLinks(game)) {
  const buttons = links.map((link) => ({ label: linkLabel(link), url: link, cls: siteClass(link), icon: siteIcon(link) }));
  return storeButtonsMarkup(buttons, escapeHtml);
}
function linkLabel(value) {
  try {
    const host = new URL(value).hostname.replace(/^www\./, "");
    if (host.includes("pricecharting")) return "PriceCharting";
    if (host.includes("playstation")) return "PlayStation";
    if (host.includes("nintendo")) return "Nintendo";
    if (host.includes("steam")) return "Steam";
    if (host.includes("xbox")) return "Xbox";
    if (host.includes("amazon")) return "Amazon";
    if (host.includes("ebay")) return "eBay";
    if (host.includes("xtralife")) return "Xtralife";
    if (host.includes("game.es")) return "GAME.es";
    if (host.includes("howlongtobeat")) return "HowLongToBeat";
    if (host.includes("igdb")) return "IGDB";
    if (host.includes("wikipedia")) return "Wikipedia";
    return host.split(".").slice(0, -1).join(".") || host;
  } catch { return "Website"; }
}
function siteClass(value) {
  const label = normalize(linkLabel(value)).replace(/ /g, "-");
  return label ? `store-${label}` : "";
}
function siteIcon(value) { const host = (() => { try { return new URL(value).hostname; } catch { return ""; } })(); if (host.includes("playstation")) return "assets/sites/playstation.png"; if (host.includes("nintendo")) return "assets/sites/nintendo.png"; if (host.includes("steam")) return "assets/sites/steam.png"; if (host.includes("howlongtobeat")) return "assets/sites/howlongtobeat.png"; return host ? `https://${host}/favicon.ico` : "assets/Icon.png"; }
function renderSavedStorePrices(game) {
  const prices = Array.isArray(game.storePrices) ? game.storePrices : [];
  const currency = game.storePriceCurrency || normalizePriceSettings(state.gamelistSettings).currency;
  el.detailStorePrices.innerHTML = storePricesMarkup(prices, currency) || `<span class="muted">No saved store prices yet.</span>`;
}
async function fetchAndSaveStorePrices(game) {
  const settings = normalizePriceSettings(state.gamelistSettings);
  const params = new URLSearchParams({ title: game.title, platform: shortPlatform(game.platform), region: settings.region, currency: settings.currency, stores: settings.stores.join(",") });
  const response = await fetch(`/api/prices?${params}`);
  const data = await response.json();
  if (!response.ok || data.error) throw new Error(data.error || "Store prices unavailable.");
  game.storePrices = Array.isArray(data.prices) ? data.prices : [];
  game.storePriceCurrency = settings.currency;
  game.storePricesFetchedAt = new Date().toISOString();
  syncShelfGameRecord(game);
}
function storePricesMarkup(prices, currency) {
  const available = prices.filter((price) => price.numericPrice != null).sort((a, b) => a.numericPrice - b.numericPrice);
  const best = available[0]?.store;
  return prices.map((price) => {
    const label = normalizePriceLabel(price.price, currency);
    return `<a class="price-link ${best === price.store && price.price ? "best" : ""} ${price.price ? "has-price" : "missing-price"}" href="${escapeHtml(price.url || "#")}" target="_blank" rel="noreferrer" title="${escapeHtml(price.store)}"><img class="store-icon" src="${escapeHtml(storeIcon(price.store))}" alt=""><strong>${escapeHtml(label)}</strong></a>`;
  }).join("");
}
function storeIcon(store) { if (String(store).startsWith("Amazon")) return "assets/stores/amazon.ico"; if (store === "eBay") return "https://www.ebay.com/favicon.ico"; if (store === "Xtralife") return "assets/stores/xtralife.ico"; if (store === "GAME.es") return "assets/stores/game.ico"; if (store === "Retro Island NY") return "assets/stores/retroisland.png"; if (store === "GameStop") return "https://www.gamestop.com/favicon.ico"; if (store === "Walmart") return "https://www.walmart.com/favicon.ico"; if (String(store).startsWith("Nintendo")) return "assets/sites/nintendo.png"; if (String(store).startsWith("PlayStation")) return "assets/sites/playstation.png"; if (store === "Steam") return "assets/sites/steam.png"; if (store === "Xbox") return "assets/platforms/xbox.png"; return "assets/Icon.png"; }
function renderPriceDetails(game) {
  const prices = game.collectionPrices || {};
  const rows = [["Loose", prices.loose], ["Complete", prices.complete], ["Sealed", prices.sealed]].filter(([, value]) => value != null);
  const currency = game.priceCurrency || "USD";
  const identifiers = [["UPC", game.upc], ["SKU", game.sku], ["ASIN", game.asin], ["eBay ID", game.epid], ["PriceCharting", game.pricechartingId]].filter(([, value]) => value);
  const priceMarkup = rows.length ? `<div class="collection-price-grid">${rows.map(([label, value]) => `<span><small>${label}</small><strong>${formatMoney(value, currency)}</strong></span>`).join("")}</div>` : `<span class="muted">No collection value fetched yet.</span>`;
  const identifierMarkup = identifiers.length ? `<div class="collection-product-meta">${identifiers.map(([label, value]) => `<span><small>${label}</small><strong>${escapeHtml(value)}</strong></span>`).join("")}</div>` : "";
  el.detailPriceSummary.innerHTML = `${priceMarkup}${identifierMarkup}`;
  el.detailPriceHeadline.textContent = Number.isFinite(Number(game.price)) ? formatMoney(game.price, currency) : "";
  const history = game.priceHistory || [];
  el.detailPriceGraph.innerHTML = priceGraph(history, currency);
  el.detailPriceGraph.hidden = history.length < 1;
  syncFetchValueButton();
}
function syncFetchValueButton(label = "Fetch value") {
  el.fetchValue.innerHTML = currencyIcon();
  el.fetchValue.title = label;
  el.fetchValue.setAttribute("aria-label", label);
}
function toggleCollectionValuePanel() {
  const collapsed = el.detailPricePanel.classList.toggle("is-collapsed");
  el.detailPriceToggle.setAttribute("aria-expanded", String(!collapsed));
}
function priceGraph(history, currency = "USD") {
  if (!history.length) return "";
  const values = history.map((item) => Number(item.value)).filter(Number.isFinite); const min = Math.min(...values); const max = Math.max(...values); const range = Math.max(1, max - min);
  const coords = values.map((value, index) => ({ x: values.length === 1 ? 300 : 24 + index * (552 / (values.length - 1)), y: values.length === 1 ? 75 : 126 - ((value - min) / range) * 102, value, date: history[index]?.date || "" }));
  const points = coords.map(({ x, y }) => `${x},${y}`).join(" ");
  return `<line x1="24" y1="126" x2="576" y2="126" stroke="rgba(255,255,255,.14)"/><polyline points="${points}" fill="none" stroke="var(--accent)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>${coords.map(({ x, y, value, date }) => { const tooltipX = Math.min(486, Math.max(12, x - 45)); const tooltipY = Math.max(10, y - 50); return `<g class="price-history-point"><circle cx="${x}" cy="${y}" r="12" fill="transparent"></circle><circle cx="${x}" cy="${y}" r="4" fill="var(--accent)"></circle><g class="price-history-tooltip" transform="translate(${tooltipX} ${tooltipY})"><rect width="102" height="38" rx="7"></rect><text x="10" y="15">${escapeHtml(date || "Unknown")}</text><text class="price-history-tooltip-price" x="10" y="30">${escapeHtml(formatMoney(value, currency))}</text></g></g>`; }).join("")}<text x="24" y="145" fill="rgba(255,255,255,.48)" font-size="10">${escapeHtml(history[0]?.date || "")}</text><text x="576" y="145" fill="rgba(255,255,255,.48)" font-size="10" text-anchor="end">${escapeHtml(history.at(-1)?.date || "")}</text>`;
}
async function fetchCollectionValue() {
  if (!shelfPricesVisible()) return;
  const game = state.games.find((item) => item.id === el.detailDialog.dataset.id); if (!game) return;
  el.fetchValue.disabled = true; syncFetchValueButton("Fetching value");
  try {
    const params = new URLSearchParams({ title: game.title, platform: shortPlatform(game.platform), region: game.country || game.region || "", currency: state.gamelistSettings.currency || "EUR" });
    if (game.pricechartingId) params.set("id", game.pricechartingId); else if (game.upc) params.set("upc", game.upc);
    const response = await fetch(`/api/collection-price?${params}`);
    const data = await response.json();
    if (!response.ok || data.error) { el.detailPriceSummary.innerHTML = `<span class="auth-error">${escapeHtml(data.error || "No matching physical edition was found.")}</span>`; return; }
    applyCollectionPrice(game, data);
    el.detailStorePrices.innerHTML = `<span class="muted">Checking store prices...</span>`;
    await fetchAndSaveStorePrices(game).catch((error) => { el.detailStorePrices.innerHTML = `<span class="auth-error">${escapeHtml(error?.message || "Store prices unavailable.")}</span>`; });
    await persistShelf(); renderPriceDetails(game); renderSavedStorePrices(game); renderStats();
  } catch (error) { el.detailPriceSummary.innerHTML = `<span class="auth-error">${escapeHtml(error?.message || "Collection value is unavailable.")}</span>`; } finally { el.fetchValue.disabled = false; syncFetchValueButton(); }
}

function applyCollectionPrice(game, data) {
  game.collectionPrices = data.prices;
  const condition = conditionLabel(game);
  const historyKey = condition === "Sealed" ? "sealed" : condition.startsWith("Complete") ? "complete" : "loose";
  game.price = data.prices?.[historyKey] ?? data.mainValue;
  game.priceCurrency = data.currency || "USD";
  game.priceHistory = (data.history?.[historyKey]?.length ? data.history[historyKey] : [...(game.priceHistory || []), { date: String(data.checkedAt || "").slice(0, 10), value: game.price }]).filter((item) => item.value != null).slice(-60);
  game.releaseDate = data.releaseDate || game.releaseDate;
  game.upc = data.upc || game.upc;
  game.sku = data.sku || game.sku;
  game.asin = data.asin || game.asin;
  game.epid = data.epid || game.epid;
  game.pricechartingId = data.productId || game.pricechartingId;
  game.cover = data.image || game.cover;
  game.updatedAt = new Date().toISOString();
  syncShelfGameRecord(game);
}
function syncShelfGameRecord(game) {
  const clean = stripRuntimeFields(game);
  const index = state.additions.findIndex((item) => item.id === game.id);
  if (game.sourceRecord) state.overrides[game.id] = clean;
  else if (index >= 0) state.additions[index] = clean;
}
async function loadShelfTrophies(game) {
  const external = externalActivityFor(game);
  if (external) {
    el.detailTrophies.hidden = false;
    el.detailTrophyTitle.textContent = "ACHIEVEMENTS";
    el.detailTrophyCount.textContent = "";
    const progress = external.total ? Math.round((external.earned / external.total) * 100) : 0;
    el.detailTrophyPercent.innerHTML = external.total ? `<span class="psn-progress-pill"><em style="--progress:${progress}%"></em><strong>${progress}%</strong></span>` : "";
    el.detailTrophyList.innerHTML = external.achievements.map((item) => `<article class="detail-trophy-card trophy-${trophyTone(item.type || item.rarity)} ${item.earned ? "earned" : "missing"}"><img src="${escapeHtml(item.icon || platformLogo(game.platform))}" alt=""><div><strong>${escapeHtml(item.title || "Achievement")}</strong><span>${escapeHtml([item.earned ? item.earnedAt || "Earned" : "Missing", item.rarity].filter(Boolean).join(" · "))}</span>${item.description ? `<p>${escapeHtml(item.description)}</p>` : ""}</div></article>`).join("");
    return;
  }
  const match = activityGameFor(game);
  const id = match?.npCommunicationId || match?.id || "";
  if (!id) { el.detailTrophies.hidden = true; el.detailTrophyPercent.innerHTML = ""; return; }
  el.detailTrophyTitle.textContent = "TROPHIES";
  el.detailTrophyPercent.innerHTML = "";
  el.detailTrophies.hidden = false; el.detailTrophyList.innerHTML = `<span>Loading trophies…</span>`;
  try { const response = await fetch(`/api/trophies?id=${encodeURIComponent(id)}&service=${encodeURIComponent(match.npServiceName || "trophy")}&user=${encodeURIComponent(state.gamelistSettings.psnUser || "")}`); const data = await response.json(); const trophies = data.trophies || []; el.detailTrophyCount.textContent = `${trophies.filter((item) => item.earned).length}/${trophies.length}`; el.detailTrophyList.innerHTML = trophies.map((item) => `<article class="detail-trophy-card trophy-${trophyTone(item.type)} ${item.earned ? "earned" : "missing"}"><img src="${escapeHtml(item.icon || "assets/platforms/playstation.png")}" alt=""><div><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml([item.earned ? item.earnedAt : "Missing", item.rarity].filter(Boolean).join(" · "))}</span>${item.description ? `<p>${escapeHtml(item.description)}</p>` : ""}</div></article>`).join(""); } catch { el.detailTrophies.hidden = true; }
}
function pencilIcon() { return `<svg class="pencil-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4l11-11a2.8 2.8 0 0 0-4-4L4 16v4Z"></path><path d="M13.5 6.5l4 4"></path></svg>`; }
function trashIcon() { return `<svg class="trash-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18"></path><path d="M8 6V4h8v2"></path><path d="M19 6l-1 14H6L5 6"></path><path d="M10 11v5"></path><path d="M14 11v5"></path></svg>`; }
function pauseTrailerIcon() { return `<svg class="pause-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14"></path></svg>`; }
function playTrailerIcon() { return `<svg class="play-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 11 7-11 7Z"></path></svg>`; }
function currencyIcon() { const currency = state.gamelistSettings.currency === "USD" ? "dollar" : "euro"; return currency === "dollar" ? `<svg class="dollar-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M16.8 7.2c-1.1-1-2.7-1.7-4.8-1.7-2.8 0-4.8 1.4-4.8 3.5 0 5.3 9.8 2.1 9.8 7 0 2.1-2 3.5-5 3.5-2.3 0-4.2-.8-5.4-2"></path><path d="M12 3v18"></path></svg>` : `<svg class="euro-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M19 5.5A7 7 0 0 0 8.2 7.1 7.4 7.4 0 0 0 7 12a7.4 7.4 0 0 0 1.2 4.9A7 7 0 0 0 19 18.5"></path><path d="M4 10h10"></path><path d="M4 14h10"></path></svg>`; }
function trophyIcon() { return `<svg class="trophy-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4h8v4a4 4 0 0 1-8 0V4Z"></path><path d="M8 6H5a3 3 0 0 0 3 3"></path><path d="M16 6h3a3 3 0 0 1-3 3"></path><path d="M12 12v4"></path><path d="M9 20h6"></path><path d="M10 16h4v4h-4z"></path></svg>`; }
function sortArrowIcon(desc = false) { return `<svg class="sort-arrow-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${desc ? "M12 3.5v17" : "M12 20.5v-17"}"></path><path d="${desc ? "M6.5 15l5.5 5.5 5.5-5.5" : "M6.5 9l5.5-5.5L17.5 9"}"></path></svg>`; }
function linesIcon() { return `<svg class="view-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M5 12h14M5 17h14"></path></svg>`; }
function gridIcon() { return `<svg class="view-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="4.5" y="4.5" width="5.5" height="5.5"></rect><rect x="14" y="4.5" width="5.5" height="5.5"></rect><rect x="4.5" y="14" width="5.5" height="5.5"></rect><rect x="14" y="14" width="5.5" height="5.5"></rect></svg>`; }
function ownerBadge(owner) { return `<span class="owner-pill owner-${normalize(owner)}">${escapeHtml(owner)}</span>`; }
function canonicalOwner(owner) {
  const value = String(owner || "").trim();
  const normalized = normalize(value);
  if (normalized === "judy") return "Judy";
  if (normalized === "jordi") return "Jordi";
  if (normalized === "cage") return "Cage";
  if (normalized === "xavi") return "Xavi";
  return value;
}
function hasJordiToneOwner(owners = []) { return owners.includes("Jordi") || owners.includes("Cage"); }
function trophyTone(value) { const text = String(value || "").toLowerCase(); if (text.includes("platinum")) return "platinum"; if (text.includes("gold")) return "gold"; if (text.includes("silver")) return "silver"; return "bronze"; }
function handleSelectOverflowTitle(event) { const select = event.target.closest?.("select"); if (select && updateSelectOverflowTitle(select)) showSelectOverflowPopover(select); }
function handleSelectOverflowLeave(event) { if (event.target.closest?.("select")) hideSelectOverflowPopover(); }
function updateSelectOverflowTitle(select) { const label = select?.selectedOptions?.[0]?.textContent?.trim() || ""; if (!label) return false; selectMeasureContext ||= document.createElement("canvas").getContext("2d"); const style = getComputedStyle(select); selectMeasureContext.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`; const available = select.clientWidth - (parseFloat(style.paddingLeft) || 0) - (parseFloat(style.paddingRight) || 0) - 4; const clipped = selectMeasureContext.measureText(label).width > available; select.classList.toggle("is-clipped", clipped); return clipped; }
function showSelectOverflowPopover(select) { if (!selectOverflowPopover) { selectOverflowPopover = document.createElement("div"); selectOverflowPopover.className = "select-overflow-popover"; document.body.appendChild(selectOverflowPopover); } selectOverflowPopover.textContent = select.selectedOptions?.[0]?.textContent?.trim() || ""; const rect = select.getBoundingClientRect(); selectOverflowPopover.style.left = `${Math.min(Math.max(rect.left, 12), Math.max(12, window.innerWidth - 280))}px`; selectOverflowPopover.style.top = `${Math.min(rect.bottom + 6, window.innerHeight - 48)}px`; selectOverflowPopover.classList.add("visible"); }
function hideSelectOverflowPopover() { selectOverflowPopover?.classList.remove("visible"); }
function registerServiceWorker() { if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("/service-worker.js").catch(() => {})); }
async function checkSiteVersion() { try { const response = await fetch(`/version.json?t=${Date.now()}`, { cache: "no-store" }); if (!response.ok) return false; const remote = await response.json(); const remoteVersion = String(remote.version || "").trim(); if (!remoteVersion) return false; const current = localStorage.getItem(VERSION_STORAGE_KEY); if (!current || current === remoteVersion || remoteVersion === SITE_VERSION) { localStorage.setItem(VERSION_STORAGE_KEY, remoteVersion); return false; } await clearSiteCaches(); localStorage.setItem(VERSION_STORAGE_KEY, remoteVersion); window.location.reload(); return true; } catch { return false; } }
async function clearSiteCaches() { if ("caches" in window) { const keys = await caches.keys(); await Promise.all(keys.filter((key) => key.startsWith("gamelist-cache-")).map((key) => caches.delete(key))); } if ("serviceWorker" in navigator) { const registrations = await navigator.serviceWorker.getRegistrations(); await Promise.all(registrations.map((registration) => registration.update().catch(() => {}))); } }
async function clearSiteCachesAndReload() { await clearSiteCaches(); localStorage.setItem(VERSION_STORAGE_KEY, SITE_VERSION); window.location.reload(); }
function stripRuntimeFields(game) { const { sourceRecord, ...clean } = game; return clean; }
function numberOrNull(value) { const number = Number(value); return Number.isFinite(number) && value !== "" ? number : null; }
function firstGenre(value) { return String(value).split(",")[0].trim(); }
function rawCoverUrl(value) { try { const url = new URL(value, location.origin); return url.searchParams.get("src") || value; } catch { return value; } }
function coverUrl(value) { return value.includes("howlongtobeat.com/games/") ? `/api/cover?src=${encodeURIComponent(value)}` : value; }
function coverProjectUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^\d+$/.test(raw)) return `https://www.thecoverproject.net/download_cover.php?src=cdn&cover_id=${raw}`;
  try {
    const url = new URL(raw);
    const id = url.searchParams.get("cover_id");
    if (id && /thecoverproject\.net$/i.test(url.hostname)) return `https://www.thecoverproject.net/download_cover.php?src=cdn&cover_id=${encodeURIComponent(id)}`;
    return raw;
  } catch { return ""; }
}
function findCoverProjectCover() {
  const title = el.fields.title.value.trim() || el.lookupInput.value.trim();
  const platform = shortPlatform(el.fields.platform.value);
  const query = `site:thecoverproject.net/view.php "${title}" "${platform}"`;
  window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, "_blank", "noopener,noreferrer");
}
function handleCoverImageError(event) {
  const image = event.target;
  if (!(image instanceof HTMLImageElement) || !image.dataset.coverFallback || image.dataset.fallbackUsed) return;
  image.dataset.fallbackUsed = "true";
  image.closest(".has-wrap")?.classList.remove("has-wrap");
  image.src = image.dataset.coverFallback;
  bindCoverFrame(image);
}
function bindCoverFrame(image) {
  if (!(image instanceof HTMLImageElement)) return;
  const sync = () => syncCoverFrame(image);
  if (image.complete && image.naturalWidth && image.naturalHeight) sync();
  else image.addEventListener("load", sync, { once: true });
}
function bindRowCoverFrame(image) {
  if (!(image instanceof HTMLImageElement)) return;
  const sync = () => syncRowCoverFrame(image);
  if (image.complete && image.naturalWidth && image.naturalHeight) sync();
  else image.addEventListener("load", sync, { once: true });
}
function syncCoverFrame(image) {
  const ratio = image.naturalWidth && image.naturalHeight ? image.naturalWidth / image.naturalHeight : 104 / 142;
  if (!Number.isFinite(ratio) || ratio <= 0) return;
  const frame = image.closest(".cover-button, .detail-cover");
  if (!frame) return;
  const height = frame.classList.contains("detail-cover") ? Math.min(360, Math.max(150, image.naturalHeight)) : 142;
  const width = Math.round(Math.min(frame.classList.contains("detail-cover") ? 280 : 180, Math.max(frame.classList.contains("detail-cover") ? 90 : 72, height * ratio)));
  frame.style.setProperty("--shelf-cover-ratio", `${image.naturalWidth} / ${image.naturalHeight}`);
  frame.style.setProperty("--shelf-cover-width", `${width}px`);
  frame.style.setProperty("--shelf-cover-height", `${Math.round(width / ratio)}px`);
  frame.closest(".game-card")?.style.setProperty("--shelf-cover-width", `${width}px`);
}
function syncRowCoverFrame(image) {
  const ratio = image.naturalWidth && image.naturalHeight ? image.naturalWidth / image.naturalHeight : 104 / 142;
  if (!Number.isFinite(ratio) || ratio <= 0) return;
  const frame = image.closest(".game-row-cover-wrap");
  if (!frame) return;
  const height = 158;
  const width = Math.round(Math.min(190, Math.max(70, height * ratio)));
  frame.style.setProperty("--shelf-cover-ratio", `${image.naturalWidth} / ${image.naturalHeight}`);
  frame.style.setProperty("--shelf-row-preview-width", `${width}px`);
  frame.style.setProperty("--shelf-row-preview-height", `${Math.round(width / ratio)}px`);
}
function platformFallback(platform) { const key = normalize(platform); if (key.includes("switch")) return "assets/platforms/switch.png"; if (key.includes("3ds")) return "assets/platforms/3ds.png"; if (key.includes("ds")) return "assets/platforms/nds.png"; if (key.includes("64")) return "assets/platforms/n64.png"; return "assets/platforms/playstation.png"; }
function shortPlatform(value) { return ({ "Sony PlayStation": "PS1", "Sony PlayStation 2": "PS2", "Sony PlayStation 4": "PS4", "Sony PlayStation 5": "PS5", "Nintendo Switch": "Switch", "Nintendo Switch 2": "Switch 2", "Nintendo DS": "DS", "Nintendo 3DS": "3DS", "Nintendo 64": "N64" })[value] || value; }
function flagAsset(country) { return `assets/flags/${({ "United Kingdom": "gb", Spain: "es", "United States of America": "us", Japan: "jp", Taiwan: "tw", France: "fr", Germany: "de", Australia: "au", China: "cn", Europe: "eu", World: "world" })[country] || "world"}.svg`; }
function flagIcon(country, withClass = false) { return `<img${withClass ? ` class="detail-flag"` : ""} src="${flagAsset(country)}" alt="" width="47" height="31" decoding="async">`; }
function platformBadge(platform) { return `<span class="platform-badge ${platformClass(platform)}" title="${escapeHtml(shortPlatform(platform))}"><span class="platform-icon"><img src="${platformLogo(platform)}" alt="" width="18" height="18" decoding="async"></span><span class="platform-label">${escapeHtml(shortPlatform(platform))}</span></span>`; }
function platformLogo(platform) { const value = normalize(shortPlatform(platform)); if (value === "n64") return "assets/platforms/n64.png"; if (value === "ds") return "assets/platforms/nds.png"; if (value === "3ds") return "assets/platforms/3ds.png"; if (value.includes("switch")) return "assets/platforms/switch.png"; if (value.includes("xbox") || value === "x360" || value === "xone") return "assets/platforms/xbox.png"; if (value.includes("steam") || value === "pc") return "assets/platforms/steam.png"; return "assets/platforms/playstation.png"; }
function platformClass(platform) { const value = normalize(shortPlatform(platform)); if (value === "n64") return "platform-n64"; if (value === "ds") return "platform-ds"; if (value === "3ds") return "platform-3ds"; if (value.includes("switch")) return "platform-nintendo"; if (value.includes("xbox") || value === "x360" || value === "xone") return "platform-xbox"; if (value.includes("steam") || value === "pc") return "platform-pc"; if (value.includes("ps") || value.includes("playstation")) return "platform-playstation"; return "platform-generic"; }
function regionName(country) { return country === "United States of America" ? "United States" : country; }
function regionFor(country) { if (country === "Japan") return "Japan"; if (country === "Taiwan") return "Taiwan"; if (country === "United States of America") return "USA"; if (["United Kingdom", "Spain", "France", "Germany", "Europe"].includes(country)) return country === "Spain" ? "Spain" : "Europe"; return country || "Other"; }
function countValues(values) { const map = new Map(); values.filter(Boolean).forEach((value) => map.set(value, (map.get(value) || 0) + 1)); return [...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])); }
function conditionMatches(game, condition) { const label = conditionLabel(game).toLowerCase(); if (condition === "all") return true; if (condition === "complete") return label === "complete"; if (condition === "complete-plus") return label === "complete +"; if (condition === "loose") return label === "loose"; if (condition === "sealed") return label === "sealed"; return true; }
function sorter(type) { const direction = state.filters.direction === "desc" ? -1 : 1; if (type === "custom") return (a, b) => direction * ((a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER) || a.title.localeCompare(b.title)); if (type === "title" || type === "name") return (a, b) => direction * a.title.localeCompare(b.title); if (type === "added") return (a, b) => direction * (new Date(a.createdAt || 0) - new Date(b.createdAt || 0)); if (type === "value") return (a, b) => direction * ((a.price || 0) - (b.price || 0)); if (type === "region") return (a, b) => direction * (a.country.localeCompare(b.country) || a.title.localeCompare(b.title)); return (a, b) => direction * (a.platform.localeCompare(b.platform) || a.title.localeCompare(b.title)); }
function uniqueSorted(values) { return [...new Set(values.filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), undefined, { sensitivity: "base" })); }
function shelfSortForDefault(value) { if (value === "time") return "added"; if (value === "name") return "title"; return ["added", "title", "platform", "region", "value"].includes(value) ? value : "platform"; }
function applyShelfDefaultOrder(value) { state.filters.sort = shelfSortForDefault(value); state.filters.direction = ["added", "value"].includes(state.filters.sort) ? "desc" : "asc"; }
function bestCollectionPlatform(platforms, fallback) {
  const value = platforms.map(normalize).join(" ");
  if (value.includes("nintendo switch 2")) return "Nintendo Switch 2";
  if (value.includes("nintendo switch")) return "Nintendo Switch";
  if (value.includes("playstation 5")) return "Sony PlayStation 5";
  if (value.includes("playstation 4")) return "Sony PlayStation 4";
  if (value.includes("playstation 2")) return "Sony PlayStation 2";
  if (value.includes("playstation")) return "Sony PlayStation";
  if (value.includes("nintendo 3ds")) return "Nintendo 3DS";
  if (value.includes("nintendo ds")) return "Nintendo DS";
  if (value.includes("nintendo 64")) return "Nintendo 64";
  return fallback || "Nintendo Switch";
}
function normalize(value) { return String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim(); }
function shortDescription(value, max = 260) { const text = String(value || "").trim(); return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text; }
function formatDate(value) { const date = new Date(value); return Number.isNaN(date.getTime()) ? "22 Jun 2026" : new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(date); }
function formatShortDate(value) { const date = String(value || "").match(/\d{4}-\d{2}-\d{2}/)?.[0]; if (!date) return ""; const [year, month, day] = date.split("-"); return `${day}/${month}/${year}`; }
function formatLongDate(value) { const date = String(value || "").match(/\d{4}-\d{2}-\d{2}/)?.[0]; if (!date) return ""; const parsed = new Date(`${date}T00:00:00`); return Number.isNaN(parsed.getTime()) ? "" : new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(parsed); }
function escapeCss(value) { return String(value).replace(/["'()\\]/g, "\\$&"); }
function escapeHtml(value) { return String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]); }
