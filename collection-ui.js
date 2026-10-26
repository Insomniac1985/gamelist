import { bindCardHoverSounds, scrollWithSound, setSoundsDisabled } from "./card-hover-sound.js";
import { renderBatchedList } from "./batched-list.js";
import { embeddedGameEditor, connectEmbeddedGameEditor } from "./shared-add-game.js";
import { normalizeSearchText, bindModalTouchGuard, createGameCardShell, bindActivityCardParallax, mountActivitySlider, mountTwitchPreview, mountReleaseCalendar, finishedGameMarkup, achievementCardMarkup, achievementDashboardMarkup, achievementPanelMarkup, completedCardMarkup, horizontalCarouselState, syncViewModeButton, slideHorizontalCarousel, comparePlayingGames, timeBadgeMarkup, guideLinksMarkup, storeButtonsMarkup, activityTrailerUrl, preloadPausedActivityTrailers, syncFocusedActivityTrailer, activityReleaseStatus, activityCoverOverride, activityLocalGameForTitle, activityTitleMatchScore, activityAllowsPsnCardTrophies, formatFooterDate, formatFooterDateTime, formatFooterShortDate, confirmGameDelete } from "./activity-ui.js";
import { applySiteTheme, normalizeThemeSettings, ownerCardColorClass, ownerColorClass } from "./theme-system.js";
import { applyDocumentTranslations, normalizeLanguage, t } from "./i18n.js";
import { isPlayasiaStore, syncGameListControls, syncGameListSlider, syncCollectionCondition, syncStoreFieldIcon, SHELF_COUNTRIES, preventImplicitGameSubmit } from "./game-editor-controls.js";

const unifiedShelfScope = window.__unifiedShelfScope;
const document = unifiedShelfScope?.document || window.document;

mountActivitySlider(document.querySelector("[data-module='playing']"), { title: "shelfPlayingTitle", count: "shelfPlayingCount", previous: "shelfPlayingPrev", next: "shelfPlayingNext", list: "playingCarousel", finished: "shelfPlayingFinished", finishedList: "finishedCarousel" });
splitShelfPlayingModules();

const SESSION_KEY = "gamelist-editor";
const VERSION_STORAGE_KEY = "gamelist:site-version";
const UPDATES_NOTIFICATION_STORAGE_KEY = "gamelist:updates-notification-version";
const CACHE_HOUR_STORAGE_KEY = "gamelist:cache-hour";

const VIEW_KEY = "gamelist:view-mode";
const LEGACY_VIEW_KEY = "shelf:view-mode:v2";
const LAYOUT_KEY = "shelf:layout:v2";
const LOCAL_DRAFT_KEY = "shelf:draft-data:v2";
const MODULE_CACHE_KEY = "shelf:module-cache:v1";
const ACHIEVEMENT_CACHE_KEY = "gamelist:achievement-cache:v1";
const ACHIEVEMENT_CACHE_TTL_MS = 30 * 60 * 1000;
const DEFAULT_LAYOUT = ["playing", "latestFinished", "favorites", "trophies", "calendar", "kpis", "filters", "library"];
const LAYOUT_KEYS = [...DEFAULT_LAYOUT];
const DEFAULT_HIDDEN_MODULES = ["playing", "trophies"];
const STORE_OPTIONS = ["Amazon", "eBay", "GAME.es", "Xtralife", "Retro Island NY", "GameStop", "Walmart"];
const DEFAULT_PRICE_STORES = ["Amazon"];
const CURRENCY_OPTIONS = ["EUR", "USD", "GBP", "JPY"];
const REGION_OPTIONS = ["ES", "IT", "IE", "FR", "PT", "JP", "MX", "US", "UK"];
const MAX_PRICE_STORES = 5;
const THEMES = {
  shabii: { title: "Shabii's Shelf", icon: "assets/Icon_shelf.png", color: "#ff0039" },
  kash: { title: "Kash's Shelf", icon: "assets/kh_icon.png", color: "#005cff" },
};
const siteVersion = { version: "", updatedAt: "", notificationVersion: 0 };
let updatesPopupLoadPromise = null;
let shelfStatsHoverCleanup = null;
let shelfStatsMobileCleanup = null;

const PLATFORM_OPTIONS = [
  "Steam",
  "Game Gear", "Gen", "DC",
  "GB", "GBC", "NES", "SNES", "N64", "GC", "GBA", "DS", "Wii", "Wii U", "3DS", "Switch", "Switch 2",
  "PS1", "PS2", "PS3", "PSP", "PSVita", "PS4", "PS5",
  "Xbox", "X360", "XOne", "Xbox PC", "Xbox Series",
];
const COUNTRY_OPTIONS = SHELF_COUNTRIES;
const WEEK_START_OPTIONS = [
  ["monday", "Monday"],
  ["tuesday", "Tuesday"],
  ["wednesday", "Wednesday"],
  ["thursday", "Thursday"],
  ["friday", "Friday"],
  ["saturday", "Saturday"],
  ["sunday", "Sunday"],
];
const GAME_OF_YEAR_CATEGORIES = [
  ["goty", "Game of the year"],
  ["story", "Best story"],
  ["artDirection", "Best art direction"],
  ["soundtrack", "Best soundtrack"],
  ["surprise", "Best surprise"],
  ["moment", "Best moment"],
  ["character", "Best character"],
];

function defaultViewModeForDevice() {
  return window.matchMedia?.("(max-width: 699px)")?.matches ? "list" : "grid";
}

function loadSharedViewMode() {
  const saved = localStorage.getItem(VIEW_KEY);
  if (saved === "grid" || saved === "list") return saved;
  const legacy = localStorage.getItem(LEGACY_VIEW_KEY);
  if (legacy === "grid" || legacy === "list") {
    saveSharedViewMode(legacy);
    return legacy;
  }
  return defaultViewModeForDevice();
}

function saveSharedViewMode(mode) {
  localStorage.setItem(VIEW_KEY, mode === "list" ? "list" : "grid");
}

function syncSharedViewModeFromStorage() {
  const next = loadSharedViewMode();
  if (next === state.viewMode) return;
  state.viewMode = next;
  renderChrome();
  renderLibrary();
}

const state = {
  sourceGames: [],
  additions: [],
  overrides: {},
  games: [],
  gamelistGames: [],
  gamelistSettings: loadSharedSettings(),
  metadataLookupResults: [],
  pendingLengthHours: null,
  trophyActivity: null,
  steamActivity: { achievements: [], games: [], completed: [], totalEarned: 0, sourceUrl: "" },
  xboxActivity: { achievements: [], games: [], completed: [], totalEarned: 0, sourceUrl: "" },
  achievementNoticeKey: "",
  cardTrophies: {},
  cardPlaytime: {},
  canEdit: sessionStorage.getItem(SESSION_KEY) === "true",
  editingId: "",
  gamelistAddTarget: "shelf",
  gamelistImportShelfId: "",
  gamelistImportGameId: "",
  autocompleteImport: false,
  lookupResults: [],
  filters: { query: "", platform: "all", region: "all", condition: "all", category: "all", tab: "all", sort: "platform", direction: "asc" },
  viewMode: loadSharedViewMode(),
  completedYear: "all", completedPlatform: "all", completedSort: "time", completedDirection: "desc", completedView: "grid",
  shelfStatsYear: "",
  gamelistDetailGame: null, gamelistDetailTrophyData: [], gamelistDetailTrophyEarned: 0, gamelistDetailTrophyTotal: 0, gamelistDetailTrophyKind: "TROPHIES", gamelistDetailTrophyDirection: "asc",
  completedCoverCache: {},
  releaseCalendarOffset: 0,
  playingTrailerFrame: 0,
  playingHeightFrame: 0,
  paintRefreshFrame: 0,
  renderSettleFrame: 0,
  renderSettleTimer: 0,
  renderSettleObserver: null,
  priceFetchStatus: "",
  shelfSwipeStart: null,
  favoriteGameIds: [],
  showcaseDraftIds: [],
  showcaseFilters: { query: "", platform: "all", region: "all", category: "all" },
  layout: loadLayout(),
};

let shelfEditorDirty = false;
let shelfNewGameTouchedFields = new Set();

const el = {
  brandLink: document.querySelector(".brand"),
  brandVersion: document.querySelector("#brandVersion"),
  stats: document.querySelector("#shelfStats"),
  statsDialog: document.querySelector("#shelfStatsDialog"), statsBrow: document.querySelector("#shelfStatsBrow"), statsTitle: document.querySelector("#shelfStatsTitle"), statsYearSelect: document.querySelector("#shelfStatsYearSelect"), statsBody: document.querySelector("#shelfStatsBody"), statsCloseButton: document.querySelector("#shelfStatsCloseButton"),
  count: document.querySelector("#resultCount"),
  libraryTitle: document.querySelector("#shelfLibraryTitle"),
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
  searchButton: document.querySelector("#searchButton"),
  layoutButton: document.querySelector("#settingsButton"),
  syncButton: document.querySelector("#syncButton"),
  fetchPricesButton: document.querySelector("#fetchPricesButton"),
  topActionsSeparator: document.querySelector(".top-actions-separator"),
  modules: document.querySelector("#shelfModules"),
  favorites: document.querySelector("#favoriteGames"),
  showcaseEdit: document.querySelector("#showcaseEditButton"),
  tabs: document.querySelector("#shelfTabs"),
  playingCarousel: document.querySelector("#playingCarousel"),
  playingTitle: document.querySelector("#shelfPlayingTitle"),
  playingCurrent: document.querySelector("[data-module='playing'] .playing-current"),
  finishedCarousel: document.querySelector("#finishedCarousel"),
  playingFinished: document.querySelector("#shelfPlayingFinished"), playingCount: document.querySelector("#shelfPlayingCount"),
  playingPrev: document.querySelector("#shelfPlayingPrev"), playingNext: document.querySelector("#shelfPlayingNext"),
  trophyCard: document.querySelector("#shelfTrophyCard"),
  releaseCalendar: document.querySelector("#shelfReleaseCalendar"),
  releaseDialog: document.querySelector("#shelfReleaseDialog"),
  releaseCloseButton: document.querySelector("#shelfReleaseCloseButton"),
  releaseDialogTitle: document.querySelector("#shelfReleaseDialogTitle"),
  releaseDialogList: document.querySelector("#shelfReleaseDialogList"),
  footerUpdate: document.querySelector("#footerDataUpdate"),
  footerVersion: document.querySelector("#footerVersion"),
  footerCreditText: document.querySelector("#footerCreditText"),
  scrollTop: document.querySelector("#scrollTopButton"),
  floatingActions: document.querySelector("#floatingEditActions"), floatingAdd: document.querySelector("#floatingAddButton"), floatingSearch: document.querySelector("#floatingSearchButton"),
  mobileActionDock: document.querySelector("#mobileActionDock"), mobileDockUp: document.querySelector("#mobileDockUp"), mobileDockAdd: document.querySelector("#mobileDockAdd"), mobileDockSearch: document.querySelector("#mobileDockSearch"), mobileDockSettings: document.querySelector("#mobileDockSettings"), mobileDockStats: document.querySelector("#mobileDockStats"),
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
  lookupLabelPhysical: document.querySelector("#addGameForm .lookup-label-physical"),
  lookupLabelDigital: document.querySelector("#addGameForm .lookup-label-digital"),
  lookupResults: document.querySelector("#lookupResults"),
  gamelistTargetPicker: document.querySelector("#shelfGamelistTargetPicker"),
  gamelistListPicker: document.querySelector("#shelfGamelistListPicker"),
  gamelistPlacement: document.querySelector("#shelfGamelistPlacement"),
  gamelistSection: document.querySelector("#shelfGamelistSectionInput"),
  gamelistPreorderCheck: document.querySelector("#shelfGamelistPreorderCheck"),
  gamelistPreorderField: document.querySelector("#shelfGamelistPreorderField"),
  gamelistPreorderStore: document.querySelector("#shelfGamelistPreorderStoreInput"),
  editorCoverPreview: document.querySelector("#shelfEditorCoverPreview"),
  gamelistReleaseText: document.querySelector("#shelfGamelistReleaseTextInput"),
  gamelistEmulator: document.querySelector("#shelfGamelistEmulatorInput"),
  gamelistCoop: document.querySelector("#shelfGamelistCoopInput"),
  gamelistMultiplayer: document.querySelector("#shelfGamelistMultiplayerInput"),
  gamelistStream: document.querySelector("#shelfGamelistStreamInput"),
  gamelistPlaying: document.querySelector("#shelfGamelistPlayingInput"),
  gamelistLength: document.querySelector("#shelfGamelistLengthInput"),
  gamelistPreferredStore: document.querySelector("#shelfGamelistPreferredStoreInput"),
  gamelistStatuses: document.querySelector("#shelfGamelistStatusesInput"),
  gamelistImportSummary: document.querySelector("#shelfGamelistImportSummary"),
  digitalInput: document.querySelector("#shelfDigitalInput"),
  platformFieldIcon: document.querySelector(".shelf-platform-field-icon"),
  fields: {
    title: document.querySelector("#titleInput"), platform: document.querySelector("#platformInput"),
    country: document.querySelector("#countryInput"), price: document.querySelector("#priceInput"),
    dlc: document.querySelector("#dlcInput"),
    psPlus: document.querySelector("#psPlusInput"), gamesWithGold: document.querySelector("#gamesWithGoldInput"),
    owners: document.querySelector("#ownersInput"),
    releaseDate: document.querySelector("#releaseDateInput"), additionDate: document.querySelector("#additionDateInput"), trophyName: document.querySelector("#trophyNameInput"),
    upc: document.querySelector("#upcInput"), sku: document.querySelector("#skuInput"), asin: document.querySelector("#asinInput"),
    epid: document.querySelector("#epidInput"), pricechartingId: document.querySelector("#pricechartingIdInput"),
    playstationUrl: document.querySelector("#playstationUrlInput"), nintendoUrl: document.querySelector("#nintendoUrlInput"),
    steamUrl: document.querySelector("#steamUrlInput"), xboxUrl: document.querySelector("#xboxUrlInput"), hltbUrl: document.querySelector("#hltbUrlInput"),
    publisher: document.querySelector("#publisherInput"), developer: document.querySelector("#developerInput"),
    genre: document.querySelector("#genreInput"), cover: document.querySelector("#coverInput"), notes: document.querySelector("#notesInput"), description: document.querySelector("#shelfDescriptionInput"), igdbUrl: document.querySelector("#igdbUrlInput"),
  },
  conditionFields: { game: document.querySelector("#conditionGameInput"), manual: document.querySelector("#conditionManualInput"), box: document.querySelector("#conditionBoxInput"), other: document.querySelector("#conditionOtherInput"), sealed: document.querySelector("#conditionSealedInput") },

  platformOptions: document.querySelector("#shelfPlatformOptions"),

  showcaseDialog: document.querySelector("#showcaseDialog"), showcaseForm: document.querySelector("#showcaseForm"), showcaseClose: document.querySelector("#showcaseClose"),
  showcaseSelected: document.querySelector("#showcaseSelected"), showcaseSearch: document.querySelector("#showcaseSearch"), showcasePlatform: document.querySelector("#showcasePlatform"), showcaseRegion: document.querySelector("#showcaseRegion"), showcaseCategory: document.querySelector("#showcaseCategory"), showcaseDirection: document.querySelector("#showcaseSortDirection"), showcaseCount: document.querySelector("#showcaseCount"), showcaseList: document.querySelector("#showcaseList"),
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
let platformLogoOverlay = null;

init();

// Collection browsing is hosted by Gamelist; only the shared editor has a document entry.
async function init() {
  if (unifiedShelfScope) return initUnifiedShelf();
  if (embeddedGameEditor) return initEmbeddedAddGame();
  window.location.replace("/?list=shelf");
}

function initEmbeddedAddGame() {
  bindCardHoverSounds(document);
  applyTheme();
  document.documentElement.classList.remove("theme-booting");
  populateEditorOptions();
  connectEmbeddedGameEditor({
    dialog: el.addDialog,
    form: el.addForm,
    requestClose: requestShelfEditorClose,
    applyData: applyEmbeddedEditorData,
    saveShelf: saveShelfEditor,
    saveGamelist: saveGamelistTargetFromShelf,
    onLoadError: () => showToast(tt("Could not load current game data. Please try again."), "error"),
    open: options => {
      state.canEdit = true;
      state.gamelistSettings = { ...loadSharedSettings(), ...(options.settings || {}) };
      applyTheme();
      populateEditorOptions();
      applyDocumentTranslations(currentLanguage(), document);
      const sourceShelfGame = options.shelfGameId
        ? state.games.find((game) => game.id === options.shelfGameId)
        : state.games.find((game) => normalizeSearchText(game.title) === normalizeSearchText(options.query || "")
          && shortPlatform(game.platform) === shortPlatform(options.platform || ""));
      const sourceGamelistGame = options.gamelistGame || (options.gamelistGameId
        ? state.gamelistGames.find((game) => game.id === options.gamelistGameId)
        : null);
      const sourceGame = sourceShelfGame || sourceGamelistGame;
      openEditor(sourceGame ? { ...sourceGame, trophyName: sourceGamelistGame?.trophyName || sourceGame.trophyName || "" } : null, {
        digital: Boolean(options.digital),
        target: options.target,
        addToBacklog: Boolean(options.addToBacklog),
        section: options.section,
        miniGamelistImport: Boolean(options.miniGamelistImport),
        autocomplete: Boolean(options.autocomplete),
        importShelfId: options.shelfGameId || sourceShelfGame?.id || "",
        importGameId: options.gamelistGameId || "",
      });
      if (["backlog", "upcoming", "wanted"].includes(options.section)) {
        el.gamelistSection.value = options.section;
        syncShelfGamelistSectionButtons();
        syncStyledSelect(el.gamelistSection);
      }
      if (options.query && !options.miniGamelistImport) {
        el.lookupInput.value = options.query;
        el.fields.title.value = options.query;
        shelfEditorDirty = true;
        void lookupGame();
      }
    },
  });
  bindEvents();
}

function applyEmbeddedEditorData({ shelf: shelfData, gamelist: gamelistData }) {
  state.sourceGames = shelfData.sourceGames || [];
  state.additions = shelfData.games;
  state.overrides = shelfData.overrides || {};
  state.layout = normalizeLayout(shelfData.layout || state.layout);
  state.favoriteGameIds = shelfFavoriteIdsFromSources(shelfData, gamelistData, loadDraft());
  state.gamelistGames = gamelistData.games;
  rebuildGames();
}

function applyShelfSearchFromUrl() {
  const params = new URL(window.location.href).searchParams;
  const query = params.get("search")?.trim() || "";
  if (!query) return;
  el.search.value = query;
  state.filters.query = normalizeSearchText(query);
  if (params.get("tab") === "drive" && state.gamelistSettings.shelfDigitalGames === true) state.filters.tab = "drive";
}

function loadSharedSettings() { try { return JSON.parse(localStorage.getItem("gamelist:settings:v1") || "{}"); } catch { return {}; } }

function bindEvents() {
  bindModalTouchGuard();
  const gameDataDisclosure = document.querySelector("#shelfGameDataDisclosure");
  gameDataDisclosure.addEventListener("toggle", () => {
    if (gameDataDisclosure.dataset.lockedOpen === "true" && !gameDataDisclosure.open) gameDataDisclosure.open = true;
  });
  syncStyledSelect(el.detailTrophySort);
  const shelfToolbar = document.querySelector(".shelf-toolbar");
  const shelfTabs = document.querySelector(".shelf-tabs");
  const syncShelfTabsStickyOffset = () => {
    if (!shelfToolbar || !shelfTabs) return;
    if (shelfToolbar.hidden) {
      shelfTabs.style.removeProperty("--shelf-toolbar-sticky-height");
      return;
    }
    shelfTabs.style.setProperty("--shelf-toolbar-sticky-height", `${shelfToolbar.getBoundingClientRect().height}px`);
  };
  syncShelfTabsStickyOffset();
  if (shelfToolbar && shelfTabs && "ResizeObserver" in window) {
    new ResizeObserver(syncShelfTabsStickyOffset).observe(shelfToolbar);
  }
  window.addEventListener("keydown", (event) => {
    if (unifiedShelfScope) return;
    if (window.innerWidth < 761 || typeof event.key !== "string" || event.key.toLowerCase() !== "f" || event.repeat || event.isComposing) return;
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const target = event.target;
    if (target instanceof HTMLElement && target.closest("input, textarea, select, [contenteditable='true'], [role='textbox'], dialog[open]")) return;
    event.preventDefault();
    scrollToShelfSearch();
  });
  el.brandLink?.addEventListener("click", (event) => {
    event.preventDefault();
    const twitchUrl = twitchChannelUrl(state.gamelistSettings.twitchUser);
    if (twitchUrl) {
      window.open(twitchUrl, "_blank", "noopener,noreferrer");
      return;
    }
    scrollToShelfLibrary();
  });
  el.search.addEventListener("input", () => { state.filters.query = normalizeSearchText(el.search.value); renderFilteredShelf(); });
  el.platform.addEventListener("change", () => { state.filters.platform = el.platform.value; renderFilteredShelf(); });
  el.region.addEventListener("change", () => { state.filters.region = el.region.value; renderFilteredShelf(); });
  el.condition.addEventListener("change", () => { state.filters.condition = el.condition.value; renderFilteredShelf(); });
  el.category.addEventListener("change", () => { state.filters.category = el.category.value; renderFilteredShelf(); });
  el.sort.addEventListener("change", () => { state.filters.sort = el.sort.value; if (["added", "value"].includes(state.filters.sort)) state.filters.direction = "desc"; renderChrome(); renderLibrary(); });
  el.sortDirection.addEventListener("click", () => { state.filters.direction = state.filters.direction === "asc" ? "desc" : "asc"; renderChrome(); renderLibrary(); });
  el.view.addEventListener("click", toggleView);
  el.playingPrev.addEventListener("click", () => slidePlaying(-1));
  el.playingNext.addEventListener("click", () => slidePlaying(1));
  el.playingCarousel.addEventListener("scroll", () => { updatePlayingControls(); scheduleShelfTrailerUpdate(); }, { passive: true });
  el.finishedCarousel.addEventListener("scroll", updateFinishedControls, { passive: true });
  el.clear.addEventListener("click", clearFilters);
  el.stats.addEventListener("click", handleStatsAction);
  el.stats.addEventListener("keydown", handleStatsActionKeydown);
  el.mobileDockStats?.addEventListener("click", openShelfStatsDialog);
  document.addEventListener("click", closePlatformLogoSelects);
  el.login.addEventListener("click", toggleEditMode);
  el.addButton.addEventListener("click", () => openEditor(null, { digital: state.filters.tab === "drive" }));
  el.searchButton?.addEventListener("click", scrollToShelfSearch);
  el.floatingAdd.addEventListener("click", () => state.canEdit ? openEditor(null, { digital: state.filters.tab === "drive" }) : openAuth());
  el.floatingSearch?.addEventListener("click", scrollToShelfSearch);
  el.mobileDockAdd?.addEventListener("click", () => el.floatingAdd.click());
  el.mobileDockSearch?.addEventListener("click", () => {
    el.mobileDockSearch.classList.add("is-active");
    scrollToShelfSearch();
  });
  el.mobileActionDock?.addEventListener("click", (event) => {
    const action = event.target.closest(".mobile-dock-action");
    if (action && action !== el.mobileDockSearch) el.mobileDockSearch?.classList.remove("is-active");
  });
  document.addEventListener("pointerdown", (event) => {
    if (!el.mobileActionDock?.contains(event.target)) el.mobileDockSearch?.classList.remove("is-active");
  });
  el.mobileDockSettings?.addEventListener("click", openLayout);

  el.layoutButton.addEventListener("click", openLayout);
  el.showcaseEdit.addEventListener("click", openShowcaseEditor);
  el.syncButton?.addEventListener("click", syncShelfNow);
  el.fetchPricesButton.addEventListener("click", refreshAllShelfPrices);
  el.scrollTop.addEventListener("click", () => scrollWithSound(0));
  el.mobileDockUp?.addEventListener("click", () => el.scrollTop.click());
  el.footerUpdate.addEventListener("click", clearSiteCachesAndReload);
  el.footerVersion.addEventListener("click", clearSiteCachesAndReload);
  el.brandVersion?.addEventListener("click", clearSiteCachesAndReload);
  window.addEventListener("scroll", updateFloatingActions, { passive: true });
  window.addEventListener("storage", (event) => {
    if (event.key === "gamelist-editor-signal") refreshSharedAuth();
    if (event.key === VIEW_KEY || event.key === LEGACY_VIEW_KEY) syncSharedViewModeFromStorage();
  });
  window.addEventListener("focus", refreshSharedAuth);
  window.addEventListener("resize", () => { syncDisplayMode(); updatePlayingControls(); updateFinishedControls(); schedulePlayingCardHeightSync(); syncShelfTabIndicator(); syncShelfTabsStickyOffset(); syncShelfGamelistTargetIndicator(); }, { passive: true });
  window.matchMedia("(display-mode: standalone)").addEventListener?.("change", syncDisplayMode);
  document.addEventListener("pointerover", handleSelectOverflowTitle);
  document.addEventListener("focusin", handleSelectOverflowTitle);
  document.addEventListener("pointerout", handleSelectOverflowLeave);
  document.addEventListener("focusout", handleSelectOverflowLeave);
  document.addEventListener("click", toggleShelfLivePlaytimePill, true);

  el.shelf.addEventListener("click", handleShelfClick);
  el.shelf.addEventListener("keydown", (event) => { if (event.key !== "Enter" && event.key !== " ") return; const card = event.target.closest("[data-id]"); if (!card || event.target.closest("button, a, input")) return; event.preventDefault(); const game = shelfDisplayedGameById(card.dataset.id); if (game) game.preorderProjection || game.wishlistProjection ? openGamelistDetails(game) : openDetails(game); });
  el.favorites.addEventListener("click", handleFavoriteClick);
  el.favorites.addEventListener("keydown", handleFavoriteKeydown);
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

  el.addClose.addEventListener("click", requestShelfEditorClose);
  el.editDelete.addEventListener("click", deleteCurrentEditedGame);
  el.addDialog.addEventListener("click", (event) => { if (event.target === el.addDialog) requestShelfEditorClose(); });
  el.addDialog.addEventListener("cancel", (event) => {
    if (!shelfEditorDirty) return;
    event.preventDefault();
    showShelfEditorUnsavedDialog();
  });
  el.addForm.addEventListener("keydown", preventImplicitGameSubmit);
  el.addForm.addEventListener("submit", saveEditor);
  el.addForm.addEventListener("input", (event) => { shelfEditorDirty = true; markShelfNewGameFieldTouched(event); });
  el.addForm.addEventListener("change", (event) => { shelfEditorDirty = true; markShelfNewGameFieldTouched(event); });
  el.addForm.addEventListener("pointerdown", markShelfNewGameFieldTouched);
  el.addForm.addEventListener("focusin", markShelfNewGameFieldTouched);
  el.gamelistTargetPicker.addEventListener("click", (event) => {
    const button = event.target.closest("[data-gamelist-target]");
    if (button) setShelfGamelistAddTarget(button.dataset.gamelistTarget);
  });
  el.gamelistListPicker.querySelector(".shelf-gamelist-section-options")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-gamelist-section]");
    if (!button) return;
    state.gamelistSectionTouched = true;
    const wasCollection = !isGamelistProjectionTarget() || el.gamelistSection.value === "backlog";
    const collection = button.dataset.gamelistSection === "collection";
    if (wasCollection && !collection) clearShelfSpecificEditorData();
    if (collection) {
      el.gamelistSection.value = "backlog";
      state.gamelistAddTarget = document.querySelector("#shelfAddCollectionInput").checked ? "gamelist" : "shelf";
    } else {
      state.gamelistAddTarget = "gamelist";
      el.gamelistSection.value = button.dataset.gamelistSection;
      document.querySelector("#shelfAddCollectionInput").checked = false;
      el.gamelistPlaying.checked = false;
      el.gamelistStream.checked = false;
    }
    syncShelfGamelistTargetMode();
    syncStyledSelect(el.gamelistSection);
  });
  el.gamelistPreorderCheck?.addEventListener("change", () => {
    el.gamelistPreorderField.hidden = !el.gamelistPreorderCheck.checked;
    el.gamelistPreorderField.closest(".shelf-gamelist-preorder-row")?.classList.toggle("has-preorder-store", el.gamelistPreorderCheck.checked);
    if (el.gamelistPreorderCheck.checked) el.gamelistSection.value = "upcoming";
    else el.gamelistPreorderStore.value = "";
    syncShelfGamelistStoreIcons();
    syncShelfGamelistSectionButtons();
    syncShelfGamelistPreorderRequirement();
  });
  el.gamelistPreorderStore.addEventListener("input", syncShelfGamelistPreorderRequirement);
  el.gamelistPreorderStore.addEventListener("input", syncShelfGamelistStoreIcons);
  el.gamelistPreferredStore.addEventListener("input", syncShelfGamelistStoreIcons);
  el.gamelistPreferredStore.addEventListener("change", syncShelfGamelistStoreIcons);
  syncShelfGamelistStoreIcons();
  el.gamelistStream.addEventListener("change", () => {
    syncShelfGamelistTargetMode();
  });
  el.gamelistPlaying.addEventListener("change", () => {
    if (el.gamelistPlaying.checked) {
      document.querySelector("#shelfAddCollectionInput").checked = true;
      state.gamelistSectionTouched = true;
      el.gamelistSection.value = "backlog";
      state.gamelistAddTarget = "gamelist";
    }
    syncShelfGamelistTargetMode();
  });
  document.querySelector("#shelfAddCollectionInput").addEventListener("change", () => {
    shelfNewGameTouchedFields.add("collection-choice");
    state.gamelistSectionTouched = true;
    el.gamelistSection.value = "backlog";
    state.gamelistAddTarget = document.querySelector("#shelfAddCollectionInput").checked ? "gamelist" : "shelf";
    if (state.gamelistAddTarget === "shelf") el.gamelistPlaying.checked = false;
    syncShelfGamelistTargetMode();
  });
  syncShelfGamelistPreorderStreamLayout();
  el.gamelistSection.addEventListener("change", syncShelfGamelistSectionButtons);
  document.querySelector("#editorUnsavedDialog [data-editor-unsaved-cancel]")?.addEventListener("click", () => closeDialog(document.querySelector("#editorUnsavedDialog")));
  document.querySelector("#editorUnsavedDialog [data-editor-unsaved-save]")?.addEventListener("click", () => {
    closeDialog(document.querySelector("#editorUnsavedDialog"));
    el.addForm.requestSubmit(el.addForm.querySelector("button[type='submit']"));
  });
  document.querySelector("#editorUnsavedDialog [data-editor-unsaved-discard]")?.addEventListener("click", () => {
    shelfEditorDirty = false;
    closeDialog(document.querySelector("#editorUnsavedDialog"));
    closeDialog(el.addDialog);
  });
  el.fields.platform.addEventListener("input", syncShelfEditorIcons);
  el.fields.platform.addEventListener("change", () => {
    const platform = canonicalShelfPlatform(el.fields.platform.value);
    el.fields.platform.value = platform ? platformDisplayName(platform) : "";
    syncShelfEditorIcons();
  });
  el.fields.releaseDate.addEventListener("input", syncShelfGamelistSectionForTarget);
  el.fields.releaseDate.addEventListener("change", syncShelfGamelistSectionForTarget);
  el.fields.country.addEventListener("change", syncShelfEditorIcons);
  el.fields.cover.addEventListener("input", syncShelfEditorCoverPreview);
  el.fields.cover.addEventListener("change", syncShelfEditorCoverPreview);
  window.matchMedia("(min-width: 700px)").addEventListener("change", () => syncShelfGamelistTargetMode());
  el.lookupButton.addEventListener("click", lookupGame);
  el.digitalInput.addEventListener("change", () => {
    if (!el.digitalInput.checked) {
      el.fields.dlc.checked = false;
      el.fields.psPlus.checked = false;
      el.fields.gamesWithGold.checked = false;
    }
    syncShelfDigitalEditorMode(el.digitalInput.checked);
  });
  el.gamelistCoop.addEventListener("change", () => {
    el.gamelistMultiplayer.checked = el.gamelistCoop.checked;
  });
  el.gamelistMultiplayer.addEventListener("change", () => {
    if (!el.gamelistMultiplayer.checked) el.gamelistCoop.checked = false;
  });
  el.fields.dlc.addEventListener("change", () => {
    el.digitalInput.checked = el.fields.dlc.checked;
    syncShelfDigitalEditorMode(el.digitalInput.checked);
  });
  el.lookupInput.addEventListener("keydown", (event) => { if (event.key === "Enter") { event.preventDefault(); lookupGame(); } });
  el.lookupResults.addEventListener("click", chooseLookupResult);
  Object.values(el.conditionFields).forEach((input) => input.addEventListener("change", () => syncConditionInputs(input)));
  document.addEventListener("error", handleCoverImageError, true);

  el.showcaseClose.addEventListener("click", () => closeDialog(el.showcaseDialog));
  el.showcaseDialog.addEventListener("click", (event) => { if (event.target === el.showcaseDialog) closeDialog(el.showcaseDialog); });
  el.showcaseForm.addEventListener("submit", saveShowcase);
  el.showcaseSearch.addEventListener("input", () => { state.showcaseFilters.query = normalizeSearchText(el.showcaseSearch.value); renderShowcasePicker(); });
  el.showcasePlatform.addEventListener("change", () => { state.showcaseFilters.platform = el.showcasePlatform.value; renderShowcasePicker(); });
  el.showcaseRegion.addEventListener("change", () => { state.showcaseFilters.region = el.showcaseRegion.value; renderShowcasePicker(); });
  el.showcaseCategory.addEventListener("change", () => { state.showcaseFilters.category = el.showcaseCategory.value; renderShowcasePicker(); });
  el.showcaseDirection.addEventListener("click", () => { state.showcaseFilters.direction = state.showcaseFilters.direction === "asc" ? "desc" : "asc"; renderShowcasePicker(); });
  el.showcaseList.addEventListener("scroll", updateShowcaseScrollFades, { passive: true });
  el.showcaseList.addEventListener("click", handleShowcasePick);
  el.showcaseSelected.addEventListener("click", handleShowcaseSelectedClick);
  el.completedClose.addEventListener("click", () => closeDialog(el.completedDialog));
  el.completedDialog.addEventListener("click", (event) => { if (event.target === el.completedDialog) closeDialog(el.completedDialog); });
  el.statsDialog?.addEventListener("click", (event) => { if (event.target === el.statsDialog) closeDialog(el.statsDialog); });
  el.statsCloseButton?.addEventListener("click", () => closeDialog(el.statsDialog));
  el.statsYearSelect?.addEventListener("change", () => { state.shelfStatsYear = el.statsYearSelect.value; renderShelfStatsDialog(); });
  el.releaseCloseButton.addEventListener("click", () => closeDialog(el.releaseDialog));
  el.releaseDialog.addEventListener("click", (event) => { if (event.target === el.releaseDialog) closeDialog(el.releaseDialog); });
  el.authClose.addEventListener("click", () => closeDialog(el.authDialog));
  el.authCancel.addEventListener("click", () => closeDialog(el.authDialog));
  el.authDialog.addEventListener("click", (event) => { if (event.target === el.authDialog) closeDialog(el.authDialog); });
  el.authForm.addEventListener("submit", submitAuth);
}

function openShelfStatsDialog() {
  const years = shelfStatsYears();
  const currentYear = String(new Date().getFullYear());
  const defaultYear = years.includes(currentYear) ? currentYear : years[0] || currentYear;
  if (state.shelfStatsYear !== "all" && !years.includes(state.shelfStatsYear)) state.shelfStatsYear = defaultYear;
  el.statsYearSelect.innerHTML = ["all", ...years].map((year) => `<option value="${year}">${escapeHtml(year === "all" ? tt("All") : year)}</option>`).join("");
  el.statsYearSelect.value = state.shelfStatsYear;
  syncStyledSelect(el.statsYearSelect, { activeValue: "all" });
  renderShelfStatsDialog();
  openDialog(el.statsDialog);
}

function shelfStatsYears() {
  const years = [...new Set(state.games.filter((game) => !game.deletedAt && !isPendingCollectionGame(game) && (state.gamelistSettings.shelfDigitalGames === true || !isDigitalShelfGame(game))).map((game) => shelfStatsDate(game)?.getFullYear()).filter(Number.isFinite).map(String))].sort((a, b) => Number(b) - Number(a));
  return years.length ? years : unifiedShelfScope ? [] : [String(new Date().getFullYear())];
}

function shelfStatsDate(game) {
  const time = Date.parse(game?.createdAt || "");
  return Number.isFinite(time) ? new Date(time) : null;
}

function shelfDateInputValue(value) {
  if (!value) return "";
  const isoDate = String(value).match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoDate) return isoDate[1];
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function shelfCreatedAtForDate(dateValue, existing) {
  if (!dateValue) return existing?.createdAt || new Date().toISOString();
  if (shelfDateInputValue(existing?.createdAt) === dateValue) return existing.createdAt;
  if (dateValue === shelfTodayInputValue()) return new Date().toISOString();
  return `${dateValue}T12:00:00.000Z`;
}

function renderShelfStatsDialog() {
  const year = state.shelfStatsYear || "all";
  const allGames = state.games.filter((game) => !game.deletedAt && !isPendingCollectionGame(game) && shelfStatsDate(game) && (state.gamelistSettings.shelfDigitalGames === true || !isDigitalShelfGame(game)));
  const games = allGames.filter((game) => year === "all" || shelfStatsDate(game)?.getFullYear() === Number(year));
  const physical = games.filter((game) => !isDigitalShelfGame(game));
  const digital = games.filter(isDigitalShelfGame);
  const physicalValue = physical.reduce((sum, game) => sum + collectionValueFor(game), 0);
  const platformCounts = shelfStatsCountBy(games, (game) => canonicalShelfPlatform(game.platform || "Unknown") || "Unknown");
  const categoryCounts = shelfStatsCountBy(games, shelfStatsCategories);
  const regionCounts = shelfStatsCountBy(physical, shelfStatsRegion);
  const mediaCounts = [
    { label: "Physical", count: physical.length, color: "#2f343d" },
    { label: "Digital", count: digital.length, color: "#d8dde6" },
  ].filter((item) => item.count);
  const showPhysicalKpi = Boolean(physical.length && digital.length);
  const showPriceKpi = Boolean(physical.length && shelfPricesVisible());
  const kpiCount = 1 + Number(showPhysicalKpi) + Number(Boolean(digital.length)) + Number(showPriceKpi);
  const monthNames = Array.from({ length: 12 }, (_, month) => new Intl.DateTimeFormat(currentLanguage(), { month: "short" }).format(new Date(2020, month, 1)));
  const shownYear = year === "all" ? tt("All time") : year;
  el.statsBrow.textContent = year === "all" ? tt("All-time statistics") : tt("YEARLY STATISTICS");
  el.statsTitle.textContent = year === "all"
    ? tt("All your game collection")
    : tt("Games added on {year}", { year: shownYear });
  const chartMarkup = [
    shelfStatsDonutCard(tt("Platforms"), platformCounts, "platform", 5, { games }),
    shelfStatsDonutCard(tt("Categories"), categoryCounts, "category", 5, { games }),
    ...(physical.length ? [shelfStatsDonutCard(tt("Region"), regionCounts, "region", 5, { games: physical, fullWidth: !digital.length })] : []),
    ...(digital.length ? [shelfStatsDonutCard(tt("Physical / digital"), mediaCounts, "media", mediaCounts.length, { staticLegend: true, fullWidth: !physical.length })] : []),
  ].join("");
  const activityChart = year === "all"
    ? shelfStatsYearBars(allGames)
    : shelfStatsMonthBars(games, monthNames);
  el.statsBody.innerHTML = `
    <div class="finished-stats-kpis${kpiCount === 1 ? " is-shelf-one" : kpiCount === 2 ? " is-shelf-two" : ""}">
      <article class="finished-stats-kpi is-finished"><strong>${games.length}</strong><span>${escapeHtml(tt("Games added"))}</span></article>
      ${showPhysicalKpi ? `<article class="finished-stats-kpi is-completed" tabindex="0" data-stats-overlay-title="${escapeHtml(`${tt("Physical games")} · ${physical.length} ${tt("games")}`)}"><strong>${physical.length}</strong><span>${escapeHtml(tt("Physical games"))}</span><div class="finished-stats-breakdown">${shelfStatsGameRows(physical)}</div></article>` : ""}
      ${digital.length ? `<article class="finished-stats-kpi is-streamed" tabindex="0" data-stats-overlay-title="${escapeHtml(`${tt("Digital games")} · ${digital.length} ${tt("games")}`)}"><strong>${digital.length}</strong><span>${escapeHtml(tt("Digital games"))}</span><div class="finished-stats-breakdown">${shelfStatsGameRows(digital)}</div></article>` : ""}
      ${showPriceKpi ? `<article class="finished-stats-kpi is-price"><strong>${escapeHtml(formatWholeMoney(physicalValue, normalizePriceSettings(state.gamelistSettings).currency))}</strong><span>${escapeHtml(tt("Estimated physical"))}</span></article>` : ""}
    </div>
    <div class="finished-stats-charts">${chartMarkup}</div>
    ${activityChart}
    ${games.length ? "" : `<div class="empty">${escapeHtml(tt("No games added{year}.", { year: year === "all" ? "" : ` ${tt("in {year}", { year })}` }))}</div>`}
  `;
  bindShelfStatsHoverDetails();
}

function shelfStatsCountBy(games, getLabels) {
  const counts = new Map();
  for (const game of games) {
    const value = getLabels(game);
    const labels = Array.isArray(value) ? value : [value];
    for (const label of new Set(labels.map((value) => String(value || "").trim()).filter(Boolean))) counts.set(label, (counts.get(label) || 0) + 1);
  }
  return [...counts].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

function shelfStatsCategories(game) {
  // Shelf entries store their selected categories in `genre` as a comma-separated
  // string; `genres` is used by imported/preorder records. Read both formats.
  const labels = [
    ...String(game.genre || "").split(","),
    ...(Array.isArray(game.genres) ? game.genres : []),
    ...(Array.isArray(game.categories) ? game.categories : []),
    game.category || "",
  ]
    .map((value) => String(value || "").trim())
    .filter((value) => value && normalizeSearchText(value) !== "game");
  const uniqueLabels = [...new Map(labels.map((label) => [normalizeSearchText(label), label])).values()];
  return uniqueLabels.length ? uniqueLabels : [tt("Uncategorized")];
}

function shelfStatsRegion(game) {
  const region = String(game?.region || "").trim();
  if (region) return region;
  const country = String(game?.country || "").trim();
  return country ? regionFor(country) : tt("Unknown");
}

function shelfStatsDonutCard(title, counts, tone, visibleLimit, options = {}) {
  const showAll = options.staticLegend;
  const visible = showAll ? counts : counts.slice(0, visibleLimit);
  const rows = (items) => items.length ? items.map((item, index) => shelfStatsLegendRow(item, tone, index)).join("") : `<span><b>${escapeHtml(tt("None"))}</b><em>0</em></span>`;
  const expanded = !showAll && counts.length > visible.length;
  return `
    <article class="finished-stats-chart shelf-stats-radial-chart${options.staticLegend ? " is-static" : ""}${tone === "media" ? " is-media" : ""}${options.fullWidth ? " is-full-width" : ""}"${options.staticLegend ? "" : ' tabindex="0"'}>
      <h3>${escapeHtml(title)}</h3>
      <div class="finished-stats-donut ${tone === "platform" ? "is-platform" : tone === "media" ? "is-media" : tone === "region" ? "is-region" : "is-category"}">${shelfStatsPieMarkup(counts, tone, options.games || [])}</div>
      <div class="finished-stats-chart-copy">
        <div class="finished-stats-chart-list" data-stats-overlay-title="${escapeHtml(title)}">${showAll ? rows(counts) : `${rows(visible)}${expanded ? `<span class="finished-stats-more-row" aria-hidden="true">...</span>` : ""}<div class="finished-stats-breakdown">${rows(counts)}</div>`}</div>
      </div>
    </article>
  `;
}

function shelfStatsLegendRow(item, tone, index) {
  if (tone === "platform") return `<span class="finished-stats-platform-row"><b>${platformBadge(item.label)}</b><em>${item.count}</em></span>`;
  const color = item.color || shelfStatsSegmentColor(item.label, tone, index);
  const label = tone === "media"
    ? shelfStatsMediaLabel(item.label)
    : tone === "region"
      ? shelfStatsRegionBadge(item.label)
      : `<i></i>${escapeHtml(tt(item.label))}`;
  return `<span class="finished-stats-category-row" style="--category-stat-color:${escapeHtml(color)}"><b>${label}</b><em>${item.count}</em></span>`;
}

function shelfStatsRegionBadge(label) {
  const normalized = normalizeSearchText(label);
  const country = ({ usa: "United States of America", us: "United States of America", eu: "Europe", europe: "Europe", uk: "United Kingdom" })[normalized] || label;
  return `<span class="shelf-stats-region-label"><img src="${escapeHtml(flagAsset(country))}" alt="" width="20" height="14" decoding="async">${escapeHtml(tt(label))}</span>`;
}

function shelfStatsMediaLabel(label) {
  const normalized = normalizeSearchText(label);
  const icon = normalized === "digital" ? downloadBadgeIcon() : physicalDiskIcon();
  return `<span class="finished-stats-media-label"><span class="finished-stats-media-icon" aria-hidden="true">${icon}</span>${escapeHtml(tt(label))}</span>`;
}

function shelfStatsPieMarkup(counts, tone, games = []) {
  const total = counts.reduce((sum, item) => sum + item.count, 0);
  if (!total) return `<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="46" fill="rgba(255,255,255,.08)"></circle></svg>`;
  let cursor = 0;
  const segments = counts.map((item, index) => {
    const start = cursor;
    cursor += item.count / total * 360;
    const color = item.color || shelfStatsSegmentColor(item.label, tone, index);
    const point = (angle, radius = 46) => ({ x: 50 + radius * Math.cos((angle - 90) * Math.PI / 180), y: 50 + radius * Math.sin((angle - 90) * Math.PI / 180) });
    const sweep = cursor - start;
    const shape = sweep >= 359.99
      ? `<circle class="finished-stats-pie-shape" cx="50" cy="50" r="46" fill="${escapeHtml(color)}" stroke="rgba(255,255,255,.22)" stroke-width="0.9"></circle>`
      : (() => {
        const from = point(start);
        const to = point(cursor);
        const large = sweep > 180 ? 1 : 0;
        return `<path class="finished-stats-pie-shape" d="M 50 50 L ${from.x.toFixed(3)} ${from.y.toFixed(3)} A 46 46 0 ${large} 1 ${to.x.toFixed(3)} ${to.y.toFixed(3)} Z" fill="${escapeHtml(color)}" stroke="rgba(255,255,255,.22)" stroke-width="0.9"></path>`;
      })();
    const mid = point(start + sweep / 2, 34);
    const tipX = Math.max(16, Math.min(84, mid.x));
    const tipY = Math.max(14, Math.min(86, mid.y));
    const segmentGames = shelfStatsSegmentGames(item.label, tone, games);
    const percent = Math.round(item.count / total * 100);
    return {
      shape: `<g class="finished-stats-pie-segment finished-stats-pie-segment-${index}" data-segment-label="${escapeHtml(item.label)}" style="--slice-opacity:${index % 2 ? 0.78 : 0.96}" tabindex="0">${shape}</g>`,
      tip: `<div class="finished-stats-segment-tip finished-stats-segment-tip-${index}" style="--tip-x:${tipX.toFixed(2)}%;--tip-y:${tipY.toFixed(2)}%"><span class="finished-stats-segment-percent">${percent}%</span>${tone === "platform" ? platformBadge(item.label) : tone === "region" ? shelfStatsRegionBadge(item.label) : `<b>${escapeHtml(item.label)}</b>`}<span class="finished-stats-segment-count">${item.count}</span></div>`,
    };
  });
  const tipCss = segments.map((_, index) => `
    .finished-stats-donut:has(.finished-stats-pie-segment-${index}:hover) .finished-stats-pie-shape,
    .finished-stats-donut:has(.finished-stats-pie-segment-${index}:focus-visible) .finished-stats-pie-shape,
    .finished-stats-donut:has(.finished-stats-segment-tip-${index}:hover) .finished-stats-pie-shape,
    .finished-stats-donut:has(.finished-stats-segment-tip-${index}:focus-within) .finished-stats-pie-shape { filter: saturate(.42) brightness(.72); opacity: .5; }
    .finished-stats-donut:has(.finished-stats-pie-segment-${index}:hover) .finished-stats-pie-segment-${index} .finished-stats-pie-shape,
    .finished-stats-donut:has(.finished-stats-pie-segment-${index}:focus-visible) .finished-stats-pie-segment-${index} .finished-stats-pie-shape,
    .finished-stats-donut:has(.finished-stats-segment-tip-${index}:hover) .finished-stats-pie-segment-${index} .finished-stats-pie-shape,
    .finished-stats-donut:has(.finished-stats-segment-tip-${index}:focus-within) .finished-stats-pie-segment-${index} .finished-stats-pie-shape { filter: brightness(1.18) saturate(1.12); opacity: .98; transform: scale(1.025); }
    .finished-stats-donut:has(.finished-stats-pie-segment-${index}:hover) .finished-stats-segment-tip-${index},
    .finished-stats-donut:has(.finished-stats-pie-segment-${index}:focus-visible) .finished-stats-segment-tip-${index},
    .finished-stats-donut:has(.finished-stats-segment-tip-${index}:hover) .finished-stats-segment-tip-${index},
    .finished-stats-donut:has(.finished-stats-segment-tip-${index}:focus-within) .finished-stats-segment-tip-${index} { opacity: 1; transform: translate(-50%, -50%) scale(1); pointer-events: auto; }
  `).join("");
  return `<svg viewBox="0 0 100 100" role="img" aria-label="${escapeHtml(tt("Stats breakdown"))}">${segments.map((segment) => segment.shape).join("")}</svg><div class="finished-stats-pie-tips">${segments.map((segment) => segment.tip).join("")}</div><style>${tipCss}</style>`;
}

function shelfStatsSegmentGames(label, tone, games) {
  if (tone === "platform") return games.filter((game) => (canonicalShelfPlatform(game.platform || "Unknown") || "Unknown") === label);
  if (tone === "category") return games.filter((game) => shelfStatsCategories(game).includes(label));
  if (tone === "region") return games.filter((game) => shelfStatsRegion(game) === label);
  if (tone === "media") return games.filter((game) => (isDigitalShelfGame(game) ? "Digital" : "Physical") === label);
  return [];
}

function shelfStatsGameRows(games) {
  const year = state.shelfStatsYear || "all";
  const hasDigital = state.games.some((game) => !isPendingCollectionGame(game)
    && shelfStatsDate(game)
    && (year === "all" || shelfStatsDate(game).getFullYear() === Number(year))
    && isDigitalShelfGame(game));
  return [...games]
    .sort((a, b) => (shelfStatsDate(b)?.getTime() || 0) - (shelfStatsDate(a)?.getTime() || 0))
    .map((game) => {
      const platform = game.platform ? platformBadge(game.platform) : "";
      const mediaPill = hasDigital ? shelfStatsMediaPill(game) : "";
      const trailing = platform || mediaPill ? `<span class="shelf-stats-game-trailing">${platform}${mediaPill}</span>` : "";
      return `<span class="finished-stats-game-row"><b>${escapeHtml(game.title || "Untitled")}</b>${trailing}</span>`;
    })
    .join("");
}

function shelfStatsMediaPill(game) {
  const label = isDigitalShelfGame(game) ? "Digital" : "Physical";
  const cls = platformClass(game.platform || "");
  const icon = isDigitalShelfGame(game) ? downloadBadgeIcon() : physicalDiskIcon(cls);
  return `<span class="shelf-stats-media-pill media-format-pill is-icon-only ${escapeHtml(cls)}" title="${escapeHtml(tt(label))}" aria-label="${escapeHtml(tt(label))}"><span class="finished-stats-media-icon" aria-hidden="true">${icon}</span></span>`;
}

function bindShelfStatsHoverDetails() {
  shelfStatsHoverCleanup?.();
  shelfStatsMobileCleanup?.();
  const dialog = el.statsDialog;
  const body = el.statsBody;
  let closeTimer = 0;
  const removers = [];
  const listen = (node, event, handler, options) => {
    node.addEventListener(event, handler, options);
    removers.push(() => node.removeEventListener(event, handler, options));
  };
  const close = () => {
    closeTimer = 0;
    dialog.querySelector(".shelf-stats-hover-float")?.remove();
    body.querySelectorAll(".finished-stats-floating-source").forEach((node) => node.classList.remove("finished-stats-floating-source"));
  };
  const scheduleClose = () => {
    window.clearTimeout(closeTimer);
    closeTimer = window.setTimeout(close, 110);
  };
  const open = (anchor, content, title = "") => {
    if (window.matchMedia("(max-width: 699px)").matches || !content.trim()) return;
    window.clearTimeout(closeTimer);
    close();
    anchor.classList.add("finished-stats-floating-source");
    const floating = document.createElement("div");
    floating.className = "finished-stats-breakdown finished-stats-hover-float shelf-stats-hover-float";
    floating.innerHTML = `${title ? `<strong class="finished-stats-breakdown-title">${escapeHtml(title)}</strong>` : ""}${content}`;
    dialog.appendChild(floating);
    const width = Math.min(340, Math.max(220, window.innerWidth - 32));
    floating.style.width = `${width}px`;
    floating.style.maxWidth = `${Math.max(180, window.innerWidth - 32)}px`;
    floating.style.maxHeight = `${Math.max(140, Math.min(300, window.innerHeight - 32))}px`;
    const anchorRect = anchor.getBoundingClientRect();
    const rect = floating.getBoundingClientRect();
    const dialogRect = dialog.getBoundingClientRect();
    const margin = 12;
    const clamp = (value, min, max) => Math.max(min, Math.min(value, max));
    const maxLeft = Math.max(margin, dialogRect.width - rect.width - margin);
    const left = clamp(anchorRect.left - dialogRect.left, margin, maxLeft);
    const maxTop = Math.max(margin, dialogRect.height - rect.height - margin);
    const below = anchorRect.bottom - dialogRect.top + 8;
    const above = anchorRect.top - dialogRect.top - rect.height - 8;
    const top = clamp(below + rect.height <= dialogRect.height - margin ? below : above, margin, maxTop);
    floating.style.left = `${left}px`;
    floating.style.top = `${top}px`;
    floating.addEventListener("mouseenter", () => window.clearTimeout(closeTimer));
    floating.addEventListener("mouseleave", scheduleClose);
  };
  body.querySelectorAll("[data-stats-overlay-title]").forEach((node) => {
    if (unifiedShelfScope && !node.closest("[data-stats-source=collection]")) return;
    const breakdown = node.querySelector(".finished-stats-breakdown");
    if (!breakdown?.innerHTML.trim()) return;
    const show = () => {
      const hasTitle = Boolean(breakdown.querySelector(":scope > .finished-stats-breakdown-title"));
      open(node, breakdown.innerHTML, hasTitle ? "" : (node.dataset.statsOverlayTitle || ""));
    };
    listen(node, "mouseenter", show);
    listen(node, "mouseleave", scheduleClose);
    listen(node, "focusin", show);
    listen(node, "focusout", scheduleClose);
  });
  body.querySelectorAll(".finished-stats-donut").forEach((donut) => {
    if (unifiedShelfScope && !donut.closest("[data-stats-source=collection]")) return;
    donut.querySelectorAll(".finished-stats-pie-segment").forEach((segment) => {
      const index = [...segment.classList].find((name) => name.startsWith("finished-stats-pie-segment-"))?.replace("finished-stats-pie-segment-", "");
      const tip = index ? donut.querySelector(`.finished-stats-segment-tip-${index}`) : null;
      if (!tip) return;
      const itemLabel = segment.dataset.segmentLabel || "";
      const tone = donut.classList.contains("is-platform") ? "platform" : donut.classList.contains("is-media") ? "media" : donut.classList.contains("is-region") ? "region" : "category";
      const games = state.games.filter((game) => !isPendingCollectionGame(game) && shelfStatsDate(game) && (state.shelfStatsYear === "all" || shelfStatsDate(game).getFullYear() === Number(state.shelfStatsYear)));
      const matchingGames = shelfStatsSegmentGames(itemLabel, tone, games);
      const gameRows = shelfStatsGameRows(matchingGames);
      if (!gameRows) return;
      const show = () => open(segment, gameRows, `${itemLabel} · ${matchingGames.length} ${tt("games")}`);
      listen(segment, "mouseenter", show);
      listen(segment, "mouseleave", scheduleClose);
      listen(segment, "focusin", show);
      listen(segment, "focusout", scheduleClose);
    });
  });
  listen(dialog, "scroll", close, { passive: true });
  listen(window, "resize", close);
  shelfStatsHoverCleanup = () => {
    window.clearTimeout(closeTimer);
    close();
    removers.forEach((remove) => remove());
  };
  const onMobileTap = (event) => {
    if (!window.matchMedia("(max-width: 699px)").matches) return;
    const segment = event.target.closest(".finished-stats-pie-segment");
    if (segment && body.contains(segment)) {
      if (unifiedShelfScope && !segment.closest("[data-stats-source=collection]")) return;
      const donut = segment.closest(".finished-stats-donut");
      const label = segment.dataset.segmentLabel || "";
      const tone = donut?.classList.contains("is-platform") ? "platform" : donut?.classList.contains("is-media") ? "media" : donut?.classList.contains("is-region") ? "region" : "category";
      const games = state.games.filter((game) => !isPendingCollectionGame(game) && shelfStatsDate(game) && (state.shelfStatsYear === "all" || shelfStatsDate(game).getFullYear() === Number(state.shelfStatsYear)));
      const matching = shelfStatsSegmentGames(label, tone, games);
      if (matching.length) {
        event.preventDefault();
        event.stopPropagation();
        openShelfStatsMiniOverlay(`${label} · ${matching.length} ${tt("games")}`, shelfStatsGameRows(matching));
      }
      return;
    }
    const node = event.target.closest("[data-stats-overlay-title]");
    if (unifiedShelfScope && !node?.closest("[data-stats-source=collection]")) return;
    if (!node || !body.contains(node) || event.target.closest(".finished-stats-breakdown")) return;
    const breakdown = node.querySelector(":scope > .finished-stats-breakdown");
    if (!breakdown?.innerHTML.trim()) return;
    event.preventDefault();
    event.stopPropagation();
    openShelfStatsMiniOverlay(node.dataset.statsOverlayTitle || tt("Stats"), breakdown.innerHTML);
  };
  body.addEventListener("click", onMobileTap);
  shelfStatsMobileCleanup = () => body.removeEventListener("click", onMobileTap);
}

function openShelfStatsMiniOverlay(title, content) {
  let overlay = el.statsDialog.querySelector(".finished-stats-mini-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.className = "finished-stats-mini-overlay";
    el.statsDialog.appendChild(overlay);
  }
  const close = () => {
    overlay.hidden = true;
    el.statsDialog.classList.remove("has-mini-overlay");
  };
  overlay.innerHTML = `<div class="finished-stats-mini-panel"><div class="finished-stats-mini-head"><strong>${escapeHtml(title)}</strong><button class="icon-button" type="button" data-stats-mini-close title="Close" aria-label="Close">×</button></div><div class="finished-stats-mini-list">${content}</div></div>`;
  overlay.hidden = false;
  el.statsDialog.classList.add("has-mini-overlay");
  overlay.querySelector("[data-stats-mini-close]")?.addEventListener("click", close);
  overlay.onclick = (event) => { if (event.target === overlay) close(); };
}

function shelfStatsSegmentColor(label, tone, index) {
  if (tone === "media") return normalizeSearchText(label) === "digital" ? "#d8dde6" : "#2f343d";
  if (tone === "region") {
    const regionColors = { usa: "#c43d4d", europe: "#315caf", japan: "#c83246", taiwan: "#df3947", spain: "#c43d32", italy: "#26965b", france: "#315caf", germany: "#d14b3f", portugal: "#278451", ireland: "#239966", uk: "#3455a4", "united kingdom": "#3455a4", other: "#8b93a6", unknown: "#8b93a6" };
    return regionColors[normalizeSearchText(label)] || ["#b34648", "#3c66ad", "#a88b3e", "#358668"][index % 4];
  }
  if (tone === "category") return `rgb(${Math.max(76, 202 - index * 22)} ${Math.max(76, 202 - index * 22)} ${Math.max(76, 202 - index * 22)})`;
  const value = normalizeSearchText(label);
  if (value.includes("switch") || value.includes("nintendo")) return "#ff3b45";
  if (value === "ps5") return "#ffffff";
  if (value === "ps1") return "#8e94a0";
  if (value === "ps3" || value === "psp") return "#05070b";
  if (value.includes("playstation") || /\bps/.test(value)) return "#6f78ff";
  if (value.includes("xbox 360") || value === "x360") return "#62d470";
  if (value === "xbox") return "#05070b";
  if (value.includes("xbox") || value.includes("microsoft") || value === "xone") return "#62d470";
  if (value.includes("steam") || value.includes("pc")) return "#08111f";
  if (value.includes("wiiu")) return "#9bd7ff";
  if (value.includes("3ds") || value.includes("gbc")) return "#ff5a66";
  if (value.includes("n64")) return "#349a4c";
  if (value.includes("gamecube") || value.includes("snes") || value.includes("gba")) return "#9670ff";
  if (value.includes("sega") || value.includes("game gear")) return "#2a70e0";
  if (value.includes("dreamcast")) return "#ff842d";
  if (value.includes("wii") || value.includes("nes") || value.includes("gb")) return "#d9dde6";
  return ["#8b93a6", "#aa8bff", "#f2d06b", "#ff9ed2"][index % 4];
}

function shelfStatsPlatformBar(games) {
  if (!games.length) return "color-mix(in srgb, var(--accent) 58%, rgba(255, 255, 255, 0.26))";
  const counts = shelfStatsCountBy(games, (game) => canonicalShelfPlatform(game.platform || "Unknown") || "Unknown");
  const total = counts.reduce((sum, item) => sum + item.count, 0);
  let cursor = 0;
  return `linear-gradient(to top, ${counts.map((item, index) => {
    const start = cursor;
    cursor += item.count / total * 100;
    return `${shelfStatsSegmentColor(item.label, "platform", index)} ${start.toFixed(2)}% ${cursor.toFixed(2)}%`;
  }).join(", ")})`;
}

function shelfStatsMonthBars(games, monthNames) {
  const months = Array.from({ length: 12 }, (_, month) => games.filter((game) => shelfStatsDate(game)?.getMonth() === month));
  const max = Math.max(1, ...months.map((items) => items.length));
  return `<section class="finished-stats-months"><h3>${escapeHtml(tt("By month"))}</h3><div class="finished-stats-period-grid">${months.map((items, month) => {
    const countLabel = `${items.length} ${tt(items.length === 1 ? "game" : "games")}`;
    const breakdownTitle = `${monthNames[month]} · ${countLabel}`;
    return `<div class="finished-stats-month" title="${escapeHtml(`${monthNames[month]}: ${items.length}`)}" ${items.length ? `data-stats-overlay-title="${escapeHtml(breakdownTitle)}"` : ""}><span>${escapeHtml(monthNames[month])}</span><em style="--month:${items.length / max};--platform-bar:${escapeHtml(shelfStatsPlatformBar(items))}"></em><strong>${items.length}</strong>${items.length ? `<span class="finished-stats-breakdown">${shelfStatsGameRows(items)}</span>` : ""}</div>`;
  }).join("")}</div></section>`;
}

function shelfStatsYearBars(games) {
  const years = [...new Set(games.map((game) => String(shelfStatsDate(game).getFullYear())))].sort((a, b) => Number(a) - Number(b));
  const max = Math.max(1, ...years.map((year) => games.filter((game) => shelfStatsDate(game).getFullYear() === Number(year)).length));
  return `<section class="finished-stats-months"><h3>${escapeHtml(tt("By year"))}</h3><div class="finished-stats-period-grid is-yearly shelf-stats-years-grid">${years.map((year) => {
    const yearGames = games.filter((game) => shelfStatsDate(game).getFullYear() === Number(year));
    return `<div class="finished-stats-month" title="${escapeHtml(`${year}: ${yearGames.length}`)}" data-stats-overlay-title="${year}"><span>${year}</span><em style="--month:${yearGames.length / max};--platform-bar:${escapeHtml(shelfStatsPlatformBar(yearGames))}"></em><strong>${yearGames.length}</strong><span class="finished-stats-breakdown"><strong class="finished-stats-breakdown-title">${escapeHtml(year)} · ${yearGames.length} ${escapeHtml(tt("games added"))}</strong>${shelfStatsGameRows(yearGames)}</span></div>`;
  }).join("")}</div></section>`;
}

function rebuildGames() {
  const normalizeGame = (game) => ({ ...game, platform: canonicalShelfPlatform(game.platform || "") });
  const source = state.sourceGames.map((game) => normalizeGame({ ...game, ...(state.overrides[game.id] || {}), sourceRecord: true }));
  state.games = [...source, ...state.additions.map((game) => normalizeGame({ ...game, sourceRecord: false }))].filter((game) => !game.deletedAt);
}

function renderAll() {
  if (unifiedShelfScope) { renderUnifiedShelf(); return; }
  applyLanguage();
  applyLayout();
  renderChrome();
  renderFilters();
  renderStats();
  renderFavorites();
  renderReleaseCalendar();
  renderGamelistModules();
  renderLibrary();
  saveModuleCache();
  scheduleRenderSettle("render");
}

function scheduleRenderSettle(reason = "") {
  cancelAnimationFrame(state.renderSettleFrame);
  window.clearTimeout(state.renderSettleTimer);
  state.renderSettleFrame = requestAnimationFrame(() => {
    state.renderSettleFrame = requestAnimationFrame(() => {
      state.renderSettleFrame = 0;
      refreshDynamicLayout(reason);
    });
  });
  state.renderSettleTimer = window.setTimeout(() => refreshDynamicLayout(`${reason}:late`), 360);
}

function refreshDynamicLayout() {
  updatePlayingControls();
  updateFinishedControls();
  updateShelfRowTitleOverflow();
  syncShelfTabIndicator();
  schedulePlayingCardHeightSync();
}

function settleAfterImages(root = document) {
  root.querySelectorAll?.("img").forEach((image) => {
    if (image.dataset.renderSettleBound === "true") return;
    image.dataset.renderSettleBound = "true";
    image.addEventListener("load", () => scheduleRenderSettle("image"), { passive: true });
    image.addEventListener("error", () => scheduleRenderSettle("image-error"), { passive: true });
    if (image.complete) return;
    image.decode?.().catch(() => {}).then(() => scheduleRenderSettle("image-decode"));
  });
}

function initRenderSettling() {
  document.fonts?.ready.then(() => scheduleRenderSettle("fonts"));
  window.addEventListener("load", () => scheduleRenderSettle("load"), { once: true });
  window.addEventListener("resize", () => scheduleRenderSettle("resize"), { passive: true });
  window.addEventListener("orientationchange", () => window.setTimeout(() => scheduleRenderSettle("orientation"), 120), { passive: true });
  if (!("ResizeObserver" in window)) return;
  state.renderSettleObserver = new ResizeObserver(() => scheduleRenderSettle("resize-observer"));
  [el.shelf, el.tabs, el.releaseCalendar, el.releaseDialogList].filter(Boolean).forEach((node) => state.renderSettleObserver.observe(node));
}

function hydrateModuleCache() {
  try {
    const cache = JSON.parse(localStorage.getItem(MODULE_CACHE_KEY) || "{}");
    if (!cache || typeof cache !== "object") return;
    if (cache.stats) el.stats.innerHTML = cache.stats;
    syncShelfActivityVisibility();
  } catch {
    localStorage.removeItem(MODULE_CACHE_KEY);
  }
}

function saveModuleCache() {
  try {
    localStorage.setItem(MODULE_CACHE_KEY, JSON.stringify({
      stats: el.stats.innerHTML,
      savedAt: Date.now(),
    }));
  } catch {
    // Module cache is only a paint-speed hint.
  }
}

function renderFavorites() {
  state.favoriteGameIds = normalizeFavoriteGameIds(state.favoriteGameIds);
  const games = favoriteGames();
  el.favorites.innerHTML = Array.from({ length: 5 }, (_, index) => favoriteCoverCard(games[index], index)).join("");
  el.favorites.closest("[data-module='favorites']").hidden = !unifiedShelfScope && state.layout.hidden.includes("favorites");
  el.favorites.querySelectorAll("img").forEach(bindCoverFrame);
}

function favoriteGames() {
  const byId = new Map(ownedShelfGames().map((game) => [game.id, game]));
  return normalizeFavoriteGameIds(state.favoriteGameIds).map((id) => byId.get(id)).filter(Boolean);
}

function shelfFavoriteIdsFromSources(shelfData, gamelistData, draft = {}) {
  const shelfIds = Array.isArray(shelfData?.favoriteGameIds) ? shelfData.favoriteGameIds : [];
  const settings = gamelistData?.settings || {};
  const hasSettingsIds = Object.prototype.hasOwnProperty.call(settings, "shelfShowcaseFavoriteGameIds");
  const settingsIds = Array.isArray(settings.shelfShowcaseFavoriteGameIds) ? settings.shelfShowcaseFavoriteGameIds : [];
  const draftIds = Array.isArray(draft.favoriteGameIds) ? draft.favoriteGameIds : [];
  if (hasSettingsIds) return settingsIds.slice(0, 5);
  return (shelfIds.length ? shelfIds : draftIds).slice(0, 5);
}

function favoriteCoverCard(game, index = 0) {
  if (!game) return `<button class="favorite-cover-card favorite-cover-empty" type="button" data-action="showcase-edit" title="Add showcase game" aria-label="Add showcase game ${index + 1}"></button>`;
  const cover = coverUrl(game.cover || "") || platformFallback(game.platform);
  return `<button class="favorite-cover-card" type="button" data-id="${escapeHtml(game.id)}" title="${escapeHtml(game.title)}" aria-label="${escapeHtml(game.title)}"><img src="${escapeHtml(cover)}" alt="${escapeHtml(game.title)} cover" loading="lazy" decoding="async">${showcaseHoverInfo(game, "favorite-cover-info")}</button>`;
}

function handleFavoriteClick(event) {
  if (event.target.closest("[data-action='showcase-edit']")) return openShowcaseEditor();
  const card = event.target.closest(".favorite-cover-card[data-id]");
  if (!card) return;
  const game = ownedShelfGames().find((item) => item.id === card.dataset.id);
  if (game) unifiedShelfScope && state.gamelistGames.some(item => item.id === game.id) ? unifiedShelfScope.openGame(game.id) : openDetails(game);
}

function handleFavoriteKeydown(event) {
  if (event.key !== "Enter" && event.key !== " ") return;
  if (event.target.closest("[data-action='showcase-edit']")) { event.preventDefault(); openShowcaseEditor(); return; }
  const card = event.target.closest(".favorite-cover-card[data-id]");
  if (!card) return;
  event.preventDefault();
  const game = ownedShelfGames().find((item) => item.id === card.dataset.id);
  if (game) unifiedShelfScope && state.gamelistGames.some(item => item.id === game.id) ? unifiedShelfScope.openGame(game.id) : openDetails(game);
}

function renderReleaseCalendar() {
  mountReleaseCalendar(el.releaseCalendar, {
    games: state.gamelistGames,
    offset: state.releaseCalendarOffset,
    weekStart: normalizeWeekStart(state.gamelistSettings.weekStart),
    locale: currentLanguage(),
    translate: tt,
    onShift: (value) => {
      state.releaseCalendarOffset += value;
      renderReleaseCalendar();
    },
    onToday: () => {
      state.releaseCalendarOffset = 0;
      renderReleaseCalendar();
    },
    onOpen: openReleaseDialog,
  });
}

function openReleaseDialog(date, games = []) {
  if (!games.length) return;
  el.releaseDialogTitle.innerHTML = `${calendarMiniIcon()}<span>${escapeHtml(formatLongDate(date))}</span>`;
  el.releaseDialogList.innerHTML = games.map((game) => gamelistProjectionCard(game, { releaseDialog: true })).join("");
  el.releaseDialogList.querySelectorAll(".cover-button img").forEach(bindCoverFrame);
  settleAfterImages(el.releaseDialogList);
  el.releaseDialogList.querySelectorAll(".game-card[data-gamelist-id]").forEach((card) => {
    const open = () => {
      closeDialog(el.releaseDialog);
      openGamelistGameByTitle(card.dataset.gamelistTitle || "");
    };
    card.addEventListener("click", (event) => {
      if (event.target.closest("button, a")) return;
      open();
    });
    card.querySelector(".cover-button")?.addEventListener("click", (event) => {
      event.stopPropagation();
      open();
    });
  });
  openDialog(el.releaseDialog);
  scheduleRenderSettle("release-dialog");
}

function renderChrome() {
  document.body.classList.toggle("can-edit", state.canEdit);
  document.body.classList.toggle("list-view-mode", state.viewMode === "list");
  el.addButton.hidden = false;
  if (el.mobileDockAdd) el.mobileDockAdd.hidden = !state.canEdit;
  el.layoutButton.hidden = !state.canEdit;
  if (el.mobileDockSettings) el.mobileDockSettings.hidden = !state.canEdit;
  setSettingsAuthLoading(false);

  if (el.syncButton) el.syncButton.hidden = true;
  const showPriceActions = state.canEdit && shelfPricesVisible();
  el.fetchPricesButton.hidden = !showPriceActions;
  if (el.topActionsSeparator) el.topActionsSeparator.hidden = !showPriceActions;
  el.fetchPricesButton.innerHTML = `${currencyIcon()}<span class="button-label">${escapeHtml(tt("Fetch New Prices"))}</span>`;
  updateFetchPricesButtonStatus();
  el.login.innerHTML = state.canEdit
    ? `<span class="button-icon" aria-hidden="true"><svg class="exit-icon" viewBox="0 0 24 24"><path d="M10 5H6.8A2.8 2.8 0 0 0 4 7.8v8.4A2.8 2.8 0 0 0 6.8 19H10"></path><path d="M14 8l4 4-4 4"></path><path d="M8 12h10"></path></svg></span>`
    : `<svg class="pencil-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4l11-11a2.8 2.8 0 0 0-4-4L4 16v4Z"></path><path d="M13.5 6.5l4 4"></path></svg>`;
  el.login.title = state.canEdit ? tt("Stop Editing") : tt("Edit");
  el.login.setAttribute("aria-label", el.login.title);
  el.login.hidden = state.canEdit;
  syncViewModeButton(el.view, state.viewMode, { gridIcon, linesIcon });
  el.sortDirection.innerHTML = sortArrowIcon(state.filters.direction === "desc");
  el.sortDirection.classList.toggle("desc", state.filters.direction === "desc");
  el.sortDirection.title = state.filters.direction === "desc" ? tt("Sort descending") : tt("Sort ascending");
  el.footerUpdate.textContent = state.updatedAt ? `${tt("Last edit")} ${formatFooterDate(state.updatedAt)}` : tt("Last edit -");
  el.footerVersion.textContent = siteVersion.version
    ? `${siteVersion.version}.${formatFooterShortDate(siteVersion.updatedAt) || "--.--"}`
    : "Version -";
  if (el.footerCreditText) el.footerCreditText.textContent = state.gamelistSettings.shelfDigitalGames === true ? tt("Shelf/Drive by Shabii") : tt("Shelf by Shabii");
  renderBrandVersionChip();
  updateFloatingActions();
}

function renderBrandVersionChip() {
  if (!el.brandVersion) return;
  const isShabiiOwner = normalizeOwnerKey(state.gamelistSettings.defaultOwner) === "shabii";
  const shouldShow = state.canEdit && isShabiiOwner && Boolean(siteVersion.version);
  el.brandVersion.hidden = !shouldShow;
  el.brandVersion.textContent = shouldShow
    ? `${siteVersion.version.toLowerCase()}.${formatFooterShortDate(siteVersion.updatedAt) || "--.--"}`
    : "Version -";
}

function normalizeOwnerKey(value) {
  return String(value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function updateFloatingActions() {
  const visible = window.scrollY > 180 && !document.body.classList.contains("dialog-open");
  const dockVisible = window.innerWidth >= 761 || window.scrollY > 180;
  el.scrollTop.classList.toggle("visible", visible);
  el.floatingActions.classList.toggle("visible", visible);
  el.mobileActionDock?.classList.toggle("visible", dockVisible);
  el.mobileDockUp?.classList.toggle("is-visible", visible);
}

async function syncShelfNow() {
  if (el.syncButton) el.syncButton.disabled = true;
  try {
    const [shelfData, gamelistData] = await Promise.all([
      fetch("/api/shelf", { cache: "no-store" }).then((response) => response.ok ? response.json() : null),
      fetch(state.canEdit ? "/api/sync" : "/api/sync?shelfProjections=1", { cache: "no-store" }).then((response) => response.ok ? response.json() : null),
    ]);
    if (shelfData) {
      state.sourceGames = shelfData.sourceGames || [];
      state.additions = shelfData.games || [];
      state.overrides = shelfData.overrides || {};
      state.layout = normalizeLayout(shelfData.layout || state.layout);
      state.favoriteGameIds = shelfFavoriteIdsFromSources(shelfData, gamelistData, { favoriteGameIds: state.favoriteGameIds });
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
    if (el.syncButton) el.syncButton.disabled = false;
  }
}

function currentLanguage() {
  return normalizeLanguage(state.gamelistSettings?.language);
}

function tt(key, values) {
  return t(currentLanguage(), key, values);
}

function applyLanguage() {
  applyDocumentTranslations(currentLanguage(), document);
  syncStyledSelect(el.detailTrophySort);
  if (el.playingTitle) el.playingTitle.textContent = tt("Currently playing");
  const latestFinishedTitle = el.playingFinished?.querySelector(".achievement-subtitle");
  if (latestFinishedTitle) latestFinishedTitle.textContent = tt("Last finished games");
}

function syncDisplayMode() {
  const standalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  const mobile = window.matchMedia("(max-width: 699px)").matches;
  document.body.classList.toggle("mobile-app-mode", standalone && mobile);
  scheduleMobilePaintRefresh();
}

function scheduleMobilePaintRefresh() {
  if (!document.body.classList.contains("mobile-app-mode")) return;
  cancelAnimationFrame(state.paintRefreshFrame);
  state.paintRefreshFrame = requestAnimationFrame(() => {
    state.paintRefreshFrame = requestAnimationFrame(() => {
      document.body.classList.add("paint-refresh");
      void document.body.offsetHeight;
      window.setTimeout(() => document.body.classList.remove("paint-refresh"), 120);
    });
  });
}

async function refreshAllShelfPrices() {
  if (!state.canEdit || !shelfPricesVisible()) return;
  const games = state.games.filter((game) => game.title && !isPendingCollectionGame(game));
  const settings = normalizePriceSettings(state.gamelistSettings);
  if (!games.length) return;
  el.fetchPricesButton.disabled = true;
  state.priceFetchStatus = tt("Fetching prices for {count} games...", { count: games.length });
  updateFetchPricesButtonStatus();
  showToast(state.priceFetchStatus);
  let updated = 0;
  let failed = 0;
  let searched = 0;
  const emptyPriceGames = [];
  const currencyMismatchGames = [];
  try {
    for (const [index, game] of games.entries()) {
      const progressLabel = tt("Prices {current}/{total}", { current: index + 1, total: games.length });
      el.fetchPricesButton.innerHTML = `${currencyIcon()}<span class="button-label">${escapeHtml(progressLabel)}</span>`;
      state.priceFetchStatus = `${tt("Checking {current}/{total}", { current: index + 1, total: games.length })}: ${game.title}`;
      updateFetchPricesButtonStatus();
      try {
        if (index) await delay(450);
        const result = await fetchCollectionPriceForBulk(game, settings);
        if (result.pricechartingId && !String(game.pricechartingId || "").trim()) game.pricechartingId = result.pricechartingId;
        if (applyCollectionPrice(game, result.data)) updated += 1;
        if (result.searched) searched += 1;
      } catch (error) {
        if (error?.emptyPrice) emptyPriceGames.push(game);
        if (error?.currencyMismatch) currencyMismatchGames.push(game);
        failed += 1;
      }
    }
    await persistShelf();
    renderAll();
    if (emptyPriceGames.length) {
      console.group(`Shelf games with empty collection prices (${emptyPriceGames.length})`);
      emptyPriceGames.forEach((game) => console.log(`${game.title}${game.platform ? ` [${shortPlatform(game.platform)}]` : ""}`));
      console.groupEnd();
    }
    if (currencyMismatchGames.length) {
      console.group(`Shelf games returned the wrong currency (${currencyMismatchGames.length})`);
      currencyMismatchGames.forEach((game) => console.log(`${game.title}${game.platform ? ` [${shortPlatform(game.platform)}]` : ""}`));
      console.groupEnd();
    }
    state.priceFetchStatus = `Last fetch: ${updated}/${games.length} updated${searched ? `, ${searched} via search` : ""}${failed ? `, ${failed} failed` : ""}${emptyPriceGames.length ? `, ${emptyPriceGames.length} empty prices` : ""}${currencyMismatchGames.length ? `, ${currencyMismatchGames.length} wrong currency` : ""}.`;
    showToast(tt("Updated prices for {updated} games{failed}.", { updated, failed: failed ? tt(", {count} failed", { count: failed }) : "" }), failed ? "error" : "info");
  } finally {
    el.fetchPricesButton.disabled = false;
    el.fetchPricesButton.innerHTML = `${currencyIcon()}<span class="button-label">${escapeHtml(tt("Fetch New Prices"))}</span>`;
    updateFetchPricesButtonStatus();
  }
}

async function fetchCollectionPriceForBulk(game, settings) {
  let directError = null;
  try {
    const data = await fetchCollectionPriceWithRetry(game, settings);
    ensureCollectionPriceCurrency(data, settings);
    return { data, searched: false, pricechartingId: "" };
  } catch (error) {
    directError = error;
  }

  const result = await findBulkPhysicalResult(game, settings);
  if (!result) throw directError;
  const lookupGame = { ...game, pricechartingId: result.url || result.productId || "" };
  const data = await fetchCollectionPriceWithRetry(lookupGame, settings);
  ensureCollectionPriceCurrency(data, settings);
  return { data, searched: true, pricechartingId: result.url || result.productId || "" };
}

async function findBulkPhysicalResult(game, settings) {
  const selectedPlatform = shortPlatform(game.platform);
  const searches = [];
  for (const title of physicalLookupQueries(game.title || "")) {
    searches.push({ title, platform: selectedPlatform });
    searches.push({ title, platform: "" });
  }
  const results = [];
  for (const search of searches) {
    const params = new URLSearchParams({ mode: "search", title: search.title, region: game.country || game.region || settings.region, currency: settings.currency });
    if (search.platform) params.set("platform", search.platform);
    const response = await fetch(`/api/collection-price?${params}`, { cache: "no-store" });
    const data = response.ok ? await response.json() : { results: [] };
    results.push(...(data.results || []));
  }
  return uniquePhysicalResults(results)
    .map((result) => ({ result, score: bestPhysicalSearchScore(game.title || "", result, selectedPlatform) }))
    .filter(({ score }) => score >= 1)
    .sort((a, b) => b.score - a.score)[0]?.result || null;
}

function ensureCollectionPriceCurrency(data, settings) {
  const expected = String(settings.currency || "").toUpperCase();
  const actual = String(data?.currency || "").toUpperCase();
  if (expected && actual && expected !== actual) {
    const error = new Error(`Expected ${expected}, got ${actual}`);
    error.nonRetryable = true;
    error.currencyMismatch = true;
    throw error;
  }
}

function updateFetchPricesButtonStatus() {
  if (!el.fetchPricesButton) return;
  const label = state.priceFetchStatus || tt("Fetch New Prices");
  el.fetchPricesButton.title = label;
  el.fetchPricesButton.setAttribute("aria-label", label);
}

async function fetchCollectionPriceWithRetry(game, settings) {
  try {
    return await fetchCollectionPriceData(game, settings);
  } catch (error) {
    if (error?.nonRetryable) throw error;
    await delay(950);
    return fetchCollectionPriceData(game, settings);
  }
}

async function fetchCollectionPriceData(game, settings) {
  const params = collectionPriceParams(game, settings);
  const response = await fetch(`/api/collection-price?${params}`);
  const data = await response.json();
  if (!response.ok || data.error || !hasCollectionPriceValue(data)) {
    const error = new Error(data.error || "Price unavailable");
    error.nonRetryable = Boolean(data.notFound) || response.ok;
    error.emptyPrice = response.ok && !hasCollectionPriceValue(data);
    throw error;
  }
  return data;
}

function applyTheme() {
  if (unifiedShelfScope) return;
  setSoundsDisabled(state.gamelistSettings.disableSounds === true);
  state.gamelistSettings.customTheme = normalizeThemeSettings(state.gamelistSettings);
  const theme = applySiteTheme(state.gamelistSettings, { page: "shelf" });
  const twitchUrl = twitchChannelUrl(state.gamelistSettings.twitchUser);
  el.brandLink?.setAttribute("aria-label", theme.title);
  el.brandLink?.setAttribute("href", twitchUrl || "#gameShelf");
  el.brandLink?.toggleAttribute("target", Boolean(twitchUrl));
  if (twitchUrl) el.brandLink?.setAttribute("rel", "noreferrer");
  else el.brandLink?.removeAttribute("rel");
}

function scrollToShelfLibrary() {
  scrollWithSound(document.querySelector("[data-module='library']"));
  el.shelf.scrollTo?.({ top: 0, left: 0, behavior: "smooth" });
}

function scrollToShelfSearch() {
  scrollWithSound(document.querySelector(".shelf-toolbar"));
  window.requestAnimationFrame(() => el.search?.focus({ preventScroll: true }));
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function renderStats() {
  const visibleGames = filteredShelfStatsGames();
  const ownedGames = visibleGames.filter((game) => !isPendingCollectionGame(game));
  const physicalGames = ownedGames.filter((game) => !isDigitalShelfGame(game));
  const digitalGames = state.gamelistSettings.shelfDigitalGames === true
    ? filteredShelfStatsGames({ drive: true }).filter((game) => !isPendingCollectionGame(game) && isDigitalShelfGame(game))
    : [];
  const currentYear = new Date().getFullYear();
  const addedThisYear = (games) => games.filter((game) => {
    const addedAt = Date.parse(game.createdAt || "");
    return Number.isFinite(addedAt) && new Date(addedAt).getFullYear() === currentYear;
  }).length;
  const value = physicalGames.reduce((sum, game) => sum + (collectionValueFor(game) || 0), 0);
  const currency = normalizePriceSettings(state.gamelistSettings).currency;
  const symbol = ({ USD: "$", GBP: "\u00a3", JPY: "\u00a5", EUR: "\u20ac" })[currency] || "\u20ac";
  const valueText = currency === "EUR" ? `${Math.round(value).toLocaleString("en")}${symbol}` : `${symbol}${Math.round(value).toLocaleString("en")}`;
  const rows = [
    [physicalGames.length, "Physical games", "stat-backlog", "shelf-start", addedThisYear(physicalGames)],
    ...(state.gamelistSettings.shelfDigitalGames === true ? [[digitalGames.length, "Digital games", "stat-digital", null, addedThisYear(digitalGames)]] : []),
    [new Set((unifiedShelfScope ? ownedGames : physicalGames).map((game) => game.platform)).size, "Platforms", "stat-available"],
    ...(shelfPricesVisible() ? [[valueText, "Estimated physical", "stat-done"]] : []),
  ];
  el.stats.innerHTML = rows.map(([valueText, label, className, action, yearCount]) => {
    const hasDetail = yearCount !== undefined;
    const item = yearCount === 1 ? tt("game") : tt("games");
    const detail = hasDetail ? `<div class="stat-detail"><span>${escapeHtml(tt("{count} {item} in {year}", { count: yearCount, item, year: currentYear }))}</span><b>${escapeHtml(tt("Total {count}", { count: valueText }))}</b></div>` : "";
    return `<div class="stat ${className}${action ? " stat-action" : ""}"${action ? ` data-stat-action="${escapeHtml(action)}"` : ""}${hasDetail ? " data-stat-detail" : ""}${action || hasDetail ? ' role="button" tabindex="0"' : ""}><strong>${escapeHtml(valueText)}</strong><span>${escapeHtml(tt(label))}</span>${detail}</div>`;
  }).join("");
  if (unifiedShelfScope && state.unifiedFinishedKpi) el.stats.prepend(state.unifiedFinishedKpi);
}

function handleStatsAction(event) {
  const stat = event.target.closest("[data-stat-action], [data-stat-detail]");
  if (!stat || unifiedShelfScope && stat.dataset.statAction === "completed") return;
  if (stat.dataset.statAction === "shelf-start") scrollToShelfLibrary();
  else stat.classList.toggle("detail-open");
}

function handleStatsActionKeydown(event) {
  if (event.key !== "Enter" && event.key !== " ") return;
  const stat = event.target.closest("[data-stat-action], [data-stat-detail]");
  if (!stat || unifiedShelfScope && stat.dataset.statAction === "completed") return;
  event.preventDefault();
  if (stat.dataset.statAction === "shelf-start") scrollToShelfLibrary();
  else stat.classList.toggle("detail-open");
}

function renderFilters() {
  if (!shelfPricesVisible() && state.filters.sort === "value") {
    state.filters.sort = "platform";
    state.filters.direction = "asc";
  }
  const visibleGames = visibleShelfGames();
  if (state.filters.platform !== "all") state.filters.platform = canonicalShelfPlatform(state.filters.platform);
  const platforms = orderedPlatforms(uniqueSorted(visibleGames.map((game) => game.platform)));
  const countries = uniqueSorted(visibleGames.map((game) => game.country));
  const categories = uniqueSorted(visibleGames.flatMap((game) => [...String(game.genre || "").split(","), ...(game.genres || [])].map((value) => value.trim()).filter(Boolean)));
  el.platform.innerHTML = `<option value="all">${escapeHtml(tt("All platforms"))}</option>${platforms.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(platformDisplayName(value))}</option>`).join("")}`;
  el.region.innerHTML = `<option value="all">${escapeHtml(tt("All regions"))}</option>${countries.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(regionName(value))}</option>`).join("")}`;
  el.category.innerHTML = `<option value="all">${escapeHtml(tt("All categories"))}</option>${categories.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(tt(value))}</option>`).join("")}`;
  el.platform.value = state.filters.platform;
  el.region.value = state.filters.region;
  el.condition.value = state.filters.condition;
  el.category.value = state.filters.category;
  const valueOption = el.sort.querySelector("option[value='value']");
  if (valueOption) {
    valueOption.hidden = !shelfPricesVisible();
    valueOption.disabled = !shelfPricesVisible();
  }
  el.sort.value = state.filters.sort;
  syncStyledSelect(el.platform, { logos: true, activeValue: "all" });
  syncStyledSelect(el.region, { flags: true, activeValue: "all" });
  syncStyledSelect(el.condition, { activeValue: "all" });
  syncStyledSelect(el.category, { activeValue: "all" });
  syncStyledSelect(el.sort, { activeValue: null });
  [el.platform, el.region, el.condition, el.category, el.sort].forEach(updateSelectOverflowTitle);
}

function syncStyledSelect(select, options = {}) {
  if (!select) return;
  if (select.id === "shelfGamelistSectionInput") {
    if (select.nextElementSibling?.classList.contains("platform-logo-select")) select.nextElementSibling.remove();
    return;
  }
  const signature = JSON.stringify([[...select.options].map(option => [option.value, option.textContent, option.hidden, option.disabled]), select.value, options]);
  if (select.dataset.controlSignature === signature && select.nextElementSibling?.classList.contains("platform-logo-select")) return;
  select.dataset.controlSignature = signature;
  const useLogos = Boolean(options.logos);
  const useFlags = Boolean(options.flags) || select.id === "countryInput";
  select.classList.add(useLogos ? "native-platform-filter" : "native-styled-select");
  let control = select.nextElementSibling;
  if (!control?.classList?.contains("platform-logo-select")) {
    control = document.createElement("div");
    control.className = "platform-logo-select";
    select.insertAdjacentElement("afterend", control);
  }
  const selectOptions = [...select.options].map((option) => ({
    value: option.value,
    label: option.textContent.trim(),
    flag: option.dataset.flag || (useFlags && option.value && option.value !== "all" ? flagAsset(option.value) : ""),
    selected: option.selected,
    disabled: option.disabled || option.hidden,
    fontFamily: option.style.fontFamily || "",
  }));
  const visibleOptions = selectOptions.filter((option) => !option.disabled);
  const selected = selectOptions.find((option) => option.selected) || visibleOptions[0] || { value: "all", label: "All platforms" };
  control.classList.toggle("is-active", options.activeValue != null && selected.value !== options.activeValue);
  control.innerHTML = `
    <button class="platform-logo-button" type="button" aria-haspopup="listbox" aria-expanded="false" data-full-label="${escapeHtml(selected.label)}" aria-label="${escapeHtml(selected.label)}">
      ${platformLogoChoiceMarkup(selected.value, selected.label, { logos: useLogos, fontFamily: selected.fontFamily, flag: selected.flag })}
    </button>
    <div class="platform-logo-menu" role="listbox">
      ${visibleOptions.map((option) => `
        <button class="platform-logo-option ${option.selected ? "is-selected" : ""}" type="button" role="option" aria-selected="${option.selected ? "true" : "false"}" data-value="${escapeHtml(option.value)}" data-full-label="${escapeHtml(option.label)}">
          ${platformLogoChoiceMarkup(option.value, option.label, { logos: useLogos, fontFamily: option.fontFamily, flag: option.flag })}
        </button>
      `).join("")}
    </div>
  `;
  const button = control.querySelector(".platform-logo-button");
  const buttonLabel = button?.querySelector(".platform-logo-choice-label");
  button?.classList.toggle("is-ellipsed", Boolean(buttonLabel && buttonLabel.scrollWidth > buttonLabel.clientWidth));
  button?.addEventListener("pointerenter", () => showPlatformLogoOverlay(button));
  button?.addEventListener("focus", () => showPlatformLogoOverlay(button));
  button?.addEventListener("pointerleave", hidePlatformLogoOverlay);
  button?.addEventListener("blur", hidePlatformLogoOverlay);
  button?.addEventListener("click", (event) => {
    event.stopPropagation();
    const shouldOpen = !control.classList.contains("is-open");
    closePlatformLogoSelects({ target: control });
    control.classList.toggle("is-open", shouldOpen);
    const open = control.classList.contains("is-open");
    button.setAttribute("aria-expanded", open ? "true" : "false");
  });
  control.querySelectorAll(".platform-logo-option").forEach((option) => {
    const label = option.querySelector(".platform-logo-choice-label");
    option.classList.toggle("is-ellipsed", Boolean(label && label.scrollWidth > label.clientWidth));
    option.addEventListener("pointerenter", () => showPlatformLogoOverlay(option));
    option.addEventListener("focus", () => showPlatformLogoOverlay(option));
    option.addEventListener("pointerleave", hidePlatformLogoOverlay);
    option.addEventListener("blur", hidePlatformLogoOverlay);
    option.addEventListener("click", (event) => {
      event.stopPropagation();
      select.value = option.dataset.value || "all";
      control.classList.remove("is-open");
      button?.setAttribute("aria-expanded", "false");
      select.dispatchEvent(new Event("change", { bubbles: true }));
      requestAnimationFrame(() => {
        if (select.isConnected) syncStyledSelect(select, options);
      });
    });
  });
  requestAnimationFrame(() => {
    const buttonLabel = button?.querySelector(".platform-logo-choice-label");
    button?.classList.toggle("is-ellipsed", Boolean(buttonLabel && buttonLabel.scrollWidth > buttonLabel.clientWidth));
    control.querySelectorAll(".platform-logo-option").forEach((option) => {
      const label = option.querySelector(".platform-logo-choice-label");
      option.classList.toggle("is-ellipsed", Boolean(label && label.scrollWidth > label.clientWidth));
    });
  });
  control.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    control.classList.remove("is-open");
    button?.setAttribute("aria-expanded", "false");
    button?.focus();
  });
}

function syncStyledSelects(root = document, options = {}) {
  root?.querySelectorAll?.("select").forEach((select) => syncStyledSelect(select, options));
}

function closePlatformLogoSelects(event) {
  hidePlatformLogoOverlay();
  document.querySelectorAll(".platform-logo-select.is-open").forEach((control) => {
    if (event?.target && control.contains(event.target)) return;
    control.classList.remove("is-open");
    control.querySelector(".platform-logo-button")?.setAttribute("aria-expanded", "false");
  });
}

function showPlatformLogoOverlay(option) {
  const label = option.querySelector(".platform-logo-choice-label");
  const isOverflowing = Boolean(label && label.scrollWidth > label.clientWidth + 1);
  if (!option.classList.contains("is-ellipsed") && !isOverflowing) return;
  if (!platformLogoOverlay) {
    platformLogoOverlay = document.createElement("div");
    platformLogoOverlay.className = "platform-logo-hover-overlay";
    document.body.appendChild(platformLogoOverlay);
  }
  platformLogoOverlay.textContent = option.dataset.fullLabel || "";
  const rect = option.getBoundingClientRect();
  platformLogoOverlay.style.left = `${Math.min(rect.right + 8, window.innerWidth - 24)}px`;
  platformLogoOverlay.style.top = `${rect.top + rect.height / 2}px`;
  platformLogoOverlay.classList.add("visible");
}

function hidePlatformLogoOverlay() {
  platformLogoOverlay?.classList.remove("visible");
}

function platformLogoChoiceMarkup(value, label, options = {}) {
  const showLogo = options.logos && value && value !== "all";
  const showFlag = Boolean(options.flag);
  const cls = showLogo ? platformClass(value) : "platform-generic";
  const fontStyle = options.fontFamily ? ` style="font-family:${escapeHtml(options.fontFamily)}"` : "";
  return `
    <span class="platform-logo-choice ${escapeHtml(cls)}">
      ${showLogo ? `<span class="platform-logo-choice-icon"><img src="${escapeHtml(platformLogo(value))}" alt="" width="18" height="18" decoding="async"></span>` : ""}
      ${showFlag ? `<span class="platform-logo-choice-icon settings-region-flag-icon"><img src="${escapeHtml(options.flag)}" alt="" width="22" height="16" decoding="async"></span>` : ""}
      <span class="platform-logo-choice-label"${fontStyle}>${escapeHtml(label)}</span>
    </span>
  `;
}

function renderLibrary() {
  syncShelfTabToSearchResults();
  const pendingCount = state.canEdit ? state.games.filter(isPendingCollectionGame).length : 0;
  const preorderCount = syncedPreorderGames().length;
  const wishlistCount = syncedWishlistGames().length;
  const tabs = shelfTabs(pendingCount, preorderCount, wishlistCount);
  state.filters.tab = tabs.includes(state.filters.tab) ? state.filters.tab : "shelf";
  const games = filteredGames();
  el.tabs.hidden = tabs.length < 2;
  el.libraryTitle.hidden = tabs.length < 2;
  el.tabs.classList.toggle("sync-preorders-enabled", state.canEdit);
  el.tabs.classList.toggle("four-tabs", tabs.length === 4);
  el.tabs.classList.toggle("five-tabs", tabs.length >= 5);
  el.tabs.dataset.activeTab = state.filters.tab;
  el.tabs.style.setProperty("--tab-count", String(tabs.length));
  el.tabs.style.setProperty("--compact-tab-count", String(Math.max(1, tabs.length - 1)));
  el.tabs.style.setProperty("--tab-width", `calc((100% - 18px) / ${tabs.length})`);
  el.tabs.style.setProperty("--tab-index", String(tabs.indexOf(state.filters.tab)));
  el.tabs.innerHTML = tabs.map((tab) => `<button class="${state.filters.tab === tab ? "active" : ""}" data-shelf-tab="${tab}" type="button"><span class="label">${tab === "shelf" ? escapeHtml(tt("Shelf")) : tab === "drive" ? escapeHtml(tt("Drive")) : tab === "preorders" ? `<span class="preorder-tab-text">${escapeHtml(tt("Preorders"))}</span><span class="preorder-tab-icon">${shoppingBagIcon()}</span>` : tab === "wishlist" ? `<span class="wishlist-tab-text">${escapeHtml(tt("Wishlist"))}</span><span class="wishlist-tab-icon">${wishlistIcon()}</span>` : escapeHtml(tt("New additions"))}</span>${tab === "preorders" ? `<span class="count">${preorderCount}</span>` : tab === "wishlist" ? `<span class="count">${wishlistCount}</span>` : tab === "new" ? `<span class="count">${pendingCount}</span>` : ""}</button>`).join("");
  requestAnimationFrame(syncShelfTabIndicator);
  if (state.filters.tab === "preorders") {
    el.count.innerHTML = shelfPreorderCountPill(games);
  } else {
    el.count.textContent = tt("{count} {item}", { count: games.length, item: games.length === 1 ? tt("game") : tt("games") });
  }
  el.libraryTitle.textContent = state.filters.tab === "preorders" ? tt("Preorders") : state.filters.tab === "wishlist" ? tt("Wishlist") : state.filters.tab === "new" ? tt("New additions") : state.filters.tab === "drive" ? tt("Drive") : tt("Shelf");
  el.shelf.classList.toggle("list-view", state.viewMode === "list");
  el.shelf.classList.toggle("preorders-view", ["preorders", "wishlist"].includes(state.filters.tab));
  if (unifiedShelfScope) {
    el.tabs.hidden = true;
    el.libraryTitle.hidden = false;
    const signature = JSON.stringify([state.unifiedRevision || 0, state.viewMode, state.filters, state.unifiedMedia, games.map(game => game.id)]);
    el.empty.hidden = games.length > 0;
    if (state.unifiedLibrarySignature === signature) return;
    state.unifiedLibrarySignature = signature;
    state.unifiedCardCache ||= new Map();
  }
  renderBatchedList(el.shelf, games, {
    resetKey: JSON.stringify([state.viewMode, state.filters, state.unifiedMedia]),
    loadMoreLabel: tt("Show more"),
    createItem: (game, index) => {
      const key = `${state.viewMode}:${game.id}`;
      let node = unifiedShelfScope ? state.unifiedCardCache.get(key) : null;
      if (!node) {
        if (state.viewMode === "list") {
          const template = document.createElement("template");
          template.innerHTML = gameRow(game);
          node = template.content.firstElementChild;
          node.querySelectorAll(".game-row-cover").forEach(bindRowCoverFrame);
        } else node = gameCard(game, { imagePriority: index < 6 ? "eager" : "lazy" });
        if (unifiedShelfScope) state.unifiedCardCache.set(key, node);
      }
      node.hidden = false;
      return node;
    },
    beforeAppend: settleAfterImages,
    afterAppend: () => scheduleRenderSettle("library"),
  });
  el.empty.hidden = games.length > 0;
}

function syncShelfTabIndicator() {
  const active = el.tabs?.querySelector("button.active");
  if (!el.tabs || !active) return;
  el.tabs.style.setProperty("--tab-left", `${Math.max(0, active.offsetLeft - 6)}px`);
  el.tabs.style.setProperty("--tab-active-width", `${active.offsetWidth}px`);
}

function renderFilteredShelf() {
  renderStats();
  renderLibrary();
}

function syncShelfTabToSearchResults() {
  if (unifiedShelfScope) return;
  if (!state.filters.query) return;
  const pendingCount = state.canEdit ? state.games.filter(isPendingCollectionGame).length : 0;
  const tabs = shelfTabs(pendingCount, syncedPreorderGames().length, syncedWishlistGames().length);
  if (tabs.some((tab) => tab === state.filters.tab && filteredGamesForShelfTab(tab).length)) return;
  const next = tabs.find((tab) => filteredGamesForShelfTab(tab).length);
  if (next) state.filters.tab = next;
}

function normalizedShelfTab(tab) {
  if (unifiedShelfScope && tab === "drive") return "shelf";
  return ["shelf", "preorders", "wishlist", "new", "drive"].includes(tab) ? tab : "shelf";
}

function shelfTabs(pendingCount = 0, preorderCount = syncedPreorderGames().length, wishlistCount = syncedWishlistGames().length) {
  if (unifiedShelfScope) return [pendingCount ? "new" : "", "shelf"].filter(Boolean);
  const hasDigitalGames = state.games.some((game) => !game.deletedAt && !isPendingCollectionGame(game) && isDigitalShelfGame(game));
  return [pendingCount ? "new" : "", "shelf", state.gamelistSettings.shelfDigitalGames === true && hasDigitalGames ? "drive" : "", state.gamelistSettings.shelfShowPreorders !== false && preorderCount ? "preorders" : "", state.gamelistSettings.shelfSyncWishlist !== false && wishlistCount ? "wishlist" : ""].filter(Boolean);
}

function syncedPreorderGames() {
  if (!state.canEdit) return [];
  return state.gamelistGames
    .filter((game) => !game.deletedAt && !game.completedAt && game.preorderStore && (!isDigitalShelfGame(game) || state.gamelistSettings.shelfDigitalGames === true))
    .map((game) => ({ ...game, platform: canonicalShelfPlatform(game.platform || ""), preorderProjection: true, genre: (game.genres || []).join(", "), country: game.country || "", condition: "Preordered" }));
}

function syncedWishlistGames() {
  if (state.gamelistSettings.shelfSyncWishlist === false) return [];
  return state.gamelistGames
    .filter((game) => !game.deletedAt && !game.completedAt && !game.playing && !game.preorderStore && ["wanted", "upcoming"].includes(game.section) && (!isDigitalShelfGame(game) || state.gamelistSettings.shelfDigitalGames === true))
    .map((game) => ({ ...game, platform: canonicalShelfPlatform(game.platform || ""), wishlistProjection: true, genre: (game.genres || []).join(", "), country: "", condition: "Game" }));
}

function setShelfTab(tab) {
  const next = normalizedShelfTab(tab);
  if (state.filters.tab === next) return;
  state.filters.tab = next;
  renderFilteredShelf();
}

function handleShelfSwipeStart(event) {
  if (unifiedShelfScope) return;
  if (!window.matchMedia("(max-width: 699px)").matches || el.tabs.hidden) return;
  const touch = event.changedTouches?.[0];
  if (!touch) return;
  state.shelfSwipeStart = { x: touch.clientX, y: touch.clientY };
}

function handleShelfSwipeEnd(event) {
  if (unifiedShelfScope) return;
  const start = state.shelfSwipeStart;
  state.shelfSwipeStart = null;
  if (!start || !window.matchMedia("(max-width: 699px)").matches || el.tabs.hidden) return;
  const touch = event.changedTouches?.[0];
  if (!touch) return;
  const dx = touch.clientX - start.x;
  const dy = touch.clientY - start.y;
  if (Math.abs(dx) < 34 || Math.abs(dx) < Math.abs(dy) * 1.15) return;
  const tabs = shelfTabs(state.games.filter(isPendingCollectionGame).length);
  const current = normalizedShelfTab(state.filters.tab);
  const index = tabs.indexOf(current);
  const next = dx < 0 ? tabs[index + 1] : tabs[index - 1];
  if (next) setShelfTab(next);
}

function updateShelfRowTitleOverflow() {
  el.shelf.querySelectorAll(".game-row-identity strong").forEach((title) => title.classList.toggle("is-overflowing", title.scrollWidth > title.clientWidth + 1));
}

function filteredGames() {
  return filteredGamesForShelfTab(state.filters.tab);
}

function filteredGamesForShelfTab(tab) {
  const normalizedTab = normalizedShelfTab(tab);
  const source = normalizedTab === "preorders" ? syncedPreorderGames() : normalizedTab === "wishlist" ? syncedWishlistGames() : visibleShelfGames();
  return source.filter((game) => {
    const haystack = normalizeSearchText(`${game.title} ${game.platform} ${game.publisher} ${game.developer} ${game.genre} ${(game.genres || []).join(" ")} ${game.description} ${game.notes} ${game.preorderStore} ${(game.tags || []).join(" ")} ${(game.owners || []).join(" ")}`);
    return !game.deletedAt
      && (!unifiedShelfScope || !state.unifiedMedia || state.unifiedMedia === "all" || (state.unifiedMedia === "digital") === isDigitalShelfGame(game))
      && (state.filters.platform === "all" || game.platform === state.filters.platform)
      && (["drive", "preorders", "wishlist"].includes(normalizedTab) || unifiedShelfScope && isDigitalShelfGame(game) || state.filters.region === "all" || game.country === state.filters.region)
      && (["drive", "preorders", "wishlist"].includes(normalizedTab) || unifiedShelfScope && isDigitalShelfGame(game) || conditionMatches(game, state.filters.condition))
      && (state.filters.category === "all" || [...String(game.genre || "").split(","), ...(game.genres || [])].map((value) => value.trim()).includes(state.filters.category))
      && (normalizedTab === "preorders" ? game.preorderProjection : normalizedTab === "wishlist" ? game.wishlistProjection : normalizedTab === "new" ? isPendingCollectionGame(game) : normalizedTab === "drive" ? !isPendingCollectionGame(game) && isDigitalShelfGame(game) : !isPendingCollectionGame(game) && (!isDigitalShelfGame(game) || unifiedShelfScope && state.gamelistSettings.shelfDigitalGames === true))
      && (!state.filters.query || haystack.includes(state.filters.query));
  }).sort(sorter(state.filters.sort));
}
function filteredShelfStatsGames(options = {}) {
  const driveMode = Boolean(options.drive);
  return visibleShelfGames().filter((game) => {
    const haystack = normalizeSearchText(`${game.title} ${game.platform} ${game.publisher} ${game.developer} ${game.genre} ${game.notes} ${(game.tags || []).join(" ")} ${(game.owners || []).join(" ")}`);
    return !game.deletedAt
      && (!unifiedShelfScope || state.gamelistSettings.shelfDigitalGames === true || !isDigitalShelfGame(game))
      && (!unifiedShelfScope || !state.unifiedMedia || state.unifiedMedia === "all" || (state.unifiedMedia === "digital") === isDigitalShelfGame(game))
      && (state.filters.platform === "all" || game.platform === state.filters.platform)
      && (driveMode || unifiedShelfScope && isDigitalShelfGame(game) || state.filters.region === "all" || game.country === state.filters.region)
      && (driveMode || unifiedShelfScope && isDigitalShelfGame(game) || conditionMatches(game, state.filters.condition))
      && (state.filters.category === "all" || [...String(game.genre || "").split(","), ...(game.genres || [])].map((value) => value.trim()).includes(state.filters.category))
      && (!state.filters.query || haystack.includes(state.filters.query));
  });
}
function isPendingCollectionGame(game) { return Boolean(game?.pendingCollection); }
function isDigitalShelfGame(game) { return Boolean(game?.digital || game?.dlc); }
function visibleShelfGames() { return state.canEdit ? state.games : state.games.filter((game) => !isPendingCollectionGame(game)); }
function ownedShelfGames() {
  return state.games.filter(game => !isPendingCollectionGame(game) && (!unifiedShelfScope || state.gamelistSettings.shelfDigitalGames === true || !isDigitalShelfGame(game)));
}

function normalizeFavoriteGameIds(ids) {
  const ownedGames = ownedShelfGames();
  const owned = new Set(ownedGames.map((game) => game.id));
  const seen = new Set();
  return (Array.isArray(ids) ? ids : [])
    .map((id) => String(id || "").trim())
    .filter((id) => id && (!unifiedShelfScope && ownedGames.length === 0 || owned.has(id)) && !seen.has(id) && seen.add(id))
    .slice(0, 5);
}

function gameCard(game, options = {}) {
  const preorderProjection = Boolean(game.preorderProjection);
  const wishlistProjection = Boolean(game.wishlistProjection);
  const syncedProjection = preorderProjection || wishlistProjection;
  const digitalGame = !syncedProjection && isDigitalShelfGame(game);
  const fallbackCover = coverUrl(game.cover || "") || platformFallback(game.platform);
  const cover = fallbackCover;
  const studio = [game.developer, game.publisher && game.publisher !== game.developer ? game.publisher : ""].filter(Boolean).join(" / ");
  const owners = game.owners || [];
  const visibleOwners = visibleShelfCardOwners(owners);
  const ownerClasses = visibleOwners.map((owner) => ` ${ownerCardColorClass(owner)}`).join("");
  const tags = visibleShelfTags(game, syncedProjection ? (game.genres || []).slice(0, 4) : [...(game.tags || []), game.category && game.category !== "Game" ? game.category : "", ...String(game.genre || "").split(",")]);
  const condition = conditionLabel(game);
  const card = createGameCardShell(document);
  card.dataset.id = game.id;
  card.setAttribute("role", "button"); card.tabIndex = 0;
  card.className += `${cover ? " has-art" : ""}${preorderProjection ? " preorder-projection-card synced-projection-card" : ""}${wishlistProjection ? " wishlist-projection-card synced-projection-card" : ""}${ownerClasses}`;
  card.classList.toggle("has-rating", shelfRatingScoreValue(game) != null);
  if (cover) {
    card.style.setProperty("--card-art", `url("${escapeCss(cover)}")`);
    bindActivityCardParallax(card);
  }
  card.querySelector(".card-trailer")?.remove(); card.querySelector(".trailer-toggle")?.remove();
  const image = card.querySelector(".cover-button img"); image.src = cover; image.dataset.coverFallback = fallbackCover; image.alt = `${game.title} cover`; image.loading = options.imagePriority || "lazy"; image.fetchPriority = options.imagePriority === "eager" ? "high" : "low"; image.decoding = "async"; bindCoverFrame(image);
  card.querySelector(".cover-button").dataset.action = "details";
  const title = card.querySelector("h3");
  const namePriceTag = syncedProjection ? "" : missingCollectionPriceBadge(game, "is-title-price");
  title.innerHTML = `<span class="shelf-game-title-text">${escapeHtml(game.title)}</span>${namePriceTag}`;
  title.className = `${title.className.replace(/\bowner-[\w-]+/g, "").replace(/\bhas-missing-price\b/g, "").trim()} ${visibleOwners.map(ownerColorClass).join(" ")} ${namePriceTag ? "has-missing-price" : ""}`.trim();
  const titleOwners = card.querySelector(".title-owners");
  titleOwners.innerHTML = "";
  titleOwners.hidden = true;
  const edit = card.querySelector(".edit-action");
  if (syncedProjection) edit.dataset.action = "edit-preorder"; else edit.dataset.action = "edit";
  const studioText = studio || game.genre || tt(digitalGame || (syncedProjection && isDigitalShelfGame(game)) ? "Digital edition" : "Physical edition");
  card.querySelector(".studio-line").innerHTML = `${visibleOwners.map(ownerBadge).join("")}<span>${escapeHtml(studioText)}</span>`;
  card.querySelector(".meta").innerHTML = (syncedProjection
    ? `${platformBadge(game.platform, { title: game.title })}${mediaFormatBadge(game)}${dlcBadge(game)}${entitlementBadge(game)}${preorderPlaytimePill(game)}`
    : digitalGame ? `${platformBadge(game.platform, { title: game.title })}${mediaFormatBadge(game)}${dlcBadge(game)}${entitlementBadge(game)}${shelfProgressPill(game)}`
    : `<span class="region-flag" title="${escapeHtml(game.country)}">${flagIcon(game.country)}</span>${platformBadge(game.platform, { title: game.title })}${conditionBadge(condition)}${missingCollectionPriceBadge(game)}${shelfProgressPill(game)}`) + shelfRatingScoreBadge(game);
  const playDates = card.querySelector(".play-dates");
  if (preorderProjection) playDates.innerHTML = `${shelfReleaseDatePill(game, "Releases")}${game.preorderStore ? preorderProjectionChip(game.preorderStore) : ""}`;
  else if (wishlistProjection && game.releaseDate) playDates.innerHTML = shelfReleaseDatePill(game, "Released");
  else playDates.remove();
  card.querySelector(".chips").innerHTML = tags.map((tag) => `<span class="chip genre">${escapeHtml(tag)}</span>`).join("");
  card.querySelector(".card-trophies").remove();
  const deleteLabel = escapeHtml(tt("Delete"));
  card.querySelector(".card-actions").innerHTML = syncedProjection ? `<button class="primary-button bought-action editor-only" data-action="${wishlistProjection ? "add-wishlist-backlog" : "accept-preorder"}" type="button">${forwardIcon()}<span>${escapeHtml(tt("Backlog"))}</span></button><button class="ghost-button icon-only-button price-refresh-action editor-only" data-action="show-preorder-prices" type="button" title="${escapeHtml(tt("Prices"))}" aria-label="${escapeHtml(tt("Prices"))}">${currencyIcon()}</button><button class="danger-button icon-only-button delete-action shelf-card-delete-action editor-only" data-action="delete-preorder" type="button" title="${deleteLabel}" aria-label="${deleteLabel}">${trashIcon()}</button>` : isPendingCollectionGame(game) ? `<button class="primary-button add-collection-action editor-only" data-action="add-collection" type="button">${escapeHtml(tt("Add to Collection"))}</button><button class="danger-button icon-only-button shelf-card-delete-action editor-only" data-action="delete" type="button" title="${deleteLabel}" aria-label="${deleteLabel}">${trashIcon()}</button>` : `<button class="ghost-button shelf-add-backlog-action editor-only" data-action="add-backlog" type="button">${backIcon()}<span class="shelf-backlog-desktop-label">${escapeHtml(tt("Backlog from Collection"))}</span><span class="shelf-backlog-mobile-label">${escapeHtml(tt("Add to Backlog"))}</span></button><button class="danger-button icon-only-button shelf-card-delete-action editor-only" data-action="delete" type="button" title="${deleteLabel}" aria-label="${deleteLabel}">${trashIcon()}</button>`;
  const prices = card.querySelector(".prices");
  if (syncedProjection && priceProvidersForGame(game).length) {
    card.classList.add("has-price-footer");
    prices.style.setProperty("--price-columns", priceProvidersForGame(game).length);
    prices.innerHTML = pricesFor(game);
  }
  else prices.remove();
  const note = card.querySelector(".notes");
  note.textContent = syncedProjection ? shortDescription(game.description || "") : game.notes || "";
  if (!syncedProjection) note.classList.add("shelf-card-notes");
  note.hidden = !note.textContent;
  if (!syncedProjection && game.description) note.insertAdjacentHTML("afterend", `<p class="shelf-card-description">${escapeHtml(game.description)}</p>`);
  return card;
}

function gameRow(game) {
  const preorderProjection = Boolean(game.preorderProjection);
  const wishlistProjection = Boolean(game.wishlistProjection);
  const syncedProjection = preorderProjection || wishlistProjection;
  const digitalGame = !syncedProjection && isDigitalShelfGame(game);
  const cover = coverUrl(game.cover || "") || platformFallback(game.platform);
  const studio = [game.developer, game.publisher && game.publisher !== game.developer ? game.publisher : ""].filter(Boolean).join(" / ");
  const owners = game.owners || [];
  const visibleOwners = visibleShelfCardOwners(owners);
  const ownerClasses = visibleOwners.map((owner) => ` ${ownerCardColorClass(owner)}`).join("");
  const tags = visibleShelfTags(game, syncedProjection ? (game.genres || []).slice(0, 4) : [...(game.tags || []), game.category && game.category !== "Game" ? game.category : "", ...String(game.genre || "").split(",")]);
  const description = game.description || "";
  const actions = syncedProjection ? `<div class="game-row-actions-top"><button class="icon-button row-edit-action" data-action="edit-preorder" type="button" title="Edit" aria-label="Edit">${pencilIcon()}</button><button class="icon-button danger-button row-delete-action" data-action="delete-preorder" type="button" title="Delete" aria-label="Delete">${trashIcon()}</button></div><div class="game-row-actions-bottom"><button class="primary-button" data-action="${wishlistProjection ? "add-wishlist-backlog" : "accept-preorder"}" type="button">${forwardIcon()}<span>${escapeHtml(tt("Backlog"))}</span></button></div>` : isPendingCollectionGame(game) ? `<div class="game-row-actions-top"><button class="primary-button add-collection-action" data-action="add-collection" type="button">Add to Collection</button></div><div class="game-row-actions-bottom"><button class="icon-button danger-button row-delete-action" data-action="delete" type="button" title="Delete" aria-label="Delete">${trashIcon()}</button></div>` : `<div class="game-row-actions-top"><button class="icon-button row-edit-action" data-action="edit" type="button" title="Edit" aria-label="Edit">${pencilIcon()}</button><button class="icon-button danger-button row-delete-action" data-action="delete" type="button" title="Delete" aria-label="Delete">${trashIcon()}</button></div><div class="game-row-actions-bottom"><button class="ghost-button shelf-add-backlog-action" data-action="add-backlog" type="button">${backIcon()}<span class="shelf-backlog-desktop-label">${escapeHtml(tt("Backlog from Collection"))}</span><span class="shelf-backlog-mobile-label">${escapeHtml(tt("Add to Backlog"))}</span></button></div>`;
  const mobilePreorderTag = game.preorderStore ? mobilePreorderProjectionChip(game.preorderStore) : "";
  const core = syncedProjection
    ? `${platformBadge(game.platform, { title: game.title })}${mediaFormatBadge(game)}${dlcBadge(game)}${entitlementBadge(game)}${preorderPlaytimePill(game)}${preorderProjection ? shelfReleaseDatePill(game, "Releases") : wishlistProjection ? shelfReleaseDatePill(game, "Released") : ""}${mobilePreorderTag}`
    : digitalGame ? `${platformBadge(game.platform, { title: game.title })}${mediaFormatBadge(game)}${dlcBadge(game)}${entitlementBadge(game)}${shelfProgressPill(game)}${mobilePreorderTag}`
    : `<span class="region-flag" title="${escapeHtml(game.country)}">${flagIcon(game.country)}</span>${platformBadge(game.platform, { title: game.title })}${conditionBadge(conditionLabel(game))}${missingCollectionPriceBadge(game)}${shelfProgressPill(game)}${mobilePreorderTag}`;
  const prices = syncedProjection ? gamelistPreorderPrices(game) : "";
  return `<article class="game-row${preorderProjection ? " preorder-projection-row" : ""}${wishlistProjection ? " wishlist-projection-row" : ""}${syncedProjection ? " synced-projection-row" : ""}${ownerClasses}" data-id="${escapeHtml(game.id)}" role="button" tabindex="0" aria-label="${escapeHtml(`Open ${game.title}`)}"><span class="game-row-cover-wrap"><img class="game-row-cover" src="${escapeHtml(cover)}" alt="" loading="lazy" decoding="async"><img class="game-row-cover-preview" src="${escapeHtml(cover)}" alt="" loading="lazy" decoding="async" aria-hidden="true"></span><div class="game-row-identity"><strong class="${visibleOwners.map(ownerColorClass).join(" ")}">${escapeHtml(game.title)}</strong>${visibleOwners.length || studio ? `<span class="game-row-studio-line">${visibleOwners.map(ownerBadge).join("")}${studio ? `<span>${escapeHtml(studio)}</span>` : ""}</span>` : ""}</div><div class="game-row-core">${core}</div><div class="game-row-tags">${game.preorderStore ? preorderProjectionChip(game.preorderStore) : ""}${tags.map((tag) => `<span class="chip genre">${escapeHtml(tag)}</span>`).join("")}</div>${prices ? `<div class="game-row-prices">${prices}</div>` : ""}${description ? `<div class="game-row-description${syncedProjection ? "" : " shelf-row-description"}">${escapeHtml(description)}</div>` : ""}<div class="game-row-actions">${actions}</div></article>`;
}

function gamelistPreorderPrices(game) {
  return priceProvidersForGame(game).length ? pricesFor(game) : "";
}

function preorderProjectionChip(store) {
  const kickstarter = isKickstarterStore(store);
  const displayStore = kickstarter ? "Kickstarter" : store;
  const icon = kickstarter || isPlayasiaStore(store) ? `<img class="preorder-store-icon" src="${escapeHtml(storeIcon(store))}" alt="" width="14" height="14" decoding="async">` : shoppingBagIcon();
  return `<span class="chip accent preorder-chip${kickstarter ? " preorder-chip-kickstarter" : ""}" title="${escapeHtml(`Preordered: ${displayStore}`)}">${icon}${escapeHtml(displayStore)}</span>`;
}

function mobilePreorderProjectionChip(store) {
  return `<span class="mobile-preorder-tag">${preorderProjectionChip(store)}</span>`;
}

function preorderPlaytimePill(game) {
  if (!game?.lengthHours) return "";
  const url = game.hltbUrl || game.howLongToBeatUrl || `https://howlongtobeat.com/?q=${encodeURIComponent(game.title || "")}`;
  return timeBadgeMarkup(game.lengthHours, url, escapeHtml);
}

function shoppingBagIcon() {
  return `<svg class="shopping-bag-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 8.5h11l1 12h-13l1-12Z"></path><path d="M9 8.5V7a3 3 0 0 1 6 0v1.5"></path></svg>`;
}

function wishlistIcon() {
  return `<svg class="wishlist-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"></path></svg>`;
}

function shelfPreorderCountPill(games) {
  const counts = new Map();
  games.forEach((game) => {
    const store = String(game.preorderStore || "").trim();
    if (store) counts.set(store, (counts.get(store) || 0) + 1);
  });
  const summary = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], undefined, { sensitivity: "base" }));
  const rows = summary.map(([store, count]) => `<span><strong>${escapeHtml(store)}</strong><em>${count}</em></span>`).join("");
  const title = summary.map(([store, count]) => `${store}: ${count}`).join("\n");
  return `<span class="preorder-count-pill preorder-count-tooltip" tabindex="0" title="${escapeHtml(title)}">${shoppingBagIcon()}${escapeHtml(tt("{count} preordered", { count: games.length }))}<span class="preorder-store-list" role="tooltip">${rows}</span></span>`;
}

function visibleShelfCardOwners(owners = []) {
  const defaultOwner = state.gamelistSettings.defaultOwner || "User";
  return owners.filter((owner) => owner !== defaultOwner);
}

function projectionOwners(game) {
  const owners = Array.isArray(game.owners) && game.owners.length ? game.owners : [state.gamelistSettings.defaultOwner || "User"];
  return owners.map(canonicalOwner).filter(Boolean);
}

function visibleProjectionOwners(game) {
  return visibleShelfCardOwners(projectionOwners(game));
}

function projectionOwnerCardClass(game) {
  const owners = visibleProjectionOwners(game);
  return owners.map(ownerCardColorClass).join(" ");
}

function conditionBadge(condition) { const tone = condition === "Complete +" ? "complete-plus" : normalize(condition).replace(/ /g, "-"); return `<span class="condition-pill condition-${tone}"><img src="assets/platforms/disk.png" alt="" width="18" height="18"><span>${escapeHtml(tt(condition))}</span></span>`; }
function missingCollectionPriceBadge(game, variant = "") {
  if (!state.canEdit || !shelfPricesVisible() || isDigitalShelfGame(game) || collectionValueFor(game) > 0) return "";
  const currency = normalizePriceSettings(state.gamelistSettings).currency;
  const label = tt("Missing {currency} price data", { currency });
  return `<span class="missing-collection-price-tag ${escapeHtml(variant)}" title="${escapeHtml(label)}" aria-label="${escapeHtml(label)}">${currencyIcon()}</span>`;
}

function handleShelfClick(event) {
  const card = event.target.closest("[data-id]");
  const action = event.target.closest("[data-action]")?.dataset.action;
  if (!card) return;
  const game = shelfDisplayedGameById(card.dataset.id);
  if (!game) return;
  if (action === "edit") state.canEdit ? openEditor(game) : openAuth();
  else if (action === "add-collection") state.canEdit ? openEditor(game) : openAuth();
  else if (action === "add-backlog") state.canEdit ? addShelfGameToGamelist(game, { section: "backlog" }) : openAuth();
  else if (action === "accept-preorder") state.canEdit ? acceptSyncedPreorder(game) : openAuth();
  else if (action === "add-wishlist-backlog") state.canEdit ? addSyncedWishlistToBacklog(game) : openAuth();
  else if (action === "edit-preorder") state.canEdit ? openPreorderInGamelistEditor(game) : openAuth();
  else if (action === "show-preorder-prices") openGamelistDetails(game);
  else if (action === "delete-preorder") state.canEdit ? deleteSyncedPreorder(game) : openAuth();
  else if (action === "delete") state.canEdit ? deleteGame(game) : openAuth();
  else if (game.preorderProjection || game.wishlistProjection) openGamelistDetails(game);
  else openDetails(game);
}

function shelfDisplayedGameById(id) {
  if (state.filters.tab === "preorders") return syncedPreorderGames().find((item) => item.id === id);
  if (state.filters.tab === "wishlist") return syncedWishlistGames().find((item) => item.id === id);
  return state.games.find((item) => item.id === id);
}

function openPreorderInGamelistEditor(game) {
  const url = new URL("/", window.location.origin);
  url.searchParams.set("edit", game.id);
  window.location.href = url.href;
}

function openDetails(game) {
  el.detailDialog.dataset.id = game.id;
  el.detailDialog.dataset.projection = game._gamelistProjection ? "true" : "false";
  const missingPriceTag = missingCollectionPriceBadge(game, "is-title-price");
  el.detailTitle.innerHTML = `<span>${escapeHtml(game.title)}</span>${missingPriceTag}`;
  el.detailTitle.className = `${el.detailTitle.className.replace(/\bowner-[\w-]+/g, "").replace(/\bhas-missing-price\b/g, "").trim()} ${(game.owners || []).map(ownerColorClass).join(" ")} ${missingPriceTag ? "has-missing-price" : ""}`.trim();
  const detailStudio = [game.developer, game.publisher && game.publisher !== game.developer ? game.publisher : ""].filter(Boolean).join(" / ");
  el.detailStudio.innerHTML = `${visibleShelfCardOwners(game.owners || []).map(ownerBadge).join("")}${detailStudio ? `<span>${escapeHtml(detailStudio)}</span>` : ""}`;
  el.detailStudio.hidden = !el.detailStudio.innerHTML;
  const digitalGame = isDigitalShelfGame(game);
  el.detailMeta.innerHTML = `${!digitalGame && game.country ? `<span class="region-flag" title="${escapeHtml(game.country)}">${flagIcon(game.country)}</span>` : ""}${platformBadge(game.platform, { title: game.title })}${digitalGame ? `${mediaFormatBadge(game)}${dlcBadge(game)}${entitlementBadge(game)}` : ""}`;
  const fallbackCover = coverUrl(game.cover || "") || platformFallback(game.platform);
  el.detailCover.src = fallbackCover;
  el.detailCover.dataset.coverFallback = fallbackCover;
  el.detailCover.parentElement.classList.remove("has-wrap");
  el.detailCover.alt = `${game.title} cover`;
  bindCoverFrame(el.detailCover);
  const detailTags = visibleShelfTags(game, [...(game.tags || []), game.category && game.category !== "Game" ? game.category : "", ...String(game.genre || "").split(",")]);
  el.detailChips.innerHTML = detailTags.map((value) => `<span class="chip genre">${escapeHtml(value)}</span>`).join("");
  el.detailDates.innerHTML = `${shelfReleaseDatePill(game, "Released")}${game.createdAt && !["upcoming", "wanted"].includes(game.section) ? `<span class="history-pill history-date-pill"><small>Added</small><strong>${escapeHtml(formatDate(game.createdAt))}</strong></span>` : ""}`;
  el.detailDates.hidden = !el.detailDates.innerHTML;
  el.detailNote.hidden = !game.notes;
  el.detailNote.textContent = game.notes || "";
  el.detailDescription.textContent = game.description || "";
  el.detailDescription.hidden = !game.description;
  el.detailPricePanel.classList.remove("is-collapsed");
  el.detailPriceToggle.setAttribute("aria-expanded", "true");
  el.detailCondition.innerHTML = ["game", "manual", "box", "other", "sealed"].map((key) => `<label class="check-filter toggle-check detail-condition-check condition-${key}"><input type="checkbox" ${conditionValue(game, key) ? "checked" : ""} disabled><span>${escapeHtml(tt(key[0].toUpperCase() + key.slice(1)))}</span></label>`).join("");
  el.detailConditionPanel.hidden = Boolean(game._gamelistProjection || digitalGame);
  const links = websiteLinks(game);
  el.detailLinks.innerHTML = storeLinkButtons(game, links);
  const guides = activityGuideLinks(game);
  el.detailGuides.hidden = !guides.length;
  el.detailGuideLinks.innerHTML = guides.join("");
  const showPrices = shelfPricesVisible() && !game._gamelistProjection && !digitalGame;
  el.detailConditionPanel.classList.toggle("price-panel-hidden", !showPrices);
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

function openEditor(game = null, options = {}) {
  if (!state.canEdit) return openAuth();
  shelfNewGameTouchedFields = new Set();
  state.gamelistAddTarget = options.target === "gamelist" ? "gamelist" : "shelf";
  state.gamelistImportShelfId = options.importShelfId || "";
  state.gamelistImportGameId = options.importGameId || "";
  state.gamelistSectionTouched = Boolean(options.section);
  document.querySelector("#shelfAddCollectionInput").checked = Boolean(options.addToBacklog);
  el.gamelistPlaying.checked = false;
  state.autocompleteImport = Boolean(options.autocomplete && !options.miniGamelistImport);
  el.addDialog.classList.toggle("shelf-gamelist-import-mini", Boolean(options.miniGamelistImport));
  el.addForm.classList.toggle("shelf-gamelist-import-mini", Boolean(options.miniGamelistImport));
  const gameDataDisclosure = document.querySelector("#shelfGameDataDisclosure");
  const lockGameDataOpen = !game && !options.miniGamelistImport;
  gameDataDisclosure.dataset.lockedOpen = String(lockGameDataOpen);
  gameDataDisclosure.querySelector("summary").hidden = lockGameDataOpen;
  document.querySelector("#shelfGameDataHeading").hidden = !lockGameDataOpen;
  gameDataDisclosure.open = !options.miniGamelistImport;
  renderShelfGamelistImportSummary(options.miniGamelistImport ? game : null);
  const digitalMode = Boolean(options.digital || isDigitalShelfGame(game));
  state.editingId = game?.id || "";
  el.digitalInput.checked = digitalMode;
  syncShelfDigitalEditorMode(digitalMode);
  state.pendingLengthHours = roundApproximateHours(game?.lengthHours) || null;
  state.lookupResults = [];
  el.lookupResults.classList.remove("loaded");
  el.lookupInput.closest(".lookup-row").hidden = false;
  el.lookupInput.closest("label").hidden = false;
  el.lookupButton.hidden = false;
  el.lookupResults.hidden = false;
  el.lookupResults.innerHTML = "";
  el.lookupInput.value = game?.title || "";
  el.lookupButton.classList.toggle("is-autocomplete", state.autocompleteImport);
  el.lookupButton.title = state.autocompleteImport ? tt("Autocomplete game info") : tt("Fetch info");
  el.lookupButton.setAttribute("aria-label", el.lookupButton.title);
  const values = game || { platform: "", country: defaultShelfCountry(), owners: defaultShelfOwners(), game: true };
  for (const [key, input] of Object.entries(el.fields)) if (!["dlc", "psPlus", "gamesWithGold"].includes(key)) input.value = values[key] ?? "";
  el.fields.country.value = COUNTRY_OPTIONS.some(([country]) => country === values.country) ? values.country : defaultShelfCountry();
  const existingCollection = options.importShelfId && state.games.find(item => item.id === options.importShelfId && !item.pendingCollection);
  const movingToBacklog = options.section === "backlog" && Boolean(options.importGameId) && !existingCollection;
  el.fields.additionDate.value = movingToBacklog ? shelfTodayInputValue() : shelfDateInputValue(values.createdAt) || (game ? "" : shelfTodayInputValue());
  el.fields.platform.value = values.platform ? platformDisplayName(values.platform) : "";
  if (!el.fields.genre.value && Array.isArray(values.genres)) el.fields.genre.value = values.genres.join(", ");
  syncShelfEditorCoverPreview();
  el.fields.dlc.checked = Boolean(values.dlc);
  el.fields.psPlus.checked = Boolean(values.psPlus);
  el.fields.gamesWithGold.checked = Boolean(values.gamesWithGold);
  el.gamelistReleaseText.value = values.releaseText || "";
  el.gamelistEmulator.checked = Boolean(values.emulator);
  el.gamelistCoop.checked = Boolean(values.coop);
  el.gamelistMultiplayer.checked = Boolean(values.multiplayer || values.coop);
  el.gamelistStream.checked = Boolean(values.stream);
  el.gamelistPlaying.checked = Boolean(options.addToBacklog && values.playing);
  syncShelfGamelistPreorderStreamLayout();
  el.gamelistLength.value = values.lengthHours ?? "";
  el.gamelistSection.value = options.section || "wanted";
  el.gamelistPreorderCheck.checked = false;
  el.gamelistPreorderField.hidden = true;
  el.gamelistPreferredStore.value = values.preferredStore || "";
  syncShelfGamelistStoreIcons();
  el.gamelistStatuses.value = (values.statuses || values.tags || []).join(", ");
  el.fields.owners.value = (values.owners || []).join(", ");
  const links = normalizedStoreLinks(values);
  el.fields.playstationUrl.value = links.playstation;
  el.fields.nintendoUrl.value = links.nintendo;
  el.fields.steamUrl.value = links.steam;
  el.fields.xboxUrl.value = links.xbox;
  el.fields.hltbUrl.value = values.hltbUrl || values.howLongToBeatUrl || links.hltb;
  el.fields.igdbUrl.value = values.igdbUrl || links.igdb;
  Object.entries(el.conditionFields).forEach(([key, input]) => { input.checked = conditionValue(values, key); });
  syncConditionInputs();
  const title = el.addForm.querySelector(".modal-head h2");
  if (!game && !digitalMode) setShelfEditorTitle(title, tt("Add game to Shelf"), [tt("Add game"), tt("to Shelf")]);
  else setShelfEditorTitle(title, tt(game?.pendingCollection ? "Add to Collection" : game ? "Edit game" : "Add a digital game"));
  el.addForm.querySelectorAll("button[type='submit']").forEach((button) => { button.textContent = game?.pendingCollection ? "Add to Collection" : game ? "Save" : "Add to Shelf"; });
  syncShelfGamelistTargetPicker();
  syncShelfGamelistTargetMode();
  if (options.section && ["backlog", "upcoming", "wanted"].includes(options.section)) {
    el.gamelistSection.value = options.section;
    syncShelfGamelistTargetMode();
  }
  el.editDelete.hidden = !game || isGamelistProjectionTarget();
  syncStyledSelects(el.addDialog, { activeValue: null });
  syncShelfEditorIcons();
  shelfEditorDirty = false;
  openDialog(el.addDialog);
}

function renderShelfGamelistImportSummary(game) {
  const summary = el.gamelistImportSummary;
  if (!summary) return;
  summary.hidden = !game;
  if (!game) return;
  const cover = summary.querySelector(".shelf-gamelist-import-cover");
  const fallback = coverUrl(game.cover || "") || platformFallback(game.platform);
  cover.src = fallback;
  cover.alt = game.title ? `${game.title} cover` : "";
  cover.onerror = () => { cover.onerror = null; cover.src = "assets/Icon_shelf.png"; };
  summary.querySelector(".shelf-gamelist-import-title").textContent = game.title || "";
  const platformRegion = [platformDisplayName(game.platform), game.country || game.region || ""].filter(Boolean).join(" · ");
  summary.querySelector(".shelf-gamelist-import-platform").textContent = platformRegion;
  const condition = ["game", "manual", "box", "other", "sealed"]
    .filter((key) => conditionValue(game, key))
    .map((key) => tt(key[0].toUpperCase() + key.slice(1)));
  summary.querySelector(".shelf-gamelist-import-condition").textContent = condition.join(" · ");
  summary.querySelector(".shelf-gamelist-import-notes").textContent = game.notes || "";
}

function requestShelfEditorClose() {
  if (shelfEditorDirty) {
    showShelfEditorUnsavedDialog();
    return;
  }
  closeDialog(el.addDialog);
}

function showShelfEditorUnsavedDialog() {
  document.querySelector("#editorUnsavedDialog")?.showModal();
}

function syncShelfDigitalEditorMode(digitalMode) {
  el.addForm.classList.toggle("digital-game-editor", digitalMode);
  el.addForm.classList.toggle("is-new-shelf-game", !state.editingId);
  syncShelfNewGameHighlights();
  el.addForm.classList.toggle("digital-tracking-disabled", state.gamelistSettings.shelfDigitalGames !== true);
  el.addForm.dataset.digital = digitalMode ? "true" : "false";
  el.fields.country.required = !digitalMode && !isGamelistProjectionTarget();
  if (el.lookupLabelDigital) el.lookupLabelDigital.textContent = tt("Search DB or IGDB URL");
  el.lookupInput.placeholder = tt(digitalMode ? "Type a game name or paste an IGDB page" : "Game name or PriceCharting page");
  const game = state.games.find((item) => item.id === state.editingId);
  const title = el.addForm.querySelector(".modal-head h2");
  if (!game && !digitalMode) setShelfEditorTitle(title, tt("Add game to Shelf"), [tt("Add game"), tt("to Shelf")]);
  else setShelfEditorTitle(title, tt(game?.pendingCollection ? "Add to Collection" : game ? "Edit game" : "Add a digital game"));
  el.addForm.querySelectorAll("button[type='submit']").forEach((button) => { button.textContent = game?.pendingCollection ? "Add to Collection" : game ? "Save" : "Add to Shelf"; });
  syncShelfEntitlementEditor();
  if (el.gamelistTargetPicker) syncShelfGamelistTargetMode();
}

function syncShelfGamelistTargetPicker() {
  el.gamelistTargetPicker.querySelector('[data-gamelist-target="gamelist"]').hidden = false;
  el.gamelistTargetPicker.hidden = true;
}

function isGamelistProjectionTarget() {
  return state.gamelistAddTarget === "gamelist";
}

function shelfCollectionEnabled() {
  return isGamelistProjectionTarget() && el.gamelistSection.value === "backlog"
    && (!el.digitalInput.checked || state.gamelistSettings.shelfDigitalGames === true)
    && (el.addForm.classList.contains("shelf-gamelist-import-mini") || document.querySelector("#shelfAddCollectionInput").checked);
}

function syncShelfGamelistTargetMode() {
  const target = state.gamelistAddTarget;
  const active = isGamelistProjectionTarget();
  const collectingInfo = el.addForm.classList.contains("shelf-gamelist-import-mini");
  const combined = shelfCollectionEnabled() && !collectingInfo;
  el.addForm.classList.toggle("combined-collection-editor", combined);
  el.addForm.classList.toggle("gamelist-target-editor", active && !collectingInfo);
  el.addForm.classList.toggle("gamelist-target-wishlist", target === "wishlist");
  el.addForm.classList.toggle("gamelist-target-preorder", target === "preorder");
  const digitalToggle = el.digitalInput.closest(".lookup-digital-check");
  const desktopLayout = window.matchMedia("(min-width: 700px)").matches;
  if (active || desktopLayout) {
    digitalToggle.classList.add("gamelist-target-digital-field");
    el.addForm.querySelector(".shelf-editor-grid").insertBefore(digitalToggle, el.gamelistPlacement);
  } else {
    digitalToggle.classList.remove("gamelist-target-digital-field");
    el.lookupButton.after(digitalToggle);
  }
  el.gamelistPlacement.hidden = !active;
  el.gamelistListPicker.hidden = collectingInfo || Boolean(state.editingId && !state.gamelistImportGameId);
  document.querySelector("#shelfGamelistListControls").hidden = !collectingInfo && Boolean(state.editingId && !state.gamelistImportGameId);
  el.gamelistPreorderCheck.closest(".shelf-gamelist-preorder-row").hidden = !active;
  el.gamelistPreorderField.hidden = !active || !el.gamelistPreorderCheck.checked;
  el.gamelistPreorderField.closest(".shelf-gamelist-preorder-row")?.classList.toggle("has-preorder-store", active && el.gamelistPreorderCheck.checked);
  syncShelfGamelistSectionButtons();
  el.addForm.querySelectorAll("[data-gamelist-target]").forEach((button) => {
    const selected = button.dataset.gamelistTarget === target;
    button.classList.toggle("active", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
  syncShelfGamelistTargetIndicator();
  const title = el.addForm.querySelector(".modal-head h2");
  const eyebrow = el.addForm.querySelector(".modal-head .eyebrow");
  if (active) {
    const collectingInfo = el.addForm.classList.contains("shelf-gamelist-import-mini");
    if (eyebrow) eyebrow.textContent = collectingInfo ? tt("Gamelist") : "GAME DATA";
    if (title) {
      const titleText = shelfGamelistAddTitle();
      setShelfEditorTitle(title, titleText, shelfGamelistMobileTitleParts());
    }
    el.addForm.querySelector(".form-group h3").textContent = tt("Collecting Information");
    const saveLabel = collectionEditorLabels()?.button || "Add game";
    el.addForm.querySelectorAll("button[type='submit']").forEach((button) => { button.textContent = tt(saveLabel); });
    el.lookupLabelPhysical.textContent = tt("Search DB or IGDB URL");
    el.lookupInput.placeholder = tt("Type a game name or paste an IGDB page");
    syncShelfGamelistSectionForTarget();
    el.gamelistSection.disabled = true;
  } else {
    el.lookupLabelPhysical.textContent = tt("Search DB or PriceCharting");
    if (eyebrow) eyebrow.textContent = tt("Game data");
    const game = state.games.find((item) => item.id === state.editingId);
    if (title) {
      const titleText = tt(collectionEditorLabels()?.title || (game ? "Edit game" : "Add to Collection"));
      setShelfEditorTitle(title, titleText);
    }
    el.addForm.querySelector(".form-group h3").textContent = tt("Collecting Information");
    el.addForm.querySelectorAll("button[type='submit']").forEach((button) => { button.textContent = tt(collectionEditorLabels()?.button || (game ? "Save" : "Add to Collection")); });
    el.lookupInput.placeholder = tt(el.addForm.dataset.digital === "true" ? "Type a game name or paste an IGDB page" : "Game name or PriceCharting page");
    el.gamelistSection.disabled = false;
  }
  el.fields.country.required = el.addForm.dataset.digital !== "true" && (!active || shelfCollectionEnabled());
  syncStyledSelect(el.gamelistSection);
  syncShelfGamelistPreorderRequirement();
  syncShelfNewGameHighlights();
}

function syncShelfGamelistSectionForTarget() {
  if (document.querySelector("#shelfAddCollectionInput").checked) return;
  if (state.gamelistAddTarget === "gamelist") {
    if (!state.gamelistSectionTouched && !state.gamelistImportShelfId && !state.gamelistImportGameId) {
      const releaseDate = dateOnly(el.fields.releaseDate.value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const futureRelease = Boolean(releaseDate) && new Date(`${releaseDate}T00:00:00`).getTime() > today.getTime();
      el.gamelistSection.value = futureRelease ? "upcoming" : "wanted";
    }
    syncShelfGamelistSectionButtons();
  }
  syncStyledSelect(el.gamelistSection);
}

function syncShelfGamelistTargetIndicator() {
  if (!el.gamelistTargetPicker || el.gamelistTargetPicker.hidden) return;
  const targetOptions = el.gamelistTargetPicker.querySelector(".shelf-gamelist-target-options");
  const visibleTargets = [...el.gamelistTargetPicker.querySelectorAll("[data-gamelist-target]")].filter((button) => !button.hidden);
  const activeTarget = visibleTargets.find((button) => button.dataset.gamelistTarget === state.gamelistAddTarget) || visibleTargets[0];
  targetOptions?.style.setProperty("--target-count", String(visibleTargets.length));
  if (targetOptions && activeTarget) {
    requestAnimationFrame(() => {
      targetOptions.style.setProperty("--target-left", `${activeTarget.offsetLeft}px`);
      targetOptions.style.setProperty("--target-width", `${activeTarget.offsetWidth}px`);
    });
  }
}

function shelfGamelistAddTitle() {
  const collectionLabels = collectionEditorLabels();
  if (collectionLabels) return tt(collectionLabels.title);
  if (el.gamelistPreorderCheck.checked) return tt("Add a new preorder");
  if (el.gamelistSection.value === "upcoming") return tt("Add upcoming game");
  return tt(el.gamelistSection.value === "backlog" ? "Add game to Backlog" : "Add available game");
}

function collectionEditorLabels() {
  const collectingInfo = el.addForm.classList.contains("shelf-gamelist-import-mini");
  if (!collectingInfo && isGamelistProjectionTarget() && el.gamelistSection.value !== "backlog") return null;
  if (!collectingInfo && state.editingId && !state.gamelistImportGameId && !state.games.find(game => game.id === state.editingId)?.pendingCollection) return null;
  const backlog = document.querySelector("#shelfAddCollectionInput").checked;
  const collection = !isGamelistProjectionTarget() || shelfCollectionEnabled();
  if (backlog && el.gamelistPlaying.checked) {
    const streaming = el.gamelistStream.checked;
    return {
      title: collection ? (streaming ? "Add to Collection and Start Streaming" : "Add to Collection and Start Playing") : (streaming ? "Add and Start Streaming" : "Add and Start Playing"),
      button: streaming ? "Add and Start Streaming" : "Add and Start Playing",
    };
  }
  const label = backlog ? (collection ? "Add to Collection and Backlog" : "Add to Backlog") : "Add to Collection";
  return { title: label, button: label };
}

function setShelfEditorTitle(title, text, mobileLines = []) {
  if (!title) return;
  title.classList.toggle("mobile-two-line-title", mobileLines.length === 2);
  title.classList.toggle("mobile-two-line-title-shelf", mobileLines.length === 2 && mobileLines[1] === tt("to Shelf"));
  title.classList.toggle("mobile-two-line-title-backlog", mobileLines.length === 2 && mobileLines[1] === tt("to Backlog"));
  title.innerHTML = mobileLines.length === 2
    ? `${escapeHtml(mobileLines[0])} <br class="mobile-title-break">${escapeHtml(mobileLines[1])}`
    : escapeHtml(text);
}

function shelfGamelistMobileTitleParts() {
  if (collectionEditorLabels()) return [];
  if (isGamelistProjectionTarget() && el.gamelistSection.value === "backlog") return [tt("Add game"), tt("to Backlog")];
  if (isGamelistProjectionTarget() && el.gamelistSection.value === "upcoming") return [tt("Add game"), tt("to Radar")];
  if (isGamelistProjectionTarget() && el.gamelistSection.value === "wanted") return [tt("Add game"), tt("to Wishlist")];
  return [];
}

function syncShelfGamelistSectionButtons() {
  syncShelfGamelistPreorderVisibility();
  syncGameListSlider(el.gamelistListPicker, !isGamelistProjectionTarget() || el.gamelistSection.value === "backlog" ? "collection" : el.gamelistSection.value);
  syncShelfNewGameHighlights();
  if (isGamelistProjectionTarget()) {
    const title = el.addForm.querySelector(".modal-head h2");
    if (title) {
      const titleText = shelfGamelistAddTitle();
      setShelfEditorTitle(title, titleText, shelfGamelistMobileTitleParts());
    }
  }
}

function syncShelfGamelistPreorderVisibility() {
  const { isBacklog } = syncShelfGamelistPreorderStreamLayout();
  if (isBacklog) {
    syncShelfGamelistStoreIcons();
    syncShelfGamelistPreorderRequirement();
  }
}

function syncShelfGamelistPreorderStreamLayout() {
  const result = syncGameListControls({
    active: isGamelistProjectionTarget(),
    section: el.gamelistSection.value,
    preorderCheck: el.gamelistPreorderCheck,
    preorderStore: el.gamelistPreorderStore,
    preorderField: el.gamelistPreorderField,
    preorderRow: el.gamelistPreorderCheck.closest(".shelf-gamelist-preorder-row"),
    streamRow: document.querySelector("#shelfGamelistPreorderStreamRow"),
    streamInput: el.gamelistStream,
    hasTwitchAccount: (!isGamelistProjectionTarget() || el.gamelistSection.value === "backlog") && Boolean(String(state.gamelistSettings?.twitchUser || loadSharedSettings().twitchUser || "").trim()),
  });
  const field = document.querySelector(".shelf-add-collection-check");
  const input = document.querySelector("#shelfAddCollectionInput");
  const collectingInfo = el.addForm.classList.contains("shelf-gamelist-import-mini");
  field.hidden = (isGamelistProjectionTarget() && el.gamelistSection.value !== "backlog") || (!collectingInfo && Boolean(state.editingId && !state.gamelistImportGameId));
  input.disabled = false;
  el.gamelistPlaying.closest("label").hidden = field.hidden;
  const row = document.querySelector("#shelfGamelistPreorderStreamRow");
  row.classList.toggle("has-collection-option", !field.hidden);
  row.classList.toggle("has-playing-option", !field.hidden);
  if (!field.hidden) {
    row.hidden = false;
    const streamField = el.gamelistStream.closest("label");
    streamField.hidden = !String(state.gamelistSettings.twitchUser || "").trim();
    row.classList.toggle("has-stream", !streamField.hidden);
  }
  return result;
}

function setShelfGamelistAddTarget(target) {
  state.gamelistAddTarget = ["shelf", "gamelist"].includes(target) ? target : "shelf";
  if (state.gamelistAddTarget === "gamelist") {
    el.gamelistSection.value = "wanted";
    el.gamelistPreorderCheck.checked = false;
    el.gamelistPreorderStore.value = "";
  }
  syncShelfGamelistTargetMode();
}

function syncShelfGamelistPreorderRequirement() {
  const required = isGamelistProjectionTarget() && el.gamelistPreorderCheck.checked && !el.gamelistPreorderStore.value.trim();
  el.addForm.classList.toggle("needs-gamelist-preorder-store", required);
}

function syncShelfGamelistStoreIcons() {
  syncShelfGamelistStoreIcon(el.gamelistPreorderStore, document.querySelector(".shelf-gamelist-store-icon"));
  syncShelfGamelistStoreIcon(el.gamelistPreferredStore, document.querySelector(".shelf-gamelist-preferred-store-icon"));
}

function syncShelfGamelistStoreIcon(input, slot) {
  syncStoreFieldIcon(input, slot);
}

function validateShelfGamelistTarget() {
  syncShelfGamelistPreorderRequirement();
  if (!el.addForm.classList.contains("needs-gamelist-preorder-store")) return true;
  showToast(tt("Set the preorder store before saving."), "error");
  return false;
}

function markShelfNewGameFieldTouched(event) {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const field = target.closest(".shelf-title-field, .shelf-console-field, .shelf-release-field, .shelf-addition-field, .shelf-region-field");
  if (!field || !el.addForm.contains(field)) return;
  const key = field.classList.contains("shelf-title-field") ? "title"
    : field.classList.contains("shelf-console-field") ? "platform"
      : field.classList.contains("shelf-release-field") ? "release-date"
        : field.classList.contains("shelf-addition-field") ? "addition-date" : "region";
  markShelfNewGameFieldsTouched([key]);
}

function markShelfNewGameFieldsTouched(keys) {
  if (state.editingId) return;
  keys.forEach((key) => shelfNewGameTouchedFields.add(key));
  syncShelfNewGameHighlights();
}

function syncShelfNewGameHighlights() {
  el.addForm.classList.toggle("needs-collection-choice", !document.querySelector(".shelf-add-collection-check").hidden
    && !shelfNewGameTouchedFields.has("collection-choice"));
  const isNewShelfGame = el.addForm.classList.contains("is-new-shelf-game");
  const projectionTarget = isGamelistProjectionTarget();
  const values = { title: el.fields.title.value.trim(), platform: el.fields.platform.value.trim(), "release-date": el.fields.releaseDate.value };
  for (const key of ["title", "platform", "release-date", "addition-date", "region"]) {
    const needsHighlight = projectionTarget && key in values ? !values[key] : !shelfNewGameTouchedFields.has(key);
    el.addForm.classList.toggle(`needs-${key}-field`, isNewShelfGame && needsHighlight);
  }
}

async function deleteCurrentEditedGame() {
  const game = state.games.find((item) => item.id === state.editingId);
  if (!game) return;
  await deleteGame(game);
}

async function lookupGame() {
  const query = el.lookupInput.value.trim() || el.fields.title.value.trim();
  if (!query) return;
  el.lookupInput.closest(".lookup-row").hidden = false;
  el.lookupInput.closest("label").hidden = false;
  el.lookupButton.hidden = false;
  el.lookupResults.hidden = false;
  showToast("Fetching game info...");
  el.lookupButton.disabled = true;
  el.lookupButton.classList.add("is-loading");
  el.lookupButton.title = "Fetching game information";
  el.lookupResults.classList.remove("loaded");
  const digitalMode = el.digitalInput.checked || isGamelistProjectionTarget();
  el.lookupResults.innerHTML = `<div class="empty">${escapeHtml(tt(digitalMode ? "Searching IGDB…" : "Searching game data and PriceCharting editions…"))}</div>`;
  el.lookupResults.classList.add("loaded");
  try {
    if (digitalMode) {
      const gameData = await fetchGameMetadataData(query);
      state.lookupResults = (gameData.results || []).slice(0, 12).map((result) => ({ ...result, lookupSource: "game" }));
      state.metadataLookupResults = state.lookupResults;
      renderShelfLookupResults();
      if (state.autocompleteImport && state.lookupResults.length) {
        const normalizedQuery = normalizeSearchText(query);
        const exactIndex = state.lookupResults.findIndex((result) => [result.title, result.matchedTitle]
          .some((title) => normalizeSearchText(title || "") === normalizedQuery));
        const exactResultButton = exactIndex >= 0
          ? el.lookupResults.querySelector(`[data-result-index="${exactIndex}"]`)
          : null;
        if (exactResultButton) await chooseLookupResult({ target: exactResultButton });
      }
      return;
    }
    const directUrl = priceChartingPageUrl(query);
    if (directUrl) {
      const physical = await fetchPhysicalMetadata(el.fields.title.value.trim(), { url: directUrl });
      if (!physical) throw new Error(tt("PriceCharting edition unavailable"));
      el.fields.platform.value = platformDisplayName(bestCollectionPlatform([physical.consoleName], el.fields.platform.value));
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
    const physicalResults = (physicalData.status === "fulfilled" ? physicalData.value.results || [] : [])
      .slice(0, 8)
      .map((result) => {
        const metadata = bestGameMetadata(result.productName || query);
        return { ...result, title: result.productName, platform: result.consoleName, cover: metadata?.cover || "", lookupSource: "pricecharting" };
      });
    state.lookupResults = physicalResults.length ? physicalResults : gameResults;
    if (physicalResults[0]) {
      await prefillPhysicalResult(physicalResults[0]);
      applyGameMetadata(bestGameMetadata(physicalResults[0].productName || query));
    }
    renderShelfLookupResults();
    showToast(state.lookupResults.length ? `Found ${state.lookupResults.length} matches.` : "No close match found.");
  } catch {
    el.lookupResults.innerHTML = `<div class="empty">Lookup is unavailable right now. Manual entry still works.</div>`;
    showToast("Game info fetch unavailable.", "error");
  } finally {
    requestAnimationFrame(() => el.lookupResults.classList.add("loaded"));
    el.lookupButton.disabled = false;
    el.lookupButton.classList.remove("is-loading");
    el.lookupButton.title = state.autocompleteImport ? tt("Autocomplete game info") : tt("Fetch info");
    el.lookupButton.setAttribute("aria-label", el.lookupButton.title);
  }
}

async function fetchGameMetadataData(query) {
  for (const title of gameMetadataQueries(query)) {
    const params = new URLSearchParams({ q: title, lang: currentLanguage(), v: "4" });
    const response = await fetch(`/api/search?${params}`);
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
  const settings = normalizePriceSettings(state.gamelistSettings);
  const selectedPlatform = shortPlatform(el.fields.platform.value);
  const searches = [];
  for (const title of physicalLookupQueries(query)) {
    searches.push({ title, platform: selectedPlatform });
    searches.push({ title, platform: "" });
  }
  const results = [];
  let searchUrl = "";
  for (const search of searches) {
    const params = new URLSearchParams({ mode: "search", title: search.title, region: el.fields.country.value, currency: settings.currency });
    if (search.platform) params.set("platform", search.platform);
    const response = await fetch(`/api/collection-price?${params}`);
    const data = response.ok ? await response.json() : { results: [] };
    if (!searchUrl && data.searchUrl) searchUrl = data.searchUrl;
    results.push(...(data.results || []));
    if (bestPhysicalSearchScore(query, results[0] || {}, selectedPlatform) >= 1.28) break;
  }
  return {
    results: uniquePhysicalResults(results)
      .sort((a, b) => bestPhysicalSearchScore(query, b, selectedPlatform) - bestPhysicalSearchScore(query, a, selectedPlatform))
      .slice(0, 12),
    searchUrl,
  };
}

function physicalLookupQueries(query) {
  const normalized = normalize(query);
  const values = [query, normalized, normalized.replace(/\bversion\b/g, " "), normalized.replace(/\bcollectors\b/g, "collector").replace(/\bspecial\b/g, "deluxe")];
  return [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))];
}

function uniquePhysicalResults(results) {
  const seen = new Set();
  return results.filter((result) => {
    const key = String(result.productId || result.url || `${result.consoleName}:${result.productName}`).trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function bestPhysicalSearchScore(query, result, selectedPlatform = "") {
  const wanted = normalize(query);
  const found = normalize(result.productName || result.title || "");
  if (!wanted || !found) return 0;
  const wantedTokens = wanted.split(" ").filter((token) => token.length > 1 && !["of", "the", "and"].includes(token));
  const matchedTokens = wantedTokens.filter((token) => found.includes(token)).length;
  const tokenScore = matchedTokens / Math.max(1, wantedTokens.length);
  const exactBonus = found === wanted ? 0.55 : found.startsWith(wanted) ? 0.28 : 0;
  const platformBonus = selectedPlatform && normalize(result.consoleName).includes(normalize(selectedPlatform)) ? 0.08 : 0;
  return tokenScore + exactBonus + platformBonus;
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
    const image = coverUrl(result.cover || "");
    const publisherDate = lookupPublisherDateLine(result);
    const tags = lookupTagsLine(result);
    const description = shortDescription(result.description || "", 180);
    const igdbRating = physical ? "" : igdbRatingBadge(result);
    const matchedTitle = physical ? "" : localizedMatchedTitleLine(result);
    const body = physical
      ? `<p>${escapeHtml(platforms.join(" · ") || "Platform unknown")}</p>`
      : `${matchedTitle ? `<p>${escapeHtml(matchedTitle)}</p>` : ""}${publisherDate ? `<p>${escapeHtml(publisherDate)}</p>` : ""}${tags ? `<p>${escapeHtml(tags)}</p>` : ""}${description ? `<p>${escapeHtml(description)}</p>` : ""}`;
    const cover = image
      ? `<img src="${escapeHtml(image)}" alt="">`
      : `<span class="lookup-cover-placeholder" aria-hidden="true"></span>`;
    return `<div class="lookup-result shelf-lookup-result${image ? "" : " no-cover"}">${cover}<div><span class="lookup-result-title"><strong>${escapeHtml(result.title || "Untitled game")}</strong>${igdbRating}</span>${body}</div><button class="ghost-button" type="button" data-result-index="${index}">Use</button></div>`;
  }).join("");
  el.lookupResults.querySelectorAll(".lookup-result img").forEach((cover) => {
    cover.addEventListener("error", () => {
      const placeholder = document.createElement("span");
      placeholder.className = "lookup-cover-placeholder";
      placeholder.setAttribute("aria-hidden", "true");
      cover.closest(".lookup-result")?.classList.add("no-cover");
      cover.replaceWith(placeholder);
    });
  });
  requestAnimationFrame(() => el.lookupResults.classList.add("loaded"));
}

function localizedMatchedTitleLine(result) {
  const matched = String(result?.matchedTitle || "").trim();
  const title = String(result?.title || "").trim();
  if (!matched || normalizeSearchText(matched) === normalizeSearchText(title)) return "";
  return tt("Also known as {title}", { title: matched });
}

function lookupPublisherDateLine(result) {
  return [
    [result.developer, result.publisher].filter(Boolean).join(" / "),
    result.releaseDate || result.releaseText,
  ].filter(Boolean).join(" • ");
}

function lookupTagsLine(result) {
  const tags = [...new Set([...(result.genres || []), ...(result.tags || [])].filter(Boolean))]
    .join(", ");
  const hours = Number(result?.lengthHours);
  const playtime = Number.isFinite(hours) && hours > 0
    ? tt("{count} hrs", { count: Number.isInteger(hours) ? String(hours) : String(Math.round(hours * 10) / 10) })
    : "";
  return [tags, playtime].filter(Boolean).join(" • ");
}

function igdbRatingBadge(result) {
  const rating = Number(result?.igdbRating);
  if (!Number.isFinite(rating) || rating <= 0) return "";
  const count = Number(result?.igdbRatingCount || 0);
  const displayRating = (Math.round(rating) / 10).toFixed(1);
  const ratingText = `${displayRating}/10`;
  const countText = count > 0 ? ` (${count.toLocaleString()} votes)` : "";
  return `<span class="lookup-igdb-rating rating-score-${igdbRatingTone(Number(displayRating))}" title="${escapeHtml(`IGDB rating: ${ratingText}${countText}`)}" aria-label="${escapeHtml(`IGDB rating: ${ratingText}${countText}`)}"><span class="lookup-igdb-rating-star" aria-hidden="true">★</span>${escapeHtml(displayRating)}</span>`;
}

function igdbRatingTone(score) {
  if (score >= 9) return "gold";
  if (score >= 7) return "high";
  if (score >= 5) return "mid";
  return "low";
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
    syncShelfEditorIcons();
    hideShelfLookupSearch();
    return;
  }
  el.fields.title.value = result.title || el.fields.title.value;
  el.fields.platform.value = platformDisplayName(bestCollectionPlatform(result.platforms || [result.platform], el.fields.platform.value));
  el.fields.publisher.value = result.publisher || "";
  el.fields.developer.value = result.developer || "";
  el.fields.genre.value = (result.genres || []).join(", ");
  const isBaseMinecraft = String(result.title || "").trim().toLocaleLowerCase() === "minecraft";
  if (result.dlc && !isBaseMinecraft) {
    el.fields.dlc.checked = true;
    el.digitalInput.checked = true;
    syncShelfDigitalEditorMode(true);
  }
  el.fields.cover.value = result.cover || "";
  syncShelfEditorCoverPreview();
  el.fields.releaseDate.value = result.releaseDate || "";
  syncShelfGamelistSectionForTarget();
  markShelfNewGameFieldsTouched([
    ...(result.title ? ["title"] : []),
    ...(bestCollectionPlatform(result.platforms || [result.platform], el.fields.platform.value) ? ["platform"] : []),
    ...(result.releaseDate ? ["release-date"] : []),
  ]);
  el.fields.igdbUrl.value = result.igdbUrl || el.fields.igdbUrl.value;
  fillStoreLinkFields(result.storeLinks);
  el.fields.hltbUrl.value = metadataHltbUrl(result) || el.fields.hltbUrl.value;
  state.pendingLengthHours = roundApproximateHours(result.lengthHours) || state.pendingLengthHours;
  el.gamelistLength.value = state.pendingLengthHours || "";
  el.gamelistReleaseText.value = result.releaseText || el.gamelistReleaseText.value;
  el.fields.description.value = result.description || "";
  if (el.addForm.dataset.digital !== "true" && !isGamelistProjectionTarget()) {
    const physical = await fetchPhysicalMetadata(result.title);
    if (physical) applyPhysicalMetadata(physical);
    renderPhysicalSelection(physical, result.title);
  } else {
    renderPhysicalSelection(null, result.title);
  }
  syncShelfEditorIcons();
  hideShelfLookupSearch();
}

function hideShelfLookupSearch() {
  el.lookupResults.hidden = true;
  el.lookupResults.replaceChildren();
  el.lookupResults.classList.remove("loaded");
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
  if (result.cover && !el.fields.cover.value) el.fields.cover.value = result.cover;
  syncShelfEditorCoverPreview();
  if (result.releaseDate && !el.fields.releaseDate.value) {
    el.fields.releaseDate.value = result.releaseDate;
    syncShelfGamelistSectionForTarget();
    markShelfNewGameFieldsTouched(["release-date"]);
  }
  if (result.description && !el.fields.description.value) el.fields.description.value = result.description;
  if (result.igdbUrl && !el.fields.igdbUrl.value) el.fields.igdbUrl.value = result.igdbUrl;
  fillStoreLinkFields(result.storeLinks);
  if (metadataHltbUrl(result) && !el.fields.hltbUrl.value) el.fields.hltbUrl.value = metadataHltbUrl(result);
  state.pendingLengthHours = roundApproximateHours(result.lengthHours) || state.pendingLengthHours;
  el.gamelistLength.value = state.pendingLengthHours || "";
}

async function prefillPhysicalResult(result) {
  el.fields.title.value = result.productName || el.fields.title.value;
  el.fields.platform.value = platformDisplayName(bestCollectionPlatform([result.consoleName], el.fields.platform.value));
  markShelfNewGameFieldsTouched([...(result.productName ? ["title"] : []), ...(el.fields.platform.value ? ["platform"] : [])]);
  applyPriceChartingRegion(result.consoleName);
  applyPriceChartingSearchResult(result);
  const physical = await fetchPhysicalMetadata(result.productName, { id: result.productId, url: result.url });
  if (physical) applyPhysicalMetadata(physical);
  syncShelfEditorIcons();
  return physical;
}

async function fetchPhysicalMetadata(title, options = {}) {
  try {
    const settings = normalizePriceSettings(state.gamelistSettings);
    const params = new URLSearchParams({ title, platform: shortPlatform(el.fields.platform.value), region: el.fields.country.value, currency: settings.currency });
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
  if (data.productName && !el.fields.title.value) {
    el.fields.title.value = data.productName;
    markShelfNewGameFieldsTouched(["title"]);
  }
  if (data.releaseDate) {
    el.fields.releaseDate.value = data.releaseDate;
    syncShelfGamelistSectionForTarget();
    markShelfNewGameFieldsTouched(["release-date"]);
  }
  if (data.upc) el.fields.upc.value = data.upc;
  if (data.sku) el.fields.sku.value = data.sku;
  if (data.asin) el.fields.asin.value = data.asin;
  if (data.epid) el.fields.epid.value = data.epid;
  if (data.productUrl || data.productId) el.fields.pricechartingId.value = data.productUrl || data.productId;
  if (data.genre && !el.fields.genre.value) el.fields.genre.value = data.genre;
  if (data.publisher && !el.fields.publisher.value) el.fields.publisher.value = data.publisher;
  if (data.developer && !el.fields.developer.value) el.fields.developer.value = data.developer;
  const estimate = estimatedPhysicalValue(data);
  if (estimate != null) el.fields.price.value = Number(estimate).toFixed(2);
  mergeWebsiteIntoSlots(data.productUrl);
}

function applyPriceChartingSearchResult(result) {
  if (result.url || result.productId) el.fields.pricechartingId.value = result.url || result.productId;
  const estimate = estimatedPhysicalValue(result);
  if (estimate != null) el.fields.price.value = Number(estimate).toFixed(2);
  mergeWebsiteIntoSlots(result.url);
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
function priceChartingProductId(value) { return priceChartingPageUrl(value) ? "" : String(value || "").trim().replace(/[^a-zA-Z0-9_-]/g, ""); }
function priceChartingSearchUrl(game) {
  const query = [game?.title, shortPlatform(game?.platform)].filter(Boolean).join(" ").trim();
  return `https://www.pricecharting.com/search-products?type=prices&region-name=all&exclude-variants=false&q=${encodeURIComponent(query || game?.title || "video game")}`;
}
function blankImage() { return "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=="; }
function applyPriceChartingRegion(consoleName) { const current = el.fields.country.value; const value = normalize(consoleName); if (value.startsWith("jp ")) el.fields.country.value = "Japan"; else if (value.startsWith("pal ") && !["United Kingdom", "Spain", "Italy", "France", "Germany", "Europe", "Australia"].includes(el.fields.country.value)) el.fields.country.value = "Europe"; else if (!value.startsWith("pal ") && !value.startsWith("jp ") && ["Japan", "Europe"].includes(el.fields.country.value)) el.fields.country.value = "United States of America"; if (el.fields.country.value !== current) markShelfNewGameFieldsTouched(["region"]); syncShelfEditorIcons(); }

async function saveEditor(event) {
  event.preventDefault();
  if (!state.canEdit) return;
  if (isGamelistProjectionTarget()) return saveGamelistTargetFromShelf();
  return saveShelfEditor();
}

function shelfGameFromEditor(existing = state.games.find((game) => game.id === state.editingId)) {
  const digitalMode = el.addForm.dataset.digital === "true";
  const manualPrice = digitalMode ? null : numberOrNull(el.fields.price.value);
  const game = {
    ...(existing || {}),
    id: existing?.id || `shelf-${crypto.randomUUID()}`,
    title: el.fields.title.value.trim(), platform: canonicalShelfPlatform(el.fields.platform.value.trim()), country: digitalMode ? "" : el.fields.country.value,
    region: digitalMode ? "" : regionFor(el.fields.country.value), ...(digitalMode ? { game: false, manual: false, box: false, other: false, sealed: false } : conditionFromInputs()),
    digital: digitalMode, dlc: digitalMode && el.fields.dlc.checked,
    stream: Boolean(el.gamelistStream.checked),
    psPlus: digitalMode && ["PS3", "PS4", "PS5"].includes(canonicalShelfPlatform(el.fields.platform.value)) && el.fields.psPlus.checked,
    gamesWithGold: digitalMode && ["X360", "XOne"].includes(canonicalShelfPlatform(el.fields.platform.value)) && el.fields.gamesWithGold.checked,
    price: manualPrice, publisher: el.fields.publisher.value.trim(), developer: el.fields.developer.value.trim(),
    genre: el.fields.genre.value.trim(), cover: rawCoverUrl(el.fields.cover.value.trim()), notes: el.fields.notes.value.trim(),
    owners: splitValues(el.fields.owners.value).map(canonicalOwner).filter(Boolean), category: existing?.category || "Game",
    releaseDate: el.fields.releaseDate.value, trophyName: el.fields.trophyName.value.trim(), websites: legacyWebsiteLinks(existing),
    createdAt: shelfCreatedAtForDate(el.fields.additionDate.value, existing),
    storeLinks: editorStoreLinks(),
    hltbUrl: el.fields.hltbUrl.value.trim(),
    igdbUrl: cleanUrl(el.fields.igdbUrl.value),
    lengthHours: roundApproximateHours(existing?.lengthHours || state.pendingLengthHours) || null,
    upc: digitalMode ? "" : el.fields.upc.value.trim(), sku: digitalMode ? "" : el.fields.sku.value.trim(), asin: digitalMode ? "" : el.fields.asin.value.trim(), epid: digitalMode ? "" : el.fields.epid.value.trim(),
    pricechartingId: digitalMode ? "" : el.fields.pricechartingId.value.trim(), description: el.fields.description.value.trim(),
    coverProject: existing?.coverProject || "",
    pendingCollection: false,
    updatedAt: new Date().toISOString(), recordType: "Owned", releaseType: existing?.releaseType || "Official",
  };
  if (!digitalMode) applyManualCollectionValue(game, el.fields.price.value, existing);
  return game;
}

async function saveShelfEditor() {
  const collectionImport = el.addForm.classList.contains("shelf-gamelist-import-mini") && state.gamelistImportGameId;
  const existing = state.games.find((game) => game.id === (collectionImport ? state.gamelistImportShelfId : state.editingId));
  const game = shelfGameFromEditor(existing);
  if (collectionImport) {
    game.id = existing?.id || `gamelist-${state.gamelistImportGameId}`;
    game.gamelistId = state.gamelistImportGameId;
  }
  if (!game.title) return false;
  if ((!existing || existing.pendingCollection) && !game.lengthHours) await fillShelfPlaytime(game);
  if (existing?.sourceRecord) state.overrides[game.id] = stripRuntimeFields(game);
  else {
    const index = state.additions.findIndex((item) => item.id === game.id);
    if (index >= 0) state.additions[index] = stripRuntimeFields(game);
    else state.additions.unshift(stripRuntimeFields(game));
  }
  const saved = await persistShelf();
  if (!saved) {
    if (embeddedGameEditor) showToast(tt("Could not add the game to Shelf."), "error");
    return false;
  }
  if (collectionImport) {
    // Once acquired for Collection only, remove the source from Radar or Wishlist.
    // Save the collection first so a failed sync cannot lose the game.
    state.gamelistImportShelfId = game.id;
    const now = new Date().toISOString();
    const nextGames = state.gamelistGames.map(item => item.id === state.gamelistImportGameId
      ? { ...item, shelfId: game.id, owners: game.owners, trophyName: game.trophyName,
        digital: game.digital, dlc: game.dlc, psPlus: game.psPlus, gamesWithGold: game.gamesWithGold,
        deletedAt: now, editedAt: now, updatedAt: now }
      : item);
    try {
      await persistGamelistData(nextGames, state.gamelistSettings);
      state.gamelistGames = nextGames;
    } catch (error) {
      showToast(error?.message || tt("Gamelist data could not be synced"), "error");
      return false;
    }
  }
  rebuildGames();
  if (!embeddedGameEditor) renderAll();
  shelfEditorDirty = false;
  if (!embeddedGameEditor) closeDialog(el.addDialog);
  return true;
}

async function saveGamelistTargetFromShelf() {
  if (!validateShelfGamelistTarget()) return false;
  const title = el.fields.title.value.trim();
  if (!title) { el.fields.title.focus(); return false; }
  const now = new Date().toISOString();
  const hasPreorder = el.gamelistPreorderCheck.checked;
  const section = hasPreorder ? "upcoming" : (el.gamelistSection.value || "wanted");
  const sectionOrders = state.gamelistGames.filter((game) => !game.deletedAt && game.section === section).map((game) => Number(game.order) || 0);
  const importShelfId = state.gamelistImportShelfId;
  const importGameId = state.gamelistImportGameId;
  const importedShelfGame = importShelfId ? state.games.find((item) => item.id === importShelfId) : null;
  const existingImportIndex = state.gamelistGames.findIndex((item) => !item.deletedAt && (
    (importGameId && item.id === importGameId)
    || (importShelfId && (item.shelfId === importShelfId || item.id === `shelf-${importShelfId}`))
  ));
  const existingImport = existingImportIndex >= 0 ? state.gamelistGames[existingImportIndex] : null;
  const shelfOnlyImport = Boolean(importedShelfGame) && !existingImport;
  const owners = splitValues(el.fields.owners.value).map(canonicalOwner).filter(Boolean);
  const platform = shortPlatform(canonicalShelfPlatform(el.fields.platform.value));
  const digital = Boolean(el.digitalInput.checked || el.fields.dlc.checked);
  const enteredLengthHours = Number(el.gamelistLength.value);
  const game = {
    ...(existingImport || {}),
    id: existingImport?.id || crypto.randomUUID(),
    ...(importShelfId ? { shelfId: importShelfId } : {}),
    igdbId: shelfOnlyImport && !existingImport ? null : existingImport?.igdbId || null,
    hltbId: shelfOnlyImport ? null : existingImport?.hltbId || null,
    igdbRating: shelfOnlyImport ? null : existingImport?.igdbRating || null,
    igdbRatingCount: shelfOnlyImport ? 0 : existingImport?.igdbRatingCount || 0,
    matchedTitle: shelfOnlyImport ? "" : existingImport?.matchedTitle || "",
    title,
    platform,
    section,
    digital,
    dlc: Boolean(el.fields.dlc.checked),
    psPlus: digital && ["PS3", "PS4", "PS5"].includes(platform) && el.fields.psPlus.checked,
    gamesWithGold: digital && ["X360", "XOne"].includes(platform) && el.fields.gamesWithGold.checked,
    releaseDate: el.fields.releaseDate.value,
    releaseText: el.gamelistReleaseText.value.trim(),
    releaseRefreshLocked: false,
    lengthHours: roundApproximateHours(shelfOnlyImport ? importedShelfGame.lengthHours : enteredLengthHours || state.pendingLengthHours) || null,
    finishHours: 0,
    ratings: { gameplay: 0, story: 0, soundtrack: 0, graphics: 0, performance: 0 },
    notes: shelfOnlyImport ? importedShelfGame.notes || "" : "",
    description: shelfOnlyImport && !existingImport ? "" : el.fields.description.value.trim(),
    statuses: shelfOnlyImport ? cleanTransferTags(importedShelfGame.tags) : splitValues(el.gamelistStatuses.value),
    emulator: shelfOnlyImport ? false : Boolean(el.gamelistEmulator.checked),
    coop: shelfOnlyImport ? false : Boolean(el.gamelistCoop.checked),
    multiplayer: shelfOnlyImport ? false : Boolean(el.gamelistMultiplayer.checked),
    stream: Boolean(el.gamelistStream.checked),
    platinum: false,
    playing: section === "backlog" && el.gamelistPlaying.checked,
    replayCount: 0,
    startedAt: section === "backlog" && el.gamelistPlaying.checked ? existingImport?.startedAt || shelfTodayInputValue() : "",
    completedAt: "",
    genres: shelfOnlyImport ? [] : el.fields.genre.value.split(",").map((value) => value.trim()).filter(Boolean),
    trophyName: el.fields.trophyName.value.trim(),
    developer: shelfOnlyImport ? "" : el.fields.developer.value.trim(),
    publisher: shelfOnlyImport ? "" : el.fields.publisher.value.trim(),
    igdbUrl: shelfOnlyImport ? "" : el.fields.igdbUrl.value.trim(),
    hltbUrl: shelfOnlyImport ? "" : el.fields.hltbUrl.value.trim(),
    trailerUrl: "",
    steamAppId: "",
    storeLinks: shelfOnlyImport ? {} : editorStoreLinks(),
    owners: owners.length ? owners : [state.gamelistSettings.defaultOwner || "User"],
    preorderStore: hasPreorder ? el.gamelistPreorderStore.value.trim() : "",
    preferredStore: shelfOnlyImport ? "" : el.gamelistPreferredStore.value.trim(),
    cover: rawCoverUrl(el.fields.cover.value.trim()),
    prices: [],
    order: Math.max(-1, ...sectionOrders) + 1,
    createdAt: existingImport?.createdAt || now,
    ...(section === "backlog" && existingImport?.section !== "backlog" ? { backlogAddedAt: now } : {}),
    editedAt: now,
    updatedAt: now,
  };
  let collectionGame = null;
  if (shelfCollectionEnabled()) {
    collectionGame = shelfGameFromEditor(importedShelfGame || undefined);
    collectionGame.id = importedShelfGame?.id || `gamelist-${game.id}`;
    collectionGame.gamelistId = game.id;
    collectionGame.pendingCollection = false;
    collectionGame.lengthHours = game.lengthHours;
    // A new collection entry starts when it is acquired, rather than when it was wishlisted.
    if (existingImport && ["upcoming", "wanted"].includes(existingImport.section) && (!importedShelfGame || importedShelfGame.pendingCollection)) {
      collectionGame.createdAt = game.backlogAddedAt || now;
    }
    game.shelfId = collectionGame.id;
  }
  delete game.preorderNewAddition;
  delete game.preorderAcceptedFromShelfAt;
  const nextGames = existingImportIndex >= 0
    ? state.gamelistGames.map((item, index) => index === existingImportIndex ? game : item)
    : [game, ...state.gamelistGames];
  try {
    await persistGamelistData(nextGames, state.gamelistSettings, collectionGame);
    state.gamelistGames = nextGames;
    state.gamelistImportShelfId = "";
    state.gamelistImportGameId = "";
    renderGamelistModules();
    renderLibrary();
    shelfEditorDirty = false;
    state.gamelistAddTarget = "shelf";
    if (unifiedShelfScope) unifiedShelfScope.changed();
    if (!embeddedGameEditor) {
      closeDialog(el.addDialog);
      showToast(tt(hasPreorder ? "Added preorder to Gamelist." : "Added to Gamelist."));
    }
    return true;
  } catch (error) {
    showToast(error?.message || tt("Gamelist data could not be synced"), "error");
    return false;
  }
}

async function resetGame(game) {
  delete state.overrides[game.id];
  await persistShelf();
  rebuildGames();
  renderAll();
  closeDialog(el.detailDialog);
  shelfEditorDirty = false;
  closeDialog(el.addDialog);
}

async function fillShelfPlaytime(game) {
  try {
    const data = await fetchGameMetadataData(game.igdbUrl || game.title);
    const titles = new Set(gameMetadataQueries(game.title).map(normalizeSearchText));
    const result = (data.results || []).find((item) => [item.title, item.matchedTitle]
      .some((title) => title && titles.has(normalizeSearchText(title))));
    const hours = Number(result?.lengthHours);
    if (Number.isFinite(hours) && hours > 0) {
      game.lengthHours = roundApproximateHours(hours);
      if (!game.hltbUrl) game.hltbUrl = metadataHltbUrl(result);
    }
  } catch {
    // A missing playtime estimate must not prevent adding the game to Shelf.
  }
}

async function addShelfGameToGamelist(game, { section = "backlog" } = {}) {
  try {
    const password = sessionStorage.getItem(`${SESSION_KEY}:password`) || "";
    const current = await fetch("/api/sync", { cache: "no-store" });
    if (!current.ok) throw new Error("Could not load Gamelist.");
    const data = await current.json();
    if (!Array.isArray(data.games)) throw new Error("Could not load Gamelist.");
    const games = data.games;
    const linkedGames = games.filter((item) => item.shelfId === game.id || item.id === `shelf-${game.id}`);
    const existingIndex = games.findIndex((item) => (item.shelfId === game.id || item.id === `shelf-${game.id}`)
      && (item.section === "new" || (section === "backlog" && item.section === "backlog"))
      && !item.playing && !item.completedAt && !item.deletedAt);
    const nextReplayCount = existingIndex >= 0 ? (games[existingIndex].replayCount || 0) : nextShelfReplayCount(linkedGames);
    const createdAt = new Date().toISOString();
    const item = {
      ...(existingIndex >= 0 ? games[existingIndex] : {}),
      id: existingIndex >= 0 ? games[existingIndex].id : nextShelfBacklogId(game.id, games),
      shelfId: game.id,
      title: game.title,
      platform: shortPlatform(game.platform),
      section,
      ...(section === "backlog" ? { acceptedFromShelfAt: createdAt, backlogAddedAt: existingIndex >= 0 && games[existingIndex].section === "backlog" ? games[existingIndex].backlogAddedAt || games[existingIndex].createdAt || createdAt : createdAt } : {}),
      digital: Boolean(game.digital || game.dlc),
      dlc: Boolean(game.dlc),
      psPlus: Boolean(game.psPlus),
      gamesWithGold: Boolean(game.gamesWithGold),
      playing: false,
      platinum: false,
      completedAt: "",
      owners: Array.isArray(game.owners) ? game.owners : [],
      statuses: [],
      tags: cleanTransferTags(game.tags),
      genres: String(game.genre || "").split(",").map((value) => value.trim()).filter(Boolean),
      publisher: game.publisher || "",
      developer: game.developer || "",
      cover: game.cover || "",
      releaseDate: game.releaseDate || "",
      description: game.description || "",
      storeLinks: game.storeLinks || {},
      lengthHours: game.lengthHours || (existingIndex >= 0 ? games[existingIndex].lengthHours : null) || null,
      hltbUrl: game.hltbUrl || game.howLongToBeatUrl || (existingIndex >= 0 ? games[existingIndex].hltbUrl : "") || "",
      trophyName: game.trophyName || (existingIndex >= 0 ? games[existingIndex].trophyName : "") || "",
      replayCount: nextReplayCount,
      deletedAt: "",
      createdAt: existingIndex >= 0 ? games[existingIndex].createdAt : createdAt,
      updatedAt: createdAt,
      order: existingIndex >= 0 && games[existingIndex].section === section ? games[existingIndex].order
        : Math.max(-1, ...games.filter((item) => item.section === section && !item.deletedAt).map((item) => Number(item.order) || 0)) + 1,
    };
    const nextGames = existingIndex >= 0 ? games.map((entry, index) => index === existingIndex ? item : entry) : [item, ...games];
    const response = await fetch("/api/sync", { method: "PUT", headers: { "Content-Type": "application/json", "x-edit-password": password }, body: JSON.stringify({ games: nextGames, settings: data.settings || state.gamelistSettings }) });
    if (!response.ok) throw new Error("Could not add this game to Gamelist.");
    state.gamelistGames = nextGames;
    renderGamelistModules();
    showToast(section === "backlog" ? "Added to Gamelist Backlog." : "Added to Gamelist New additions.");
    return true;
  } catch {
    showToast("Could not add this game to Gamelist.", "error");
    return false;
  }
}

async function acceptSyncedPreorder(game) {
  const now = new Date().toISOString();
  const nextGames = state.gamelistGames.map((item) => item.id === game.id ? {
    ...item,
    section: "new",
    preorderStore: "",
    prices: [],
    playing: false,
    preorderAcceptedFromShelfAt: now,
    preorderNewAddition: true,
    editedAt: now,
    updatedAt: now,
  } : item);
  try {
    await persistGamelistData(nextGames, state.gamelistSettings);
    state.gamelistGames = nextGames;
    renderGamelistModules();
    renderLibrary();
    showToast("Moved to Gamelist backlog and new additions.");
  } catch (error) {
    showToast(error?.message || "Could not sync this preorder.", "error");
  }
}

async function addSyncedWishlistToBacklog(game) {
  const now = new Date().toISOString();
  const nextGames = state.gamelistGames.map((item) => item.id === game.id ? {
    ...item,
    section: "backlog",
    backlogAddedAt: now,
    prices: [],
    playing: false,
    editedAt: now,
    updatedAt: now,
  } : item);
  try {
    await persistGamelistData(nextGames, state.gamelistSettings);
    state.gamelistGames = nextGames;
    renderGamelistModules();
    renderLibrary();
    showToast("Moved to Gamelist backlog.");
  } catch (error) {
    showToast(error?.message || "Could not move this game to backlog.", "error");
  }
}

async function deleteSyncedPreorder(game) {
  if (!await confirmGameDelete(game?.title)) return;
  const now = new Date().toISOString();
  const nextGames = state.gamelistGames.map((item) => item.id === game.id ? { ...item, deletedAt: now, editedAt: now, updatedAt: now } : item);
  try {
    await persistGamelistData(nextGames, state.gamelistSettings);
    state.gamelistGames = nextGames;
    renderGamelistModules();
    renderLibrary();
    closeDialog(el.detailDialog);
    showToast("Deleted from Gamelist.");
  } catch (error) {
    showToast(error?.message || "Could not delete this preorder.", "error");
  }
}

function nextShelfBacklogId(shelfId, games) {
  const base = `shelf-${shelfId}`;
  if (!games.some((game) => game.id === base)) return base;
  let index = 2;
  while (games.some((game) => game.id === `${base}-replay-${index}`)) index += 1;
  return `${base}-replay-${index}`;
}

function nextShelfReplayCount(games) {
  if (!games.length) return 0;
  return Math.max(0, ...games.map((game) => Number(game.replayCount) || 0)) + 1;
}

async function deleteGame(game) {
  if (!await confirmGameDelete(game?.title)) return false;
  if (game.sourceRecord) state.overrides[game.id] = { ...(state.overrides[game.id] || {}), deletedAt: new Date().toISOString() };
  else state.additions = state.additions.filter((item) => item.id !== game.id);
  await persistShelf();
  rebuildGames();
  renderAll();
  closeDialog(el.detailDialog);
  shelfEditorDirty = false;
  closeDialog(el.addDialog);
  return true;
}

async function persistShelf(options = {}) {
  const payload = { sourceGames: state.sourceGames.map(stripRuntimeFields), games: state.additions.map(stripRuntimeFields), overrides: state.overrides, layout: state.layout, favoriteGameIds: normalizeFavoriteGameIds(state.favoriteGameIds) };
  trySetLocalStorageItem(LOCAL_DRAFT_KEY, JSON.stringify(payload));
  try {
    const password = sessionStorage.getItem(`${SESSION_KEY}:password`) || "";
    const response = await fetch("/api/shelf", { method: "PUT", headers: { "Content-Type": "application/json", "x-edit-password": password }, body: JSON.stringify(payload) });
    if (!response.ok) throw new Error("Save failed");
    const data = await response.json();
    if (options.verifyFavorites) {
      const expected = normalizeFavoriteGameIds(options.verifyFavorites);
      const savedIds = Array.isArray(data.favoriteGameIds)
        ? data.favoriteGameIds.map((id) => String(id || "").trim()).filter(Boolean)
        : [];
      if (JSON.stringify(savedIds) !== JSON.stringify(expected)) throw new Error("Showcase save verification failed");
    }
    state.updatedAt = data.updatedAt || new Date().toISOString();
    removeLocalStorageItem(LOCAL_DRAFT_KEY);
    unifiedShelfScope?.changed();
    return true;
  } catch {
    state.updatedAt = new Date().toISOString();
    return false;
  }
}

async function toggleEditMode() {
  if (!state.canEdit) return openAuth();
  setSettingsAuthLoading(true);
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
  setSettingsAuthLoading(true);
  const response = await fetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: el.authPassword.value }) }).catch(() => null);
  const data = await response?.json().catch(() => ({}));
  if (!data?.ok) { el.authError.hidden = false; setSettingsAuthLoading(false); return; }
  state.canEdit = true;
  sessionStorage.setItem(SESSION_KEY, "true");
  sessionStorage.setItem(`${SESSION_KEY}:password`, el.authPassword.value);
  signalAuthChange();
  closeDialog(el.authDialog);
  renderAll();
  maybeShowUpdatesPopup();
}

async function refreshSharedAuth() {
  setSettingsAuthLoading(true);
  const active = await fetchEditorAuth(state.canEdit);
  if (active === state.canEdit) {
    setSettingsAuthLoading(false);
    return;
  }
  state.canEdit = active;
  if (active) sessionStorage.setItem(SESSION_KEY, "true");
  else sessionStorage.removeItem(SESSION_KEY);
  renderAll();
  if (active) maybeShowUpdatesPopup();
}

function setSettingsAuthLoading(loading) {
  document.body.classList.toggle("auth-checking", loading);
  [el.layoutButton, el.mobileDockSettings].forEach((button) => {
    if (!button) return;
    button.disabled = loading;
    if (loading) button.setAttribute("aria-busy", "true");
    else button.removeAttribute("aria-busy");
  });
}

function signalAuthChange() { localStorage.setItem("gamelist-editor-signal", String(Date.now())); }

async function fetchEditorAuth(fallback = false) {
  try {
    const response = await fetch("/api/auth", { cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    return Boolean(data.ok);
  } catch {
    return fallback;
  }
}

function openLayout() {
  // Collection settings use the main page's account handlers and save lifecycle.
  unifiedShelfScope?.openSettings();
}

function normalizeWeekStart(value) {
  return WEEK_START_OPTIONS.some(([key]) => key === value) ? value : "monday";
}

const CSV_NUMERIC_FIELDS = new Set(["order", "lengthHours", "replayCount", "numericPrice", "price", "estimatedValue", "purchasePrice"]);

function exportGamelistCsv() {
  downloadCsv(state.gamelistGames, `gamelist-games-${dateStamp()}.csv`);
  showToast(`Exported ${state.gamelistGames.length} Gamelist games.`);
}

async function importGamelistCsv() {
  const file = await pickCsvFile();
  if (!file) return;
  try {
    const rows = csvToObjects(await file.text());
    if (!rows.length) {
      showToast("No Gamelist games found in that CSV.", "error");
      return;
    }
    if (!window.confirm(`Import ${rows.length} games from CSV? This replaces the current Gamelist games.`)) return;
    const now = new Date().toISOString();
    const nextGames = rows.map((row, index) => ({ ...row, id: row.id || csvImportedId("gamelist", index), pendingCollection: false, updatedAt: row.updatedAt || now }));
    await persistGamelistData(nextGames, state.gamelistSettings);
    state.gamelistGames = nextGames;
    renderGamelistModules();
    showToast(`Imported ${state.gamelistGames.length} Gamelist games.`);
  } catch (error) {
    showToast(error?.message || "Gamelist games CSV import failed.", "error");
  }
}

function exportShelfPhysicalCsv() {
  const records = state.games.filter((game) => !isDigitalShelfGame(game)).map(shelfCsvRecord);
  downloadCsv(records, `shelf-physical-games-${dateStamp()}.csv`);
  showToast(`Exported ${records.length} shelf physical games.`);
}

async function importShelfPhysicalCsv() {
  const file = await pickCsvFile();
  if (!file) return;
  try {
    const rows = csvToObjects(await file.text());
    if (!rows.length) {
      showToast("No shelf games found in that CSV.", "error");
      return;
    }
    if (!window.confirm(`Import ${rows.length} physical games from CSV? This replaces only the current Shelf physical games.`)) return;
    const now = new Date().toISOString();
    const digitalGames = state.games.filter(isDigitalShelfGame).map((game) => stripRuntimeFields(game));
    state.sourceGames = [];
    state.additions = [...digitalGames];
    state.overrides = {};
    rows.forEach((row, index) => {
      const game = normalizeShelfCsvGame(stripRuntimeFields({ ...row, id: row.id || csvImportedId("shelf", index), pendingCollection: false, updatedAt: row.updatedAt || now }));
      if (row.sourceRecord === true) state.sourceGames.push(game);
      else state.additions.push(game);
    });
    await persistShelf();
    rebuildGames();
    renderAll();
    showToast(`Imported ${rows.length} shelf physical games.`);
  } catch (error) {
    showToast(error?.message || "Shelf physical games CSV import failed.", "error");
  }
}

function exportShelfDigitalCsv() {
  const records = state.games.filter(isDigitalShelfGame).map(shelfCsvRecord);
  downloadCsv(records, `shelf-digital-games-${dateStamp()}.csv`);
  showToast(`Exported ${records.length} shelf digital games.`);
}

async function importShelfDigitalCsv() {
  const file = await pickCsvFile();
  if (!file) return;
  try {
    const rows = csvToObjects(await file.text());
    if (!rows.length) { showToast("No shelf digital games found in that CSV.", "error"); return; }
    if (!window.confirm(`Import ${rows.length} digital games from CSV? This replaces only the current Shelf digital games.`)) return;
    const now = new Date().toISOString();
    const physicalGames = state.games.filter((game) => !isDigitalShelfGame(game)).map((game) => stripRuntimeFields(game));
    state.sourceGames = [];
    state.overrides = {};
    state.additions = [...physicalGames, ...rows.map((row, index) => normalizeShelfCsvGame(stripRuntimeFields({ ...row, id: row.id || csvImportedId("shelf-digital", index), digital: true, pendingCollection: false, updatedAt: row.updatedAt || now })))];
    await persistShelf();
    rebuildGames();
    renderAll();
    showToast(`Imported ${rows.length} shelf digital games.`);
  } catch (error) {
    showToast(error?.message || "Shelf digital games CSV import failed.", "error");
  }
}

function finishedGamesCsvRecords() {
  return state.gamelistGames
    .filter((game) => !game.deletedAt && game.completedAt)
    .sort((a, b) => String(b.completedAt).localeCompare(String(a.completedAt)) || stringCompare(a.title, b.title))
    .map((game) => ({
      year: completionYear(game),
      id: game.id,
      title: game.title,
      platform: game.platform,
      owners: game.owners || [],
      tags: game.tags || [],
      startedAt: dateOnly(game.startedAt),
      completedAt: dateOnly(game.completedAt),
      lengthHours: game.lengthHours || "",
      replayCount: game.replayCount || "",
      stream: Boolean(game.stream),
      coop: Boolean(game.coop),
      multiplayer: Boolean(game.multiplayer || game.coop),
      platinum: Boolean(game.platinum),
      digital: Boolean(game.digital),
      emulator: Boolean(game.emulator),
    }));
}

function exportFinishedGamesCsv() {
  const records = finishedGamesCsvRecords();
  downloadCsv(records, `gamelist-finished-games-${dateStamp()}.csv`);
  showToast(`Exported ${records.length} finished game rows.`);
}

async function importFinishedGamesCsv() {
  const file = await pickCsvFile();
  if (!file) return;
  try {
    const rows = csvToObjects(await file.text());
    if (!rows.length) {
      showToast("No finished games found in that CSV.", "error");
      return;
    }
    if (!window.confirm(`Import ${rows.length} finished game rows? This updates matching games by id, or by title/platform.`)) return;
    const now = new Date().toISOString();
    const nextGames = [...state.gamelistGames];
    let changed = 0;
    rows.forEach((row) => {
      const game = gamelistGameByCsvRow(row, nextGames);
      if (!game) return;
      ["startedAt", "completedAt", "lengthHours", "replayCount", "owners", "tags", "stream", "coop", "multiplayer", "platinum", "digital", "emulator"].forEach((key) => {
        if (row[key] !== undefined && row[key] !== "") game[key] = row[key];
      });
      game.updatedAt = now;
      game.editedAt = now;
      changed += 1;
    });
    if (!changed) {
      showToast("No matching games found for that Finished games CSV.", "error");
      return;
    }
    await persistGamelistData(nextGames, state.gamelistSettings);
    state.gamelistGames = nextGames;
    renderGamelistModules();
    showToast(`Imported finished data for ${changed} games.`);
  } catch (error) {
    showToast(error?.message || "Finished games CSV import failed.", "error");
  }
}

function gameOfTheYearCsvRecords() {
  return Object.entries(state.gamelistSettings.gameOfTheYear || {})
    .sort(([a], [b]) => b.localeCompare(a))
    .flatMap(([year, entry]) => {
      const picks = entry?.picks || {};
      return GAME_OF_YEAR_CATEGORIES.map(([category, label], index) => {
        const game = gamelistGameById(picks[category]);
        return {
          year,
          category,
          label: tt(label),
          order: index + 1,
          gameId: picks[category] || "",
          title: game?.title || "",
          platform: game?.platform || "",
          published: Boolean(entry?.published),
          updatedAt: entry?.updatedAt || "",
        };
      });
    });
}

function exportGameOfTheYearCsv() {
  const records = gameOfTheYearCsvRecords();
  downloadCsv(records, `gamelist-goty-${dateStamp()}.csv`);
  showToast(tt("Exported {count} GOTY rows.", { count: records.length }));
}

async function importGameOfTheYearCsv() {
  const file = await pickCsvFile();
  if (!file) return;
  try {
    const rows = csvToObjects(await file.text());
    if (!rows.length) {
      showToast(tt("No GOTY picks found in that CSV."), "error");
      return;
    }
    if (!window.confirm(tt("Import GOTY picks from {count} CSV rows? This replaces all saved Games of the year picks.", { count: rows.length }))) return;
    const imported = {};
    rows.forEach((row) => {
      const year = String(row.year || "").match(/\b(19|20)\d{2}\b/)?.[0];
      const category = String(row.category || "").trim();
      if (!year || !GAME_OF_YEAR_CATEGORIES.some(([key]) => key === category)) return;
      const game = gamelistGameByCsvRow({ id: row.gameId, title: row.title, platform: row.platform });
      imported[year] ||= { picks: {}, updatedAt: String(row.updatedAt || "") };
      imported[year].picks[category] = game?.id || String(row.gameId || "");
    });
    const years = Object.keys(imported);
    if (!years.length) {
      showToast(tt("No valid GOTY rows found in that CSV."), "error");
      return;
    }
    const now = new Date().toISOString();
    const nextGameOfTheYear = {};
    years.forEach((year) => {
      const picks = Object.fromEntries(GAME_OF_YEAR_CATEGORIES.map(([key]) => [key, imported[year].picks[key] || ""]));
      nextGameOfTheYear[year] = {
        picks,
        published: gameOfTheYearComplete(picks),
        updatedAt: imported[year].updatedAt || now,
      };
    });
    state.gamelistSettings = { ...state.gamelistSettings, gameOfTheYear: nextGameOfTheYear };
    localStorage.setItem("gamelist:settings:v1", JSON.stringify(state.gamelistSettings));
    await persistGamelistData(state.gamelistGames, state.gamelistSettings);
    renderGamelistModules();
    showToast(tt("Imported GOTY picks for {count} years.", { count: years.length }));
  } catch (error) {
    showToast(error?.message || tt("GOTY CSV import failed."), "error");
  }
}

async function persistGamelistData(games, settings, collectionGame = null) {
  const password = sessionStorage.getItem(`${SESSION_KEY}:password`) || "";
  const data = await fetch("/api/sync", { cache: "no-store" }).then((response) => response.ok ? response.json() : { games: [], settings: state.gamelistSettings }).catch(() => ({ games: [], settings: state.gamelistSettings }));
  const response = await fetch("/api/sync", {
    method: "PUT",
    headers: { "Content-Type": "application/json", "x-edit-password": password },
    body: JSON.stringify({ games, settings: settings || data.settings || state.gamelistSettings, ...(collectionGame ? { collectionGame } : {}) }),
  });
  if (!response.ok) throw new Error("Gamelist data could not be synced");
}

function gamelistGameById(id) {
  return state.gamelistGames.find((game) => game.id === id && !game.deletedAt) || null;
}

function gamelistGameByCsvRow(row, games = state.gamelistGames) {
  const id = String(row.id || "").trim();
  if (id) {
    const byId = games.find((game) => game.id === id && !game.deletedAt);
    if (byId) return byId;
  }
  const title = normalizeTag(row.title);
  const platform = normalizeTag(row.platform);
  if (!title) return null;
  return games.find((game) => !game.deletedAt && normalizeTag(game.title) === title && (!platform || normalizeTag(game.platform) === platform)) || null;
}

function gameOfTheYearComplete(picks = {}) {
  return GAME_OF_YEAR_CATEGORIES.every(([key]) => Boolean(picks[key]));
}

function completionYear(game) {
  const value = String(game.completedAt || game.finishedAt || "");
  return value.match(/\b(19|20)\d{2}\b/)?.[0] || "";
}

function dateOnly(value) {
  return String(value || "").slice(0, 10);
}

function finishHoursValue(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return 0;
  const count = Number(raw);
  return Number.isFinite(count) ? Math.max(0, Math.round(count)) : 0;
}

function finishHoursText(game) {
  const hours = finishHoursValue(game?.finishHours);
  if (!hours) return "";
  return `${hours} ${hours === 1 ? "hr" : "hrs"}`;
}

function finishedProjectionDateText(game) {
  return [finishHoursText(game), formatLongDate(game.completedAt)].filter(Boolean).join(" · ");
}

function normalizeTag(value) {
  return String(value || "").trim().toLowerCase();
}

function stringCompare(a = "", b = "") {
  return String(a || "").localeCompare(String(b || ""), undefined, { numeric: true, sensitivity: "base" });
}

function downloadCsv(records, filename) {
  const csv = recordsToCsv(records);
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function recordsToCsv(records) {
  const rows = Array.isArray(records) ? records : [];
  const columns = [...rows.reduce((keys, record) => {
    Object.keys(record || {}).forEach((key) => keys.add(key));
    return keys;
  }, new Set(["id", "title", "platform", "sourceRecord"]))];
  return [
    columns.map(csvCell).join(","),
    ...rows.map((record) => columns.map((key) => csvCell(record?.[key])).join(",")),
  ].join("\n");
}

function csvCell(value) {
  if (value == null) return "";
  const text = typeof value === "object" ? JSON.stringify(value) : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function csvToObjects(text) {
  const rows = parseCsvRows(text);
  if (!rows.length) return [];
  const headers = rows.shift().map((header) => String(header || "").trim()).filter(Boolean);
  if (!headers.length) return [];
  return rows
    .filter((row) => row.some((cell) => String(cell || "").trim()))
    .map((row) => Object.fromEntries(headers.map((header, index) => [header, parseCsvValue(header, row[index] ?? "")])));
}

function parseCsvRows(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  const source = String(text || "").replace(/^\uFEFF/, "");
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (quoted) {
      if (char === '"' && source[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && source[index + 1] === "\n") index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += char;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

function parseCsvValue(key, value) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  if ((text.startsWith("[") && text.endsWith("]")) || (text.startsWith("{") && text.endsWith("}"))) {
    try { return JSON.parse(text); } catch {}
  }
  if (text.toLowerCase() === "true") return true;
  if (text.toLowerCase() === "false") return false;
  if (CSV_NUMERIC_FIELDS.has(key) && /^-?\d+(\.\d+)?$/.test(text)) return Number(text);
  return value;
}

function normalizeShelfCsvGame(game) {
  const next = { ...game };
  const hasConditionColumns = ["game", "manual", "box", "other", "sealed"].some((key) => Object.prototype.hasOwnProperty.call(next, key));
  if (hasConditionColumns) {
    next.game = csvBoolean(next.game, true);
    next.manual = csvBoolean(next.manual, false);
    next.box = csvBoolean(next.box, false);
    next.other = csvBoolean(next.other, false);
    next.sealed = csvBoolean(next.sealed, false);
  } else {
    next.game = conditionValue(next, "game");
    next.manual = conditionValue(next, "manual");
    next.box = conditionValue(next, "box");
    next.other = conditionValue(next, "other");
    next.sealed = conditionValue(next, "sealed");
  }
  delete next.ownership;
  return next;
}

function shelfCsvRecord(game) {
  const next = { ...game };
  next.game = conditionValue(next, "game");
  next.manual = conditionValue(next, "manual");
  next.box = conditionValue(next, "box");
  next.other = conditionValue(next, "other");
  next.sealed = conditionValue(next, "sealed");
  delete next.ownership;
  return next;
}

function csvBoolean(value, fallback = false) {
  if (typeof value === "boolean") return value;
  const text = String(value ?? "").trim().toLowerCase();
  if (!text) return fallback;
  if (["true", "1", "yes", "y", "on", "x", "checked"].includes(text)) return true;
  if (["false", "0", "no", "n", "off", "unchecked"].includes(text)) return false;
  return fallback;
}

function pickCsvFile() {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".csv,text/csv";
    input.addEventListener("change", () => resolve(input.files?.[0] || null), { once: true });
    input.click();
  });
}

function dateStamp() {
  return new Date().toISOString().slice(0, 10);
}

function csvImportedId(prefix, index) {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${prefix}-csv-${Date.now()}-${index + 1}`;
}

function openShowcaseEditor() {
  if (!state.canEdit) return openAuth();
  state.showcaseDraftIds = normalizeFavoriteGameIds(state.favoriteGameIds);
  state.showcaseFilters = { query: "", platform: "all", region: "all", category: "all", direction: "asc" };
  el.showcaseSearch.value = "";
  renderShowcaseFilters();
  renderShowcasePicker();
  openDialog(el.showcaseDialog);
  requestAnimationFrame(() => el.showcaseSearch.focus());
}

function renderShowcaseFilters() {
  const games = ownedShelfGames();
  const platforms = orderedPlatforms(uniqueSorted(games.map((game) => game.platform)));
  const countries = uniqueSorted(games.map((game) => game.country));
  const categories = uniqueSorted(games.flatMap((game) => [...String(game.genre || "").split(","), ...(game.genres || [])].map((value) => value.trim()).filter(Boolean)));
  el.showcasePlatform.innerHTML = `<option value="all">${escapeHtml(tt("All platforms"))}</option>${platforms.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(platformDisplayName(value))}</option>`).join("")}`;
  el.showcaseRegion.innerHTML = `<option value="all">All regions</option>${countries.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(regionName(value))}</option>`).join("")}`;
  el.showcaseCategory.innerHTML = `<option value="all">${escapeHtml(tt("All categories"))}</option>${categories.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(tt(value))}</option>`).join("")}`;
  el.showcasePlatform.value = state.showcaseFilters.platform;
  el.showcaseRegion.value = state.showcaseFilters.region;
  el.showcaseCategory.value = state.showcaseFilters.category;
  syncStyledSelect(el.showcasePlatform, { logos: true, activeValue: "all" });
  syncStyledSelect(el.showcaseRegion, { flags: true, activeValue: "all" });
  syncStyledSelect(el.showcaseCategory, { activeValue: "all" });
  [el.showcasePlatform, el.showcaseRegion, el.showcaseCategory].forEach(updateSelectOverflowTitle);
}

function renderShowcasePicker() {
  const selected = new Set(state.showcaseDraftIds);
  const games = filteredShowcaseGames();
  el.showcaseSelected.innerHTML = Array.from({ length: 5 }, (_, index) => {
    const game = ownedShelfGames().find((item) => item.id === state.showcaseDraftIds[index]);
    if (!game) return `<div class="showcase-selected-slot is-empty" data-empty-slot="${index}" aria-label="Empty showcase slot ${index + 1}"></div>`;
    const cover = coverUrl(game.cover || "") || platformFallback(game.platform);
    return `<article class="showcase-selected-slot" data-showcase-slot="${escapeHtml(game.id)}"><img src="${escapeHtml(cover)}" alt=""><span>${escapeHtml(game.title)}</span><div class="showcase-slot-actions"><button class="direction-toggle showcase-move-action" type="button" data-move-showcase="${escapeHtml(game.id)}" data-direction="-1" ${index === 0 ? "disabled" : ""} title="Move left" aria-label="Move ${escapeHtml(game.title)} left">${carouselArrowIcon("left")}</button><button class="direction-toggle showcase-move-action" type="button" data-move-showcase="${escapeHtml(game.id)}" data-direction="1" ${index === state.showcaseDraftIds.length - 1 ? "disabled" : ""} title="Move right" aria-label="Move ${escapeHtml(game.title)} right">${carouselArrowIcon("right")}</button><button class="danger-button icon-only-button" type="button" data-remove-showcase="${escapeHtml(game.id)}" title="Remove" aria-label="Remove ${escapeHtml(game.title)}">${trashIcon()}</button></div></article>`;
  }).join("");
  el.showcaseList.innerHTML = games.map((game) => showcasePickerCard(game, selected.has(game.id))).join("");
  el.showcaseCount.textContent = `${state.showcaseDraftIds.length}/5 selected · ${games.length} ${games.length === 1 ? "game" : "games"}`;
  syncShowcaseDirectionButton();
  el.showcaseSelected.querySelectorAll("img").forEach(bindCoverFrame);
  el.showcaseList.querySelectorAll("img").forEach(bindCoverFrame);
  requestAnimationFrame(updateShowcaseScrollFades);
}

function filteredShowcaseGames() {
  const filters = state.showcaseFilters;
  return ownedShelfGames().filter((game) => {
    const haystack = normalizeSearchText(`${game.title} ${game.platform} ${game.publisher} ${game.developer} ${game.genre} ${game.notes} ${(game.tags || []).join(" ")} ${(game.owners || []).join(" ")}`);
    return (filters.platform === "all" || game.platform === filters.platform)
      && (filters.region === "all" || game.country === filters.region)
      && (filters.category === "all" || [...String(game.genre || "").split(","), ...(game.genres || [])].map((value) => value.trim()).includes(filters.category))
      && (!filters.query || haystack.includes(filters.query));
  }).sort((a, b) => {
    const direction = filters.direction === "desc" ? -1 : 1;
    return direction * a.title.localeCompare(b.title);
  });
}

function showcasePickerCard(game, selected) {
  const cover = coverUrl(game.cover || "") || platformFallback(game.platform);
  const check = selected ? `<span class="showcase-picker-check" aria-hidden="true">${checkIcon()}</span>` : "";
  return `<button class="showcase-picker-card ${selected ? "is-selected" : ""}" type="button" data-showcase-id="${escapeHtml(game.id)}" title="${escapeHtml(game.title)}"><span class="showcase-picker-cover"><img src="${escapeHtml(cover)}" alt=""></span><span class="showcase-picker-title"><strong>${showcaseTitleMarkup(game.title)}</strong>${platformBadge(game.platform, { title: game.title })}</span>${check}</button>`;
}

function showcaseHoverInfo(game, className) {
  const tags = showcaseGameTags(game);
  const studio = [
    game.developer || "",
    game.publisher || "",
  ].filter(Boolean);
  return `<span class="${className} showcase-hover-info"><strong>${showcaseTitleMarkup(game.title)}</strong>${studio.length ? `<small>${escapeHtml(studio.join(" · "))}</small>` : ""}<span class="showcase-hover-meta"><span class="showcase-hover-main-pills">${platformBadge(game.platform, { title: game.title })}${shelfProgressPill(game)}</span>${tags.map((tag) => `<span class="chip genre">${escapeHtml(tag)}</span>`).join("")}</span></span>`;
}

function showcaseTitleMarkup(title) {
  return escapeHtml(title).replace(/\s+(\([^)]*\)|\[[^\]]*\])/g, "<br>$1");
}

function showcaseGameTags(game) {
  return visibleShelfTags(game, [...(game.tags || []), game.category && game.category !== "Game" ? game.category : "", ...String(game.genre || "").split(",")]).slice(0, 4);
}

function visibleShelfTags(game, values = []) {
  const importedFromGamelist = game?.source === "gamelist" || Boolean(game?.gamelistId) || String(game?.id || "").startsWith("gamelist-");
  return values
    .map((value) => String(value || "").trim())
    .filter((value, index, list) => value && normalize(value) !== "game" && !(importedFromGamelist && normalize(value) === "gamelist") && list.indexOf(value) === index)
    .map((value) => tt(value));
}

function syncShowcaseDirectionButton() {
  const desc = state.showcaseFilters.direction === "desc";
  el.showcaseDirection.innerHTML = sortArrowIcon(desc);
  el.showcaseDirection.classList.toggle("desc", desc);
  el.showcaseDirection.title = `Sort ${desc ? "descending" : "ascending"}`;
  el.showcaseDirection.setAttribute("aria-label", el.showcaseDirection.title);
}

function updateShowcaseScrollFades() {
  const list = el.showcaseList;
  if (!list) return;
  const hasOverflow = list.scrollHeight > list.clientHeight + 2;
  list.classList.toggle("has-more-above", hasOverflow && list.scrollTop > 2);
  list.classList.toggle("has-more-below", hasOverflow && list.scrollTop + list.clientHeight < list.scrollHeight - 2);
}

function handleShowcasePick(event) {
  const card = event.target.closest("[data-showcase-id]");
  if (!card) return;
  const id = card.dataset.showcaseId;
  if (state.showcaseDraftIds.includes(id)) state.showcaseDraftIds = state.showcaseDraftIds.filter((item) => item !== id);
  else if (state.showcaseDraftIds.length < 5) state.showcaseDraftIds = [...state.showcaseDraftIds, id];
  renderShowcasePicker();
}

function handleShowcaseSelectedClick(event) {
  const move = event.target.closest("[data-move-showcase]");
  if (move) {
    const from = state.showcaseDraftIds.indexOf(move.dataset.moveShowcase);
    const to = from + Number(move.dataset.direction);
    if (from >= 0 && to >= 0 && to < state.showcaseDraftIds.length) {
      [state.showcaseDraftIds[from], state.showcaseDraftIds[to]] = [state.showcaseDraftIds[to], state.showcaseDraftIds[from]];
      renderShowcasePicker();
    }
    return;
  }
  const remove = event.target.closest("[data-remove-showcase]");
  if (!remove) return;
  state.showcaseDraftIds = state.showcaseDraftIds.filter((id) => id !== remove.dataset.removeShowcase);
  renderShowcasePicker();
}

async function saveShowcase(event) {
  event.preventDefault();
  state.favoriteGameIds = normalizeFavoriteGameIds(state.showcaseDraftIds);
  const saved = await persistShowcaseFavorites(state.favoriteGameIds);
  if (!saved) {
    showToast("Showcase could not be saved. Please try again.", "error");
    return;
  }
  renderChrome();
  renderFavorites();
  unifiedShelfScope?.changed();
  closeDialog(el.showcaseDialog);
}

async function persistShowcaseFavorites(ids) {
  const favoriteGameIds = normalizeFavoriteGameIds(ids);
  state.gamelistSettings = { ...state.gamelistSettings, shelfShowcaseFavoriteGameIds: favoriteGameIds };
  localStorage.setItem("gamelist:settings:v1", JSON.stringify(state.gamelistSettings));
  const password = sessionStorage.getItem(`${SESSION_KEY}:password`) || "";
  let shelfSaved = false;
  let settingsSaved = false;
  try {
    const response = await fetch("/api/shelf", {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-edit-password": password },
      body: JSON.stringify({ favoriteGameIdsOnly: true, favoriteGameIds }),
    });
    if (!response.ok) throw new Error("Showcase save failed");
    const saved = await response.json();
    const savedIds = Array.isArray(saved.favoriteGameIds) ? saved.favoriteGameIds.map((id) => String(id || "").trim()).filter(Boolean) : [];
    if (JSON.stringify(savedIds) !== JSON.stringify(favoriteGameIds)) throw new Error("Showcase save mismatch");
    shelfSaved = true;
    state.updatedAt = saved.updatedAt || new Date().toISOString();
  } catch (error) {
    console.warn("Shelf showcase save failed", error);
  }
  try {
    const response = await fetch("/api/sync", {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-edit-password": password },
      body: JSON.stringify({ settingsOnly: true, settings: state.gamelistSettings }),
    });
    if (!response.ok) throw new Error("Showcase settings save failed");
    settingsSaved = true;
  } catch (error) {
    console.warn("Showcase settings fallback save failed", error);
  }
  try {
    const fresh = await fetch("/api/shelf", { cache: "no-store" }).then((result) => result.ok ? result.json() : null);
    const freshIds = Array.isArray(fresh?.favoriteGameIds) ? fresh.favoriteGameIds.map((id) => String(id || "").trim()).filter(Boolean) : [];
    if (JSON.stringify(freshIds) === JSON.stringify(favoriteGameIds)) shelfSaved = true;
  } catch (error) {
    console.warn("Showcase shelf readback failed", error);
  }
  try {
    const fresh = await fetch("/api/sync", { cache: "no-store" }).then((result) => result.ok ? result.json() : null);
    const freshIds = Array.isArray(fresh?.settings?.shelfShowcaseFavoriteGameIds) ? fresh.settings.shelfShowcaseFavoriteGameIds.map((id) => String(id || "").trim()).filter(Boolean) : [];
    if (JSON.stringify(freshIds) === JSON.stringify(favoriteGameIds)) settingsSaved = true;
  } catch (error) {
    console.warn("Showcase settings readback failed", error);
  }
  if (shelfSaved || settingsSaved) {
    removeLocalStorageItem(LOCAL_DRAFT_KEY);
    unifiedShelfScope?.changed();
    return true;
  }
  return false;
}

function normalizePriceSettings(settings = {}) {
  const selectedStores = Array.isArray(settings.stores) ? settings.stores.filter((store) => STORE_OPTIONS.includes(store)) : DEFAULT_PRICE_STORES;
  const stores = selectedStores;
  return {
    currency: CURRENCY_OPTIONS.includes(settings.currency) ? settings.currency : "EUR",
    region: REGION_OPTIONS.includes(settings.region) ? settings.region : "ES",
    stores: stores.slice(0, MAX_PRICE_STORES),
  };
}

function defaultShelfCountry() {
  return ({ ES: "Spain", IT: "Italy", IE: "Ireland", FR: "France", PT: "Portugal", JP: "Japan", MX: "Mexico", US: "United States of America", UK: "United Kingdom" })[normalizePriceSettings(state.gamelistSettings).region] || "Spain";
}

function defaultShelfOwners() {
  const owner = String(state.gamelistSettings.defaultOwner || "").trim();
  return owner ? [owner] : [];
}

function shelfPricesVisible() {
  return state.gamelistSettings.shelfHidePrices !== true;
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
  saveSharedViewMode(state.viewMode);
  if (unifiedShelfScope) { unifiedShelfScope.viewChanged(state.viewMode); return; }
  renderChrome();
  renderLibrary();
}

function clearFilters() {
  if (unifiedShelfScope) return unifiedShelfScope.clearFilters();
  const tab = unifiedShelfScope ? state.filters.tab : "all";
  state.filters = { query: "", platform: "all", region: "all", condition: "all", category: "all", tab, sort: state.filters.sort, direction: state.filters.direction };
  el.search.value = "";
  el.condition.value = "all";
  el.category.value = "all";
  renderFilters();
  renderFilteredShelf();
}

function openDialog(dialog) { dialog.showModal(); document.body.classList.add("dialog-open"); }
function closeDialog(dialog) { if (dialog.open) dialog.close(); document.body.classList.toggle("dialog-open", document.querySelector("dialog[open]") !== null); }

function populateEditorOptions() {
  el.platformOptions.innerHTML = PLATFORM_OPTIONS.map((platform) => `<option value="${escapeHtml(platformDisplayName(platform))}"></option>`).join("");
  el.fields.country.innerHTML = COUNTRY_OPTIONS.map(([value, label]) => `<option value="${value}">${escapeHtml(tt(label))}</option>`).join("");
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

function trySetLocalStorageItem(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    if (isStorageQuotaError(error)) removeLocalStorageItem(key);
    return false;
  }
}

function removeLocalStorageItem(key) {
  try { localStorage.removeItem(key); } catch {}
}

function isStorageQuotaError(error) {
  return error?.name === "QuotaExceededError" || error?.code === 22 || error?.code === 1014;
}
function bindTextureParallax() { if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return; let frame = 0; window.addEventListener("pointermove", (event) => { if (event.pointerType === "touch" || frame) return; frame = requestAnimationFrame(() => { frame = 0; const x = ((event.clientX / window.innerWidth) - .5) * -14; const y = ((event.clientY / window.innerHeight) - .5) * -14; document.documentElement.style.setProperty("--grid-x", `${x.toFixed(2)}px`); document.documentElement.style.setProperty("--grid-y", `${y.toFixed(2)}px`); }); }, { passive: true }); }
function renderGamelistModules() {
  const playing = state.gamelistGames.filter((game) => game.playing && !game.deletedAt).sort(comparePlayingGames);
  const finished = state.gamelistGames.filter((game) => game.completedAt && !game.deletedAt).sort((a, b) => String(b.completedAt).localeCompare(String(a.completedAt)) || String(a.title || "").localeCompare(String(b.title || ""), undefined, { sensitivity: "base" })).slice(0, 10);
  el.playingTitle.textContent = currentlyPlayingTitle(playing);
  el.playingCarousel.innerHTML = playing.map(gamelistProjectionCard).join("");
  const twitchCard = mountTwitchPreview(el.playingCarousel, state.gamelistSettings.twitchUser, playing.some((game) => game.stream));
  el.playingCarousel.closest(".playing-section")?.classList.toggle("playing-single", playing.length + Number(Boolean(twitchCard)) === 1);
  el.finishedCarousel.innerHTML = finished.map(finishedProjectionCard).join("");
  el.playingCarousel.querySelectorAll(".game-card.has-art").forEach(bindActivityCardParallax);
  el.playingCarousel.querySelectorAll(".cover-button img").forEach((image) => { bindCoverFrame(image); image.addEventListener("load", schedulePlayingCardHeightSync, { once: true }); });
  settleAfterImages(el.playingCarousel);
  settleAfterImages(el.finishedCarousel);
  preloadPausedActivityTrailers(el.playingCarousel, escapeHtml);
  el.playingCarousel.querySelectorAll(".trailer-toggle").forEach((button) => button.addEventListener("click", (event) => { event.stopPropagation(); const card = button.closest(".game-card"); const paused = card.classList.toggle("trailer-user-paused"); button.innerHTML = paused ? playTrailerIcon() : pauseTrailerIcon(); button.title = paused ? "Play trailer" : "Pause trailer"; button.setAttribute("aria-label", button.title); scheduleShelfTrailerUpdate(); }));
  el.playingCarousel.querySelectorAll(".edit-action").forEach((button) => button.addEventListener("click", (event) => { event.stopPropagation(); const game = state.gamelistGames.find((item) => item.id === button.closest("[data-gamelist-id]")?.dataset.gamelistId); if (!state.canEdit) openAuth(); else if (game) openGamelistDetails(game); }));
  [...el.playingCarousel.querySelectorAll("[data-gamelist-id]"), ...el.finishedCarousel.querySelectorAll("[data-gamelist-id]")].forEach((card) => { const open = (event) => { if (event?.target.closest("a,.edit-action,.trailer-toggle")) return; const game = state.gamelistGames.find((item) => item.id === card.dataset.gamelistId); if (game) openGamelistDetails(game); }; card.addEventListener("click", open); card.addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); open(); } }); });
  syncShelfActivityVisibility();
  el.playingCount.textContent = playingCountText(playing.length);
  schedulePlayingCardHeightSync();
  scheduleRenderSettle("gamelist-modules");
  requestAnimationFrame(() => { updatePlayingControls(); updateFinishedControls(); scheduleShelfTrailerUpdate(); });
}
function projectedDetailGame(game) { return { ...game, _gamelistProjection: true }; }
function activityGuideLinks(game) { return guideLinksMarkup(game, { title: game.title, playstation: ["PS4", "PS5"].includes(shortPlatform(game.platform || "").toUpperCase()), escape: escapeHtml }); }
function openGamelistDetails(sourceGame) {
  const game = projectedDetailGame(sourceGame);
  state.gamelistDetailGame = game;
  el.detailDialog.dataset.id = game.id;
  el.detailDialog.dataset.projection = "true";
  const cover = coverUrl(game.cover || "") || platformFallback(game.platform);
  const owners = Array.isArray(game.owners) && game.owners.length ? game.owners : [state.gamelistSettings.defaultOwner || "User"];
  const visibleOwners = visibleShelfCardOwners(owners);
  el.detailTitle.textContent = game.title;
  el.detailTitle.className = `${el.detailTitle.className.replace(/\bowner-[\w-]+/g, "").trim()} ${owners.map(ownerColorClass).join(" ")}`.trim();
  const detailStudio = [game.developer, game.publisher].filter(Boolean).join(" / ");
  el.detailStudio.innerHTML = `${visibleOwners.map(ownerBadge).join("")}${detailStudio ? `<span>${escapeHtml(detailStudio)}</span>` : ""}`;
  el.detailStudio.hidden = !el.detailStudio.textContent;
  el.detailMeta.innerHTML = `${platformBadge(game.platform, { title: game.title })}${mediaFormatBadge(game)}${dlcBadge(game)}${entitlementBadge(game)}${preorderPlaytimePill(game)}`;
  el.detailDates.innerHTML = [
    shelfReleaseDatePill(game, "Releases"),
    game.startedAt ? `<span class="history-pill history-date-pill started-date-pill"><small>${escapeHtml(tt("Started"))}</small><strong>${escapeHtml(formatShortDate(game.startedAt))}</strong></span>` : "",
    game.playing && state.cardPlaytime[game.id] ? shelfLivePlaytimePill(game, state.cardPlaytime[game.id]) : "",
    game.playing ? shelfCalendarStateBadge(game) : "",
  ].join("");
  el.detailDates.hidden = !el.detailDates.innerHTML;
  el.detailChips.innerHTML = `${game.preorderStore ? preorderProjectionChip(game.preorderStore) : ""}${(game.genres || []).slice(0, 4).map((genre) => `<span class="chip genre">${escapeHtml(genre)}</span>`).join("")}`;
  el.detailCover.src = cover;
  el.detailCover.hidden = !cover;
  el.detailCover.alt = cover ? `${game.title} cover` : "";
  bindCoverFrame(el.detailCover);
  el.detailDescription.textContent = game.description || "No description yet.";
  el.detailDescription.hidden = false;
  el.detailDescription.after(el.detailStorePricePanel);
  el.detailPricePanel.classList.remove("is-collapsed");
  el.detailPriceToggle.setAttribute("aria-expanded", "true");
  el.detailLinks.innerHTML = activityStoreLinks(game);
  const priceProviders = game.playing ? [] : priceProvidersForGame(game);
  el.detailStorePrices.style.setProperty("--price-columns", priceProviders.length || 1);
  el.detailStorePrices.innerHTML = priceProviders.length ? pricesFor(game) : "";
  el.detailStorePricePanel.hidden = !priceProviders.length;
  el.detailNote.hidden = true;
  el.detailPricePanel.hidden = true;
  el.detailConditionPanel.hidden = true;
  el.detailConditionPanel.classList.remove("price-panel-hidden");
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
function equalizeMobilePlayingCards() { state.playingHeightFrame = 0; el.playingCarousel.style.removeProperty("--mobile-playing-card-height"); if (!window.matchMedia("(max-width: 699px)").matches) return; const cards = [...el.playingCarousel.querySelectorAll(".game-card.playing-card")]; if (!cards.length) return; const height = Math.ceil(Math.max(...cards.map((card) => card.scrollHeight), 252)); el.playingCarousel.style.setProperty("--mobile-playing-card-height", `${height}px`); }
function scheduleShelfTrailerUpdate() { if (state.playingTrailerFrame) return; state.playingTrailerFrame = requestAnimationFrame(() => { state.playingTrailerFrame = 0; if (document.hidden || document.body.classList.contains("dialog-open")) return; syncFocusedActivityTrailer(el.playingCarousel, escapeHtml); }); }
function gamelistProjectionCard(game, options = {}) {
  if (game.calendarMilestone) return calendarMilestoneProjectionCard(game);
  const isReleaseDialog = Boolean(options.releaseDialog);
  const neutralReleaseCard = isReleaseDialog && Boolean(game.playing);
  const cover = coverUrl(game.cover || "") || platformFallback(game.platform);
  const owners = Array.isArray(game.owners) && game.owners.length ? game.owners : [state.gamelistSettings.defaultOwner || "User"];
  const visibleOwners = visibleShelfCardOwners(owners);
  const ownerClasses = visibleOwners.map((owner) => ` ${ownerCardColorClass(owner)}`).join("");
  const studio = [game.developer, game.publisher].filter(Boolean).join(" / ");
  const card = createGameCardShell(document);
  card.dataset.gamelistId = game.id; card.setAttribute("role", "button"); card.tabIndex = 0;
  card.dataset.gamelistTitle = game.title || "";
  card.className += ` has-art${neutralReleaseCard ? "" : " playing-card"}${ownerClasses}${game.digital ? " digital-card" : ""}${game.stream ? " stream-card" : ""}${shelfShowsCompletedTrophyStyle(game) ? " completed-trophy-card" : ""}`;
  card.classList.toggle("shelf-release-card", isReleaseDialog);
  card.style.setProperty("--card-art", `url('${escapeCss(cover)}')`);
  const trailer = card.querySelector(".card-trailer"); const trailerUrl = !isReleaseDialog && !neutralReleaseCard && window.matchMedia("(min-width: 900px)").matches ? activityTrailerUrl(game.trailerUrl) : ""; if (trailerUrl) { card.classList.add("has-trailer"); trailer.dataset.src = trailerUrl; const toggle = card.querySelector(".trailer-toggle"); toggle.hidden = false; toggle.innerHTML = pauseTrailerIcon(); } else { trailer.remove(); card.querySelector(".trailer-toggle")?.remove(); }
  const image = card.querySelector(".cover-button img"); image.src = cover; image.alt = `${game.title} cover`; image.loading = "eager"; image.fetchPriority = "high"; image.decoding = "async"; bindCoverFrame(image);
  const title = card.querySelector("h3"); title.textContent = game.title; title.className = `${title.className.replace(/\bowner-[\w-]+/g, "").trim()} ${visibleOwners.map(ownerColorClass).join(" ")}`.trim(); title.classList.toggle("completed-achievements-title", shelfShowsCompletedTrophyStyle(game));
  const titleOwners = card.querySelector(".title-owners");
  titleOwners.innerHTML = visibleOwners.map(ownerBadge).join("");
  titleOwners.hidden = !titleOwners.innerHTML;
  card.querySelector(".edit-action").classList.remove("editor-only");
  const studioLine = card.querySelector(".studio-line"); studioLine.textContent = studio; studioLine.hidden = !studio;
  card.querySelector(".meta").innerHTML = projectionMeta(game, { includePast: isReleaseDialog, includeProgress: neutralReleaseCard, includeRelease: !isReleaseDialog, includeCalendarState: isReleaseDialog && !game.playing });
  const dates = card.querySelector(".play-dates");
  dates.innerHTML = [
    game.startedAt && !neutralReleaseCard ? `<span class="history-pill history-date-pill started-date-pill"><small>Started</small><strong>${escapeHtml(formatShortDate(game.startedAt))}</strong></span>` : "",
    game.playing && !neutralReleaseCard && state.cardPlaytime[game.id] ? shelfLivePlaytimePill(game, state.cardPlaytime[game.id]) : "",
    isReleaseDialog && game.preorderStore ? preorderProjectionChip(game.preorderStore) : "",
  ].join("");
  dates.hidden = !dates.innerHTML;
  card.querySelector(".chips").innerHTML = projectionChips(game, { includePreorder: !isReleaseDialog });
  const trophies = card.querySelector(".card-trophies");
  const guideLinks = state.canEdit && game.playing && !isReleaseDialog ? activityGuideLinks(game) : [];
  const guideRow = guideLinks.length ? `<div class="guide-links card-guide-row">${guideLinks.join("")}</div>` : "";
  if (guideRow) dates.insertAdjacentHTML("afterend", guideRow);
  trophies.innerHTML = isReleaseDialog ? "" : shelfCardTrophies(game, { compactProgress: true });
  trophies.hidden = !trophies.innerHTML;
  card.querySelector(".card-actions").remove();
  const prices = card.querySelector(".prices");
  if (isReleaseDialog) {
    const providers = priceProvidersForGame(game);
    if (providers.length) {
      prices.style.setProperty("--price-columns", providers.length);
      prices.innerHTML = pricesFor(game);
    } else {
      prices.remove();
    }
  } else prices.remove();
  if (isReleaseDialog) card.querySelector(".edit-action")?.remove();
  const note = card.querySelector(".notes"); note.textContent = shortDescription(game.description || ""); note.hidden = !note.textContent;
  return card.outerHTML;
}

function calendarMilestoneProjectionCard(game) {
  const cover = coverUrl(game.cover || "") || "assets/Icon_shelf.png";
  const card = createGameCardShell(document);
  card.dataset.gamelistId = game.id || "";
  card.className += " calendar-milestone-card shelf-release-card";
  card.querySelector(".card-trailer")?.remove();
  card.querySelector(".trailer-toggle")?.remove();
  const image = card.querySelector(".cover-button img");
  image.src = cover;
  image.alt = `${game.title} cover`;
  image.loading = "eager";
  image.fetchPriority = "high";
  image.decoding = "async";
  bindCoverFrame(image);
  card.querySelector(".cover-button").disabled = true;
  card.querySelector("h3").textContent = game.title || "";
  card.querySelector(".title-owners").hidden = true;
  card.querySelector(".edit-action")?.remove();
  const studioLine = card.querySelector(".studio-line");
  studioLine.hidden = true;
  card.querySelector(".meta").innerHTML = "";
  const dates = card.querySelector(".play-dates");
  dates.innerHTML = game.releaseDate ? `<span class="history-pill history-date-pill"><small>${escapeHtml(tt("Created"))}</small><strong>${escapeHtml(formatShortDate(game.releaseDate) || game.releaseDate)}</strong></span>` : "";
  dates.hidden = !dates.innerHTML;
  card.querySelector(".chips").innerHTML = "";
  card.querySelector(".card-trophies").remove();
  card.querySelector(".card-actions").remove();
  card.querySelector(".prices").remove();
  const note = card.querySelector(".notes");
  note.textContent = game.description || "";
  note.hidden = !note.textContent;
  return card.outerHTML;
}

function currentlyPlayingTitle(games) {
  return tt(games.length && games.every((game) => game.stream) ? "Currently streaming" : "Currently playing");
}

function playingCountText(count) {
  return tt("Playing {count} {item}", { count, item: tt(count === 1 ? "game" : "games") });
}

async function refreshShelfPlayingCardPlaytime() {
  if (document.hidden) return;
  const games = state.gamelistGames.filter((game) => game.playing && !game.deletedAt);
  await Promise.all(games.map(async (game) => {
    const hours = await linkedShelfPlaytimeHours(game);
    if (!Number.isFinite(hours) || hours <= 0) return;
    const value = Math.ceil(hours);
    state.cardPlaytime[game.id] = value;
    const label = shelfLivePlaytimeComparison(game, value);
    const dateContainers = [...document.querySelectorAll(`.game-card[data-gamelist-id="${CSS.escape(game.id)}"] .play-dates`)];
    if (el.detailDialog.open && el.detailDialog.dataset.projection === "true" && el.detailDialog.dataset.id === game.id) dateContainers.push(el.detailDates);
    dateContainers.forEach((dates) => {
      let pill = dates.querySelector(".live-playtime-pill");
      if (!pill) {
        dates.insertAdjacentHTML("beforeend", shelfLivePlaytimePill(game, value));
        pill = dates.querySelector(".live-playtime-pill");
      }
      pill.style.cssText = shelfLivePlaytimePillStyle(game, value);
      pill.querySelector("strong").textContent = `${value} ${value === 1 ? "HR" : "HRS"}`;
      pill.querySelector(".live-playtime-expanded").innerHTML = shelfLivePlaytimeExpandedMarkup(game, value);
      pill.dataset.comparison = label;
      pill.removeAttribute("title");
      pill.setAttribute("aria-label", label);
      pill.querySelector("strong").textContent = `${value} ${value === 1 ? "HR" : "HRS"}`;
      dates.hidden = false;
    });
  }));
}

async function linkedShelfPlaytimeHours(game) {
  try {
    const platform = shortPlatform(game.platform || "").toLowerCase();
    if (["switch", "switch 2"].includes(platform)) {
      const params = new URLSearchParams({ title: game.title || "", platform: shortPlatform(game.platform) });
      const response = await fetch(`/api/nintendo-playtime?${params}`, { cache: "no-store" });
      if (!response.ok) return null;
      const hours = Number((await response.json()).playtimeHours);
      return Number.isFinite(hours) && hours > 0 ? hours : null;
    }
    if ((platform === "pc" || platform.includes("steam")) && state.gamelistSettings.steamUser) {
      const appId = steamAppIdForShelfGame(game);
      if (!appId) return null;
      const params = achievementParams({ owned: "1" });
      params.set("user", state.gamelistSettings.steamUser);
      const response = await fetch(`/api/steam-achievements?${params}`, { cache: "no-store" });
      if (!response.ok) return null;
      const data = await response.json();
      const match = (data.ownedGames || []).find((item) => String(item.appId).replace(/\D/g, "") === appId);
      const minutes = Number(match?.playtimeForever);
      return Number.isFinite(minutes) && minutes > 0 ? minutes / 60 : null;
    }
    if (/^ps[3-5]$/.test(platform) && state.gamelistSettings.psnUser) {
      const params = achievementParams({ playtime: "1" });
      params.set("user", state.gamelistSettings.psnUser);
      const response = await fetch(`/api/achievements?${params}`, { cache: "no-store" });
      if (!response.ok) return null;
      const data = await response.json();
      const played = (data.playedGames || [])
        .map((item) => ({ item, score: activityTitleMatchScore(game.trophyName || game.title, item.title || "") }))
        .filter(({ item, score }) => score >= 75 && (!item.platform || String(item.platform).toLowerCase().includes(platform)))
        .sort((a, b) => b.score - a.score)[0]?.item;
      const duration = String(played?.playDuration || "").match(/^P(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$/i);
      if (!duration) return null;
      return (Number(duration[1]) || 0) * 24 + (Number(duration[2]) || 0) + (Number(duration[3]) || 0) / 60 + (Number(duration[4]) || 0) / 3600;
    }
    if (platform.includes("xbox") || ["xone", "x360"].includes(platform)) {
      const match = (state.xboxActivity.games || [])
        .map((item) => ({ item, score: activityTitleMatchScore(game.trophyName || game.title, item.title || item.name || "") }))
        .filter(({ item, score }) => score >= 75 && item.titleId)
        .sort((a, b) => b.score - a.score)[0]?.item;
      if (!match?.titleId || !state.gamelistSettings.microsoftUser) return null;
      const params = achievementParams({ playtime: "1", titleId: match.titleId });
      params.set("user", state.gamelistSettings.microsoftUser);
      const response = await fetch(`/api/xbox-achievements?${params}`, { cache: "no-store" });
      if (!response.ok) return null;
      const hours = Number((await response.json()).playtimeHours);
      return Number.isFinite(hours) && hours > 0 ? hours : null;
    }
  } catch {}
  return null;
}

function shelfLivePlaytimePill(game, hours) {
  const label = shelfLivePlaytimeComparison(game, hours);
  return `<span class="history-pill history-date-pill playtime-date-pill live-playtime-pill" style="${shelfLivePlaytimePillStyle(game, hours)}" data-comparison="${escapeHtml(label)}" aria-label="${escapeHtml(label)}" aria-expanded="false"><small>${escapeHtml(tt("Play Time"))}</small><strong>${hours} ${hours === 1 ? "HR" : "HRS"}</strong><span class="live-playtime-expanded">${shelfLivePlaytimeExpandedMarkup(game, hours)}</span></span>`;
}

function toggleShelfLivePlaytimePill(event) {
  if (!window.matchMedia("(hover: none)").matches) return;
  const pill = event.target?.closest?.(".live-playtime-pill");
  if (!pill) return;
  event.stopPropagation();
  pill.classList.add("is-tap-controlled");
  const expanded = pill.classList.toggle("is-expanded");
  pill.setAttribute("aria-expanded", String(expanded));
}

function shelfLivePlaytimeExpandedMarkup(game, hours) {
  const current = `${hours} ${hours === 1 ? "HR" : "HRS"}`;
  const estimate = Math.ceil(Number(game?.lengthHours));
  return estimate > 0
    ? `<span class="live-playtime-current">${current}</span><span class="live-playtime-estimate">OF ${estimate} HRS</span>`
    : `<span class="live-playtime-current">${current} PLAYED</span>`;
}

function shelfLivePlaytimePillStyle(game, hours) {
  const estimate = Number(game?.lengthHours);
  const estimateHours = Number.isFinite(estimate) && estimate > 0 ? estimate : hours;
  const actualHue = Math.round(132 - (132 * Math.max(0, Math.min(1, (Number(hours) - 7) / 53))));
  const estimateHue = Math.round(132 - (132 * Math.max(0, Math.min(1, (estimateHours - 7) / 53))));
  return `${shelfTimePillStyle(hours)};--time-color-solid:hsl(${actualHue}, 88%, 56%);--time-light-solid:hsl(${Math.min(140, actualHue + 10)}, 94%, 72%);--time-dark-solid:hsl(${Math.max(0, actualHue - 8)}, 82%, 39%);--time-estimate-color:hsl(${estimateHue}, 88%, 56%);--time-estimate-color-solid:hsl(${estimateHue}, 88%, 56%)`;
}

function shelfLivePlaytimeComparison(game, hours) {
  const estimate = Math.ceil(Number(game?.lengthHours));
  return estimate > 0 ? `${hours} HRS OUT OF ${estimate} HRS` : `${hours} ${hours === 1 ? "HR" : "HRS"} PLAYED`;
}

function shelfTimePillStyle(hours) {
  const clamped = Math.max(0, Math.min(1, (Number(hours) - 7) / 53));
  const hue = Math.round(132 - (132 * clamped));
  return `--time-color:hsl(${hue}, 88%, 56%);--time-light:hsl(${Math.min(140, hue + 10)}, 94%, 72%);--time-dark:hsl(${Math.max(0, hue - 8)}, 82%, 39%);--time-glow:hsla(${hue}, 88%, 56%, 0.34)`;
}

function projectionMeta(game, options = {}) {
  const release = options.includeRelease === false ? "" : activityReleaseStatus(game, { includePast: Boolean(options.includePast) });
  const calendarState = options.includeCalendarState ? shelfCalendarStateBadge(game) : "";
  return `${platformBadge(game.platform, { title: game.title })}${options.includeProgress ? shelfProgressPill(game) : ""}${mediaFormatBadge(game)}${dlcBadge(game)}${entitlementBadge(game)}${calendarState}${game.emulator ? `<span class="emulator-pill">${escapeHtml(tt("Emulator"))}</span>` : ""}${game.lengthHours && !game.playing ? timeBadgeMarkup(game.lengthHours, game.hltbUrl || game.howLongToBeatUrl || `https://howlongtobeat.com/?q=${encodeURIComponent(game.title)}`, escapeHtml) : ""}${game.stream ? streamBadge() : ""}${release ? releaseStatusPill(release) : ""}${game.coop ? coopBadge() : ""}${game.multiplayer && !game.coop ? multiplayerBadge() : ""}${game.replayCount ? `<span class="replay-pill">Replay ${escapeHtml(game.replayCount)}</span>` : ""}`;
}

function mediaFormatBadge(game) {
  if (!game) return "";
  const cls = platformClass(game.platform, { title: game.title });
  if (game.digital || game.dlc) {
    return `<span class="digital-pill media-format-pill ${escapeHtml(cls)}" title="Digital" aria-label="Digital">${downloadBadgeIcon()}</span>`;
  }
  return `<span class="digital-pill physical-pill media-format-pill ${escapeHtml(cls)}" title="Physical" aria-label="Physical">${physicalDiskIcon(cls)}</span>`;
}

function dlcBadge(game, label = "DLC") {
  if (!game?.dlc) return "";
  const cls = platformClass(game.platform, { title: game.title });
  return `<span class="dlc-pill ${escapeHtml(cls)}" title="${escapeHtml(label)}">${escapeHtml(label)}</span>`;
}

function entitlementBadge(game) {
  const type = game?.psPlus ? "psplus" : game?.gamesWithGold ? "gameswithgold" : "";
  if (!type || !isDigitalShelfGame(game)) return "";
  const title = type === "psplus" ? "PlayStation Plus" : "Games with Gold";
  return `<span class="entitlement-pill entitlement-${type}" title="${title}" aria-label="${title}"><img src="assets/platforms/${type}.png" alt="" width="22" height="22" decoding="async"></span>`;
}

function physicalDiskIcon(platformClassName = "") {
  const ps5 = /\bplatform-ps5\b/.test(platformClassName);
  const src = ps5 ? "assets/platforms/disk-inverted.png" : "assets/platforms/disk.png";
  return `<img src="${src}" alt="" width="18" height="18" decoding="async">`;
}

function downloadBadgeIcon() {
  return `
    <svg class="download-badge-icon" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="5" y="4.5" width="14" height="15" rx="3"></rect>
      <path d="M12 7.5v6.5"></path>
      <path d="M9.5 11.8 12 14.3l2.5-2.5"></path>
      <path d="M8.8 17h6.4"></path>
    </svg>
  `;
}
function projectionChips(game, options = {}) {
  return [
    options.includePreorder === false || !game.preorderStore ? "" : chip(tt("Preordered: {store}", { store: game.preorderStore }), "accent"),
    ...(game.genres || []).slice(0, 4).map((tag) => chip(tt(tag), "genre")),
  ].join("");
}
function chip(label, type = "") {
  return `<span class="chip ${escapeHtml(type)}">${escapeHtml(label)}</span>`;
}
function releaseStatusPill(value) {
  const text = String(value || "").trim();
  const match = text.match(/^(Released|Releases)\s+(.+)$/i);
  if (!match) return `<span class="release-pill">${escapeHtml(text)}</span>`;
  const label = match[1].toLowerCase() === "released" ? tt("Released") : tt("Releases");
  const date = formatShortDate(match[2]) || match[2];
  return `<span class="release-pill history-date-pill"><small class="release-date-label"><span>${label}</span>${calendarMiniIcon()}</small><strong>${escapeHtml(date)}</strong></span>`;
}

function shelfReleaseDatePill(game, label) {
  const text = String(game?.releaseText || "").trim() || (game?.releaseDate ? formatDate(game.releaseDate) : "");
  if (!text) return "";
  return `<span class="release-pill history-date-pill"><small class="release-date-label"><span>${escapeHtml(tt(label))}</span>${calendarMiniIcon()}</small><strong>${escapeHtml(text)}</strong></span>`;
}

function calendarMiniIcon() {
  return `
    <svg class="calendar-mini-icon" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="5.5" width="16" height="15" rx="3"></rect>
      <path d="M8 3.5v4"></path>
      <path d="M16 3.5v4"></path>
      <path d="M4 10h16"></path>
    </svg>
  `;
}

function shelfCalendarStateBadge(game) {
  if (game.playing) return shelfCalendarStatePill("Playing", "finished");
  if (game.platinum) return shelfCalendarStatePill("Completed", "completed", trophyIcon());
  if (game.completedAt) return shelfCalendarStatePill("Finished", "finished");
  if (game.section === "backlog") return shelfCalendarStatePill("Backlog", "backlog");
  return "";
}

function shelfCalendarStatePill(label, tone, icon = "") {
  return `<span class="calendar-state-pill calendar-state-${escapeHtml(tone)}">${icon}${escapeHtml(tt(label))}</span>`;
}

function coopBadge() {
  return `<span class="coop-pill" title="${escapeHtml(tt("CoOp"))}" aria-label="${escapeHtml(tt("CoOp"))}">${coopIcon()}</span>`;
}

function multiplayerBadge() {
  return `<span class="multiplayer-pill" title="${escapeHtml(tt("Multiplayer"))}" aria-label="${escapeHtml(tt("Multiplayer"))}">${onlineGlobeIcon()}</span>`;
}

function streamBadge() {
  return `<span class="stream-pill" title="${escapeHtml(tt("Stream"))}" aria-label="${escapeHtml(tt("Stream"))}">${streamPlayIcon()}</span>`;
}

function streamPlayIcon() {
  return `<svg class="stream-play-icon twitch-filter-icon" viewBox="0 0 24 24" aria-hidden="true">${twitchLogoPath()}</svg>`;
}

function twitchLogoPath() {
  return `<path class="twitch-filter-logo-path" d="M6 0 1.7 4.3v15.4h5.1V24l4.3-4.3h3.4l7.8-7.7V0H6Zm14.6 11.1-3.4 3.4h-3.5l-3 3v-3H6.9V1.7h13.7v9.4ZM18 4.7v5.1h-1.7V4.7H18Zm-4.7 0v5.1h-1.7V4.7h1.7Z"></path>`;
}

function onlineGlobeIcon() {
  return `<svg class="online-globe-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"></circle><path d="M4 12h16"></path><path d="M12 4c2.1 2.2 3.2 4.8 3.2 8s-1.1 5.8-3.2 8"></path><path d="M12 4c-2.1 2.2-3.2 4.8-3.2 8s1.1 5.8 3.2 8"></path></svg>`;
}

function activityGameFor(game) {
  if (!shelfAllowsTrophyActivity(game.platform)) return null;
  if (!/(^|\s)ps[1-5](\s|$)|playstation/i.test(shortPlatform(game.platform || ""))) return null;
  const normalizedTitle = normalize(game.trophyName || game.title || "");
  if (/(^|\b)baldur/.test(normalizedTitle) && /\bgate\b/.test(normalizedTitle) && /(^|\s)ps5(\s|$)/i.test(shortPlatform(game.platform || ""))) {
    const knownMatch = (state.trophyActivity?.games || []).find((item) => item.npCommunicationId === "NPWR36088_00");
    return knownMatch || { title: "Baldur's Gate 3", npCommunicationId: "NPWR36088_00", npServiceName: "trophy2", rarity: "PS5" };
  }
  return (state.trophyActivity?.games || []).map((item) => ({ item, score: activityTitleMatchScore(game.trophyName || game.title, item.title || item.game || "") })).filter(({ score }) => score >= 75).sort((a, b) => b.score - a.score)[0]?.item || null;
}
function activityProgressFor(game) {
  return activityProgressSummary(game)?.progress ?? null;
}
function activityProgressSummary(game) {
  if (!shelfAllowsTrophyActivity(game.platform)) return null;
  const external = externalActivityFor(game);
  if (external?.loading) return null;
  if (external && Number.isFinite(Number(external.earned)) && Number.isFinite(Number(external.total))) {
    const earned = Math.max(0, Number(external.earned) || 0);
    const total = Math.max(0, Number(external.total) || 0);
    if (!total) return null;
    return { progress: total ? Math.round((earned / total) * 100) : 0, earned, total };
  }
  const remote = activityGameFor(game);
  const cacheKey = remote?.npCommunicationId || remote?.id || "";
  const cached = cacheKey ? state.cardTrophies[cacheKey] : null;
  if (cached && Number.isFinite(Number(cached.earned)) && Number.isFinite(Number(cached.total))) {
    const earned = Math.max(0, Number(cached.earned) || 0);
    const total = Math.max(0, Number(cached.total) || 0);
    if (!total) return null;
    return { progress: total ? Math.round((earned / total) * 100) : 0, earned, total };
  }
  if (remote && cacheKey) {
    loadShelfCardTrophies(game, remote);
    return null;
  }
  const countMatch = String(remote?.game || "").match(/(\d+)\s*\/\s*(\d+)/);
  const match = String(remote?.game || "").match(/(\d{1,3})%/);
  if (match) {
    const summary = { progress: Math.min(100, Number(match[1])) };
    if (countMatch) {
      summary.earned = Math.max(0, Number(countMatch[1]) || 0);
      summary.total = Math.max(0, Number(countMatch[2]) || 0);
    }
    return summary;
  }
  return null;
}
function shelfProgressBadge(summary, options = {}) {
  if (!summary || summary.progress == null) return "";
  const className = ["psn-progress-pill", options.className || ""].filter(Boolean).join(" ");
  const label = !options.compact && Number.isFinite(Number(summary.earned)) && Number.isFinite(Number(summary.total)) ? tt("{earned}/{total} earned", { earned: Number(summary.earned), total: Number(summary.total) }) : "";
  return `<span class="${className}">${options.includeIcon === false ? "" : trophyIcon()}<em style="--progress:${summary.progress}%"></em><strong>${summary.progress}%</strong>${label ? `<span>${options.separator ? "<b>·</b>" : ""}${escapeHtml(label)}</span>` : ""}</span>`;
}
function shelfProgressPill(game) {
  if (!shelfAllowsTrophyActivity(game.platform)) return "";
  const progress = activityProgressFor(game);
  return progress != null ? `<span class="psn-progress-pill shelf-progress-pill">${trophyIcon()}<em style="--progress:${progress}%"></em><strong>${progress}%</strong></span>` : "";
}
function shelfCardTrophies(game, options = {}) {
  if (!shelfAllowsTrophyActivity(game.platform)) return "";
  if (shelfIsSteamAchievementGame(game) && !steamAppIdForShelfGame(game)) return "";
  const external = externalActivityFor(game);
  if (external) {
    const label = achievementKindForPlatform(game.platform);
    if (external.loading) return `<div class="card-trophy-head trophy-gold">${trophyIcon()}<span>Loading ${label.plural}...</span></div>`;
    const earned = external.achievements.filter((item) => item.earned !== false && item.earnedAt).sort((a, b) => (Date.parse(b.rawEarnedAt || b.earnedAt || 0) || 0) - (Date.parse(a.rawEarnedAt || a.earnedAt || 0) || 0)).slice(0, 3);
    const progress = activityProgressSummary(game);
    if (!earned.length && !progress) return "";
    const tone = ["steam", "pc"].includes(normalize(shortPlatform(game.platform))) ? "steam" : "";
    return `<div class="card-trophy-head trophy-gold">${trophyIcon()}<span>${escapeHtml(tt(label.plural === "trophies" ? "TROPHIES" : "ACHIEVEMENTS"))}</span>${shelfProgressBadge(progress, { includeIcon: false, className: "card-trophy-progress", separator: !options.compactProgress, compact: options.compactProgress })}</div>${earned.length ? `<div class="card-trophy-list">${earned.map((item) => `<a class="card-trophy trophy-${tone || trophyTone(item.type || item.rarity)}" href="${escapeHtml(item.url || (shortPlatform(game.platform).toLowerCase().includes("xbox") ? state.xboxActivity.sourceUrl : state.steamActivity.sourceUrl) || "#")}" target="_blank" rel="noreferrer" title="${escapeHtml([item.title, item.earnedAt].filter(Boolean).join(" · "))}"><img src="${escapeHtml(item.icon || platformLogo(game.platform))}" alt=""><span>${escapeHtml(item.title || label.single)}</span>${item.earnedAt ? `<small class="card-trophy-meta">${escapeHtml(item.earnedAt)}</small>` : ""}</a>`).join("")}</div>` : ""}`;
  }
  const remote = activityGameFor(game);
  const cacheKey = remote?.npCommunicationId || remote?.id || "";
  const cached = cacheKey ? state.cardTrophies[cacheKey] : null;
  if (cacheKey && !cached) loadShelfCardTrophies(game, remote);
  const query = normalize(game.trophyName || game.title);
  const recent = (state.trophyActivity?.achievements || []).filter((item) => { const value = normalize(item.game || ""); return value && (value.includes(query) || query.includes(value)); });
  const trophies = (cached?.trophies?.length ? cached.trophies : recent).slice(0, 3);
  if (!trophies.length && cached?.loading) return `<div class="card-trophy-head trophy-gold">${trophyIcon()}<span>Loading trophies...</span></div>`;
  if (!trophies.length) return "";
  const progress = activityProgressSummary(game);
  return `<div class="card-trophy-head trophy-gold">${trophyIcon()}<span>${escapeHtml(tt("TROPHIES"))}</span>${shelfProgressBadge(progress, { includeIcon: false, className: "card-trophy-progress", separator: !options.compactProgress, compact: options.compactProgress })}</div><div class="card-trophy-list">${trophies.map((item) => `<a class="card-trophy trophy-${trophyTone(item.type || item.rarity)}" href="${escapeHtml(item.url || state.trophyActivity?.sourceUrl || "#")}" target="_blank" rel="noreferrer" title="${escapeHtml([item.title, item.earnedAt].filter(Boolean).join(" · "))}"><img src="${escapeHtml(item.icon || platformLogo("PS5"))}" alt=""><span>${escapeHtml(item.title || "Trophy")}</span>${item.earnedAt ? `<small class="card-trophy-meta">${escapeHtml(item.earnedAt)}</small>` : ""}</a>`).join("")}</div>`;
}

function achievementKindForPlatform(platform) {
  const value = normalize(shortPlatform(platform));
  return value.includes("ps") || value.includes("playstation")
    ? { single: "Trophy", plural: "trophies" }
    : { single: "Achievement", plural: "achievements" };
}

function shelfAllowsTrophyActivity(platform) {
  return !isImpossibleTrophyPlatform(platform);
}

function shelfShowsCompletedTrophyStyle(game) {
  return Boolean(game?.platinum && shelfAllowsTrophyActivity(game.platform));
}

function isImpossibleTrophyPlatform(platform) {
  const values = [platform, shortPlatform(platform)].map(normalize);
  return values.some((value) => /^(ps1|ps2|playstation|playstation 1|playstation 2|sony playstation|sony playstation 1|sony playstation 2)$/.test(value));
}

async function loadGamelistDetailTrophies(game) {
  el.detailTrophies.hidden = true;
  el.detailTrophyList.innerHTML = "";
  if (!shelfAllowsTrophyActivity(game.platform)) return;
  const external = externalActivityFor(game);
  if (external) {
    if (external.loading) { el.detailTrophies.hidden = false; el.detailTrophyTitle.textContent = tt("ACHIEVEMENTS"); el.detailTrophyPercent.innerHTML = ""; el.detailTrophyList.innerHTML = `<div class="detail-trophy-empty">${escapeHtml(tt("Loading earned achievements..."))}</div>`; return; }
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
  const cached = state.cardTrophies[id];
  const cachedTrophies = Array.isArray(cached?.allTrophies) && cached.allTrophies.length
    ? cached.allTrophies
    : Array.isArray(cached?.trophies) ? cached.trophies : [];
  if (cached && !cached.loading && cachedTrophies.length) {
    renderGamelistDetailTrophies(game, cachedTrophies, Number(cached.earned ?? cachedTrophies.filter((item) => item.earned).length), Number(cached.total ?? cachedTrophies.length), "TROPHIES");
    refreshShelfPsnTrophiesInBackground(game, remote, id, "gamelist");
    return;
  }
  const activityTrophies = (state.trophyActivity?.achievements || [])
    .filter((item) => item.npCommunicationId === id || activityTitleMatchScore(game.trophyName || game.title, item.game || item.title || "") >= 75)
    .sort((a, b) => Date.parse(b.rawEarnedAt || b.earnedAt || 0) - Date.parse(a.rawEarnedAt || a.earnedAt || 0));
  if (activityTrophies.length) {
    renderGamelistDetailTrophies(game, activityTrophies, activityTrophies.filter((item) => item.earned).length, activityTrophies.length, "TROPHIES");
    refreshShelfPsnTrophiesInBackground(game, remote, id, "gamelist");
    return;
  }
  el.detailTrophies.hidden = false;
  el.detailTrophyList.innerHTML = `<div class="detail-trophy-empty">${escapeHtml(tt("Loading earned trophies..."))}</div>`;
  try {
    const params = achievementParams({ id, service: remote.npServiceName || "trophy", user: state.gamelistSettings.psnUser || "" });
    const response = await fetch(`/api/trophies?${params}`);
    const data = await response.json();
    const trophies = Array.isArray(data.trophies) ? data.trophies : [];
    state.cardTrophies[id] = { loading: false, allTrophies: trophies, trophies: trophies.filter((item) => item.earned).sort((a, b) => Date.parse(b.rawEarnedAt || b.earnedAt || 0) - Date.parse(a.rawEarnedAt || a.earnedAt || 0)).slice(0, 3), earned: trophies.filter((item) => item.earned).length, total: trophies.length };
    refreshShelfProjectedActivity(game);
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
  el.detailTrophyPercent.innerHTML = total ? shelfProgressBadge({ progress, earned, total }, { includeIcon: false, separator: true }) : "";
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
  el.detailTrophyList.innerHTML = trophies.length ? trophies.map((item) => `<article class="detail-trophy-card trophy-${tone || trophyTone(item.type || item.rarity)} ${item.earned ? "earned" : "missing"}"><img src="${escapeHtml(item.icon || platformLogo(game?.platform || "PS5"))}" alt=""><div><strong>${escapeHtml(item.title || "Achievement")}</strong><span>${escapeHtml([item.earned ? item.earnedAt || tt("Earned") : tt("Missing"), item.rarity].filter(Boolean).join(" · "))}</span>${item.description ? `<p>${escapeHtml(item.description)}</p>` : ""}</div></article>`).join("") : `<div class="detail-trophy-empty">No ${state.gamelistDetailTrophyKind === "TROPHIES" ? "trophies" : "achievements"} found for this game yet.</div>`;
}
function externalActivityFor(game) {
  const platform = normalize(shortPlatform(game.platform)); const title = game.trophyName || game.title;
  if (platform.includes("steam") || platform === "pc") { const appId = steamAppIdForShelfGame(game); if (!appId) return null; const cached = state.cardTrophies[`steam:${appId}`]; if (cached) return { achievements: cached.achievements || [], earned: cached.earned || 0, total: cached.total || 0, loading: cached.loading, needsSetup: cached.needsSetup, authError: cached.authError, error: cached.error || "", debug: cached.debug || "" }; const match = state.steamActivity.games.map((item) => ({ item, score: activityTitleMatchScore(title, item.name || item.title) })).filter(({ score }) => score >= 75).sort((a, b) => b.score - a.score)[0]?.item; if (!match) { loadShelfSteamCardAchievements(game, appId); return { achievements: [], earned: 0, total: 0, loading: true }; } const achievements = match.achievements || []; return { achievements, earned: achievements.filter((item) => item.earned).length, total: achievements.length, unavailable: match.unavailable, error: match.error || "", debug: match.debug || "" }; }
  if (platform.includes("xbox") || platform === "x360" || platform === "xone") { const match = state.xboxActivity.games.map((item) => ({ item, score: activityTitleMatchScore(title, item.title || item.game) })).filter(({ score }) => score >= 75).sort((a, b) => b.score - a.score)[0]?.item; if (!match) return null; const achievements = match.achievements || []; return { achievements, earned: Number(match.earned || achievements.filter((item) => item.earned).length), total: Number(match.total || achievements.length) }; }
  return null;
}
function steamAppIdForShelfGame(game) { const direct = String(game.steamAppId || "").replace(/\D/g, ""); if (direct) return direct; const value = game.storeLinks?.steam || ""; try { const parts = new URL(value).pathname.split("/").filter(Boolean); const index = parts.indexOf("app"); return index >= 0 ? String(parts[index + 1] || "").replace(/\D/g, "") : ""; } catch { return ""; } }
async function loadShelfSteamCardAchievements(game, appId) { const key = `steam:${appId}`; if (state.cardTrophies[key]) return; state.cardTrophies[key] = { loading: true, achievements: [], earned: 0, total: 0 }; try { const params = achievementParams({ appId, debug: "1" }); if (state.gamelistSettings.steamUser) params.set("user", state.gamelistSettings.steamUser); const response = await fetch(`/api/steam-achievements?${params}`); const data = await response.json(); const achievements = Array.isArray(data.achievements) ? data.achievements : []; state.cardTrophies[key] = { loading: false, achievements, earned: Number(data.earnedCount ?? achievements.filter((item) => item.earned).length), total: Number(data.count ?? achievements.length), needsSetup: Boolean(data.needsSetup), authError: Boolean(data.authError || data.error || !response.ok), error: data.error || "", debug: data.debug || "" }; } catch { state.cardTrophies[key] = { loading: false, achievements: [], earned: 0, total: 0, authError: true }; } refreshShelfProjectedActivity(game); if (el.detailDialog.open && el.detailDialog.dataset.id === game.id) { if (el.detailDialog.dataset.projection === "true") loadGamelistDetailTrophies(game); else loadShelfTrophies(game); } }
async function loadShelfCardTrophies(game, remote) {
  const cacheKey = remote?.npCommunicationId || remote?.id || "";
  if (!cacheKey || state.cardTrophies[cacheKey]) return;
  state.cardTrophies[cacheKey] = { loading: true, trophies: [], earned: 0, total: 0 };
  try {
    const params = achievementParams({ id: cacheKey, service: remote.npServiceName || "trophy", user: state.gamelistSettings.psnUser || "" });
    const response = await fetch(`/api/trophies?${params}`);
    const data = await response.json();
    const all = Array.isArray(data.trophies) ? data.trophies : [];
    state.cardTrophies[cacheKey] = { loading: false, allTrophies: all, trophies: all.filter((item) => item.earned).sort((a, b) => Date.parse(b.rawEarnedAt || b.earnedAt || 0) - Date.parse(a.rawEarnedAt || a.earnedAt || 0)).slice(0, 3), earned: all.filter((item) => item.earned).length, total: all.length };
  } catch { state.cardTrophies[cacheKey] = { loading: false, trophies: [], earned: 0, total: 0 }; }
  refreshShelfProjectedActivity(game);
}

async function refreshShelfPsnTrophiesInBackground(game, remote, cacheKey, mode) {
  try {
    const params = achievementParams({ id: cacheKey, service: remote.npServiceName || "trophy", user: state.gamelistSettings.psnUser || "" }, true);
    const response = await fetch(`/api/trophies?${params}`, { cache: "no-store" });
    const data = await response.json().catch(() => ({ trophies: [] }));
    if (!response.ok) return;
    const trophies = Array.isArray(data.trophies) ? data.trophies : [];
    if (!trophies.length) return;
    const earned = trophies.filter((item) => item.earned).length;
    const total = trophies.length;
    state.cardTrophies[cacheKey] = { loading: false, allTrophies: trophies, trophies: trophies.filter((item) => item.earned).sort((a, b) => Date.parse(b.rawEarnedAt || b.earnedAt || 0) - Date.parse(a.rawEarnedAt || a.earnedAt || 0)).slice(0, 3), earned, total };
    refreshShelfProjectedActivity(game);
    if (!el.detailDialog.open || el.detailDialog.dataset.id !== game.id) return;
    if (mode === "gamelist") {
      renderGamelistDetailTrophies(game, trophies, earned, total, "TROPHIES");
      return;
    }
    const progress = total ? Math.round((earned / total) * 100) : 0;
    el.detailTrophies.hidden = false;
    el.detailTrophyTitle.textContent = tt("TROPHIES");
    el.detailTrophyCount.textContent = "";
    el.detailTrophyPercent.innerHTML = total ? shelfProgressBadge({ progress, earned, total }, { includeIcon: false, separator: true }) : "";
    el.detailTrophyList.innerHTML = trophies.map((item) => `<article class="detail-trophy-card trophy-${trophyTone(item.type || item.rarity)} ${item.earned ? "earned" : "missing"}"><img src="${escapeHtml(item.icon || "assets/platforms/playstation.png")}" alt=""><div><strong>${escapeHtml(item.title || "Trophy")}</strong><span>${escapeHtml([item.earned ? item.earnedAt || tt("Earned") : tt("Missing"), item.rarity].filter(Boolean).join(" · "))}</span>${item.description ? `<p>${escapeHtml(item.description)}</p>` : ""}</div></article>`).join("");
  } catch {
    // Cached trophy data is already visible; background refresh is best-effort.
  }
}

function refreshShelfProjectedActivity(game) {
  updateShelfCardTrophyStrips(game.id);
  renderGamelistModules();
}
function updateShelfCardTrophyStrips(gameId) {
  const game = state.gamelistGames.find((item) => item.id === gameId && !item.deletedAt);
  if (!game) return;
  document.querySelectorAll(`.game-card[data-gamelist-id="${CSS.escape(gameId)}"] .card-trophies`).forEach((node) => {
    node.innerHTML = game.playing ? shelfCardTrophies(game, { compactProgress: true }) : "";
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
  const badges = `${visibleProjectionOwners(game).map(ownerBadge).join("")}${platformBadge(game.platform, { title: game.title })}${mediaFormatBadge(game)}${game.emulator ? `<span class="emulator-pill">${escapeHtml(tt("Emulator"))}</span>` : ""}${game.coop ? coopBadge() : ""}${game.multiplayer && !game.coop ? multiplayerBadge() : ""}${game.stream ? streamBadge() : ""}${game.replayCount ? `<span class="replay-pill">Replay ${escapeHtml(game.replayCount)}</span>` : ""}`;
  return finishedGameMarkup({ id: game.id, title: game.title, cover, completedClass: shelfShowsCompletedTrophyStyle(game) ? "completed-trophy-card" : "", itemClass: projectionOwnerCardClass(game), badges, dateText: finishedProjectionDateText(game), progress, dataName: "gamelist-id", escape: escapeHtml });
}
async function loadTrophyActivity() {
  const module = el.trophyCard.closest("[data-module]");
  const user = state.gamelistSettings.psnUser || "";
  const cacheKey = achievementSettingsKey(state.gamelistSettings);
  const forceRefresh = state.gamelistSettings.forceCacheOnLoad === true;
  const cached = forceRefresh ? null : readAchievementCache(cacheKey);
  if (cached) {
    state.trophyActivity = cached.psn || null;
    state.steamActivity = cached.steam || { achievements: [], games: [], completed: [], totalEarned: 0, sourceUrl: "" };
    state.xboxActivity = cached.xbox || { achievements: [], games: [], completed: [], totalEarned: 0, sourceUrl: "" };
    const panel = achievementPanelMarkup({ psn: state.trophyActivity || {}, steam: state.steamActivity, xbox: state.xboxActivity, trophyIconHtml: trophyIcon(), platformBadge, platformLogo, trophyTone, escape: escapeHtml, translate: tt });
    el.trophyCard.innerHTML = panel.html;
    el.trophyCard.querySelector("[data-action='platinums']")?.addEventListener("click", openCompletedGames);
    updateAllShelfTrophyStrips();
    updateShelfPhysicalProgressPills();
    renderGamelistModules();
    module.hidden = state.layout.hidden.includes("trophies");
    return;
  }
  el.trophyCard.innerHTML = `<span class="lookup-loading">Loading trophy activity…</span>`;
  try {
    const psnRequest = user
      ? fetch(`/api/achievements?${achievementParams({ user, schema: "3" }, forceRefresh)}`).then((response) => response.ok ? response.json() : null)
      : Promise.resolve({ user: "", achievements: [], games: [], platinums: [], sourceUrl: "https://www.playstation.com/", source: "psn" });
    const [psnResult, steamResult, xboxResult] = await Promise.allSettled([psnRequest, fetchShelfSteamActivity(forceRefresh), fetchShelfXboxActivity(forceRefresh)]);
    state.trophyActivity = psnResult.status === "fulfilled" ? psnResult.value : null;
    state.steamActivity = steamResult.status === "fulfilled" ? steamResult.value : { achievements: [], games: [], completed: [], totalEarned: 0, sourceUrl: "" };
    state.xboxActivity = xboxResult.status === "fulfilled" ? xboxResult.value : { achievements: [], games: [], completed: [], totalEarned: 0, sourceUrl: "" };
    notifyAchievementProviderIssues(state.trophyActivity || {}, state.steamActivity, state.xboxActivity);
    writeAchievementCache(cacheKey, { psn: state.trophyActivity, steam: state.steamActivity, xbox: state.xboxActivity });
    const panel = achievementPanelMarkup({ psn: state.trophyActivity || {}, steam: state.steamActivity, xbox: state.xboxActivity, trophyIconHtml: trophyIcon(), platformBadge, platformLogo, trophyTone, escape: escapeHtml, translate: tt });
    el.trophyCard.innerHTML = panel.html;
    el.trophyCard.querySelector("[data-action='platinums']")?.addEventListener("click", openCompletedGames);
    updateAllShelfTrophyStrips();
    updateShelfPhysicalProgressPills();
    renderGamelistModules();
  } catch { el.trophyCard.innerHTML = `<span>Trophy activity is unavailable.</span>`; }
  module.hidden = state.layout.hidden.includes("trophies");
}
function notifyAchievementProviderIssues(psnData = {}, steamData = {}, xboxData = {}) { if (!state.canEdit) return; const issues = [psnData.authError ? "PSN token needs refreshing." : psnData.needsSetup ? "PSN needs setup." : "", steamData.authError ? "Steam achievements need attention." : steamData.needsSetup ? "Steam achievements need setup." : "", xboxData.authError ? "Xbox achievements need attention." : xboxData.needsSetup ? "Xbox achievements need setup." : ""].filter(Boolean); const key = issues.join("|"); if (!key || state.achievementNoticeKey === key) return; state.achievementNoticeKey = key; showToast(issues.join(" "), "error"); }
async function fetchShelfSteamActivity(forceRefresh = state.gamelistSettings.forceCacheOnLoad === true) {
  const user = state.gamelistSettings.steamUser || "";
  if (!user) return { achievements: [], games: [], completed: [], totalEarned: 0, sourceUrl: "" };
  const games = []; let cursor = 0;
  for (let page = 0; page < 20 && cursor !== null; page += 1) {
    const params = achievementParams({ activity: "1", cursor: String(cursor), limit: "20", user }, forceRefresh);
    const response = await fetch(`/api/steam-achievements?${params}`); const data = await response.json();
    if (!response.ok || data.error || data.needsSetup || data.authError) {
      if (!games.length) return { achievements: [], games: [], completed: [], totalEarned: 0, sourceUrl: /^https?:/i.test(user) ? user : `https://steamcommunity.com/id/${encodeURIComponent(user)}/games/?tab=all`, needsSetup: Boolean(data.needsSetup), authError: Boolean(data.authError || data.error || !response.ok), error: data.error || "" };
      break;
    }
    games.push(...(data.games || [])); cursor = data.nextCursor !== null && Number.isFinite(Number(data.nextCursor)) ? Number(data.nextCursor) : null;
  }
  const achievements = games.flatMap((game) => (game.achievements || []).filter((item) => item.earned && item.earnedAt).map((item) => ({ ...item, title: item.title || "Achievement unlocked", game: game.name, platform: "Steam", source: "steam", rawEarnedAt: item.rawEarnedAt || item.earnedAt, icon: item.icon || platformLogo("Steam") })));
  const completed = games.filter((game) => (game.achievements || []).length && (game.achievements || []).every((item) => item.earned)).map((game) => { const latest = [...game.achievements].filter((item) => item.earned).sort((a, b) => (Date.parse(b.rawEarnedAt || b.earnedAt || 0) || 0) - (Date.parse(a.rawEarnedAt || a.earnedAt || 0) || 0))[0]; const local = activityLocalGameForTitle(game.name, state.gamelistGames); return { title: game.name, cover: activityCoverOverride(game.name) || local?.cover || (game.appId ? `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${encodeURIComponent(game.appId)}/library_600x900.jpg` : ""), trophyName: "100% Achievements", trophyIcon: game.imgIconUrl ? `https://media.steampowered.com/steamcommunity/public/images/apps/${game.appId}/${game.imgIconUrl}.jpg` : platformLogo("Steam"), platform: "Steam", earnedAt: latest?.earnedAt || "", rawEarnedAt: latest?.rawEarnedAt || latest?.earnedAt || "" }; });
  return { achievements, games, completed, totalEarned: games.reduce((sum, game) => sum + (game.achievements || []).filter((item) => item.earned).length, 0), sourceUrl: /^https?:/i.test(user) ? user : `https://steamcommunity.com/id/${encodeURIComponent(user)}/games/?tab=all` };
}
async function fetchShelfXboxActivity(forceRefresh = state.gamelistSettings.forceCacheOnLoad === true) {
  const params = achievementParams({ schema: "2" }, forceRefresh); if (state.gamelistSettings.microsoftUser) params.set("user", state.gamelistSettings.microsoftUser);
  const response = await fetch(`/api/xbox-achievements?${params}`); const data = await response.json();
  if (data.needsSetup) return { achievements: [], games: [], completed: [], totalEarned: 0, sourceUrl: data.sourceUrl || "https://xbl.io/", needsSetup: true, error: data.error || "" };
  if (!response.ok || data.error || data.authError) return { achievements: [], games: [], completed: [], totalEarned: 0, sourceUrl: data.sourceUrl || "https://xbl.io/", authError: Boolean(data.authError || data.error || !response.ok), error: data.error || "" };
  return { achievements: data.achievements || [], games: data.games || [], completed: data.completed || [], totalEarned: Number(data.totalEarned || 0), sourceUrl: data.sourceUrl || "" };
}
function achievementParams(values = {}, forceRefresh = state.gamelistSettings.forceCacheOnLoad === true) { const params = new URLSearchParams(values); params.set("lang", currentLanguage()); if (forceRefresh) params.set("fresh", String(Date.now())); return params; }
function achievementSettingsKey(settings = state.gamelistSettings) { return [String(settings.psnUser || "").trim(), String(settings.steamUser || "").trim(), String(settings.microsoftUser || "").trim()].join("|"); }
function readAchievementCache(key) { try { const cached = JSON.parse(localStorage.getItem(ACHIEVEMENT_CACHE_KEY) || "{}"); if (!cached?.updatedAt || (Date.now() - Number(cached.updatedAt)) > ACHIEVEMENT_CACHE_TTL_MS) return null; if (cached?.key === key && hasAchievementProviderIssue(cached.data)) { localStorage.removeItem(ACHIEVEMENT_CACHE_KEY); return null; } return cached?.key === key && cached.data ? cached.data : null; } catch { return null; } }
function writeAchievementCache(key, data) { try { if (hasAchievementProviderIssue(data)) { const cached = JSON.parse(localStorage.getItem(ACHIEVEMENT_CACHE_KEY) || "{}"); if (cached?.key === key) localStorage.removeItem(ACHIEVEMENT_CACHE_KEY); return; } localStorage.setItem(ACHIEVEMENT_CACHE_KEY, JSON.stringify({ key, data, updatedAt: Date.now() })); } catch {} }
function hasAchievementProviderIssue(data = {}) { return Boolean(data?.psn?.authError || data?.psn?.needsSetup || data?.steam?.authError || data?.steam?.needsSetup || data?.xbox?.authError || data?.xbox?.needsSetup); }
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
      const params = new URLSearchParams({ q: item.title, lang: currentLanguage(), v: "4" });
      const response = await fetch(`/api/search?${params}`);
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
  const platforms = orderedPlatforms(uniqueSorted(items.map((item) => completedPlatformFor(item.platform))));
  if (state.completedYear !== "all" && !years.includes(state.completedYear)) state.completedYear = "all";
  if (state.completedPlatform !== "all" && !platforms.includes(state.completedPlatform)) state.completedPlatform = "all";
  const direction = state.completedDirection === "asc" ? 1 : -1;
  const visible = items.filter((item) => (state.completedYear === "all" || completedYearFor(item) === state.completedYear) && (state.completedPlatform === "all" || completedPlatformFor(item.platform) === state.completedPlatform)).sort((a, b) => state.completedSort === "name" ? direction * a.title.localeCompare(b.title) : direction * ((Date.parse(a.rawEarnedAt || a.earnedAt || 0) || 0) - (Date.parse(b.rawEarnedAt || b.earnedAt || 0) || 0)));
  el.completedTitle.innerHTML = `${trophyIcon()} <span>${escapeHtml(tt("COMPLETED"))}</span>`;
  el.completedCount.textContent = tt("{count} completed", { count: visible.length });
  el.completedYear.innerHTML = `<option value="all">${escapeHtml(tt("All"))}</option>${years.map((year) => `<option value="${year}">${year}</option>`).join("")}`;
  el.completedYear.value = state.completedYear;
  el.completedPlatform.innerHTML = `<option value="all">${escapeHtml(tt("All"))}</option>${platforms.map((platform) => `<option value="${escapeHtml(platform)}">${escapeHtml(platformDisplayName(platform))}</option>`).join("")}`;
  el.completedPlatform.value = state.completedPlatform;
  el.completedSort.value = state.completedSort;
  el.completedDialog.querySelector(".platinum-year-select > span").textContent = tt("Year");
  el.completedDialog.querySelector(".platinum-platform-select > span").textContent = tt("Platform");
  el.completedDialog.querySelector(".platinum-order-label > span").textContent = tt("Order");
  [...el.completedSort.options].forEach((option) => { option.textContent = tt(option.value === "time" ? "Time" : "Name"); });
  el.completedDirection.innerHTML = sortArrowIcon(state.completedDirection === "desc");
  el.completedDirection.title = tt(state.completedDirection === "desc" ? "Sort descending" : "Sort ascending");
  el.completedDirection.setAttribute("aria-label", el.completedDirection.title);
  el.completedDirection.classList.toggle("desc", state.completedDirection === "desc");
  syncViewModeButton(el.completedView, state.completedView, { gridIcon, linesIcon });
  el.completedView.title = tt(state.completedView === "list" ? "List view" : "Grid view");
  el.completedView.setAttribute("aria-label", el.completedView.title);
  syncStyledSelects(el.completedDialog, { activeValue: null });
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
  syncCollectionCondition(el.conditionFields, changed);
}
function conditionFromInputs() { return Object.fromEntries(Object.entries(el.conditionFields).map(([key, input]) => [key, input.checked])); }
function splitValues(value) { return String(value || "").split(",").map((item) => item.trim()).filter(Boolean); }
function cleanTransferTags(tags) { return Array.isArray(tags) ? tags.filter((tag) => String(tag || "").trim().toLowerCase() !== "gamelist") : []; }
function formatMoney(value, currency = "USD") {
  const number = Number(value);
  const amount = Number.isFinite(number) ? number.toFixed(2) : "0.00";
  if (currency === "GBP") return `£${amount}`;
  if (currency === "JPY") return `¥${Math.round(Number.isFinite(number) ? number : 0).toLocaleString("en")}`;
  return currency === "USD" ? `$${amount}` : `${amount}€`;
}

function formatWholeMoney(value, currency = "USD") {
  const amount = Number.isFinite(Number(value)) ? Number(value) : 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: /^[A-Z]{3}$/.test(currency) ? currency : "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function collectionPriceParams(game, settings = normalizePriceSettings(state.gamelistSettings)) {
  const params = new URLSearchParams({ title: game.title || "", platform: shortPlatform(game.platform), region: game.country || game.region || "", currency: settings.currency });
  const priceChartingValue = String(game.pricechartingId || "").trim();
  const productUrl = priceChartingPageUrl(priceChartingValue);
  const productId = priceChartingProductId(priceChartingValue);
  if (productUrl) params.set("url", productUrl);
  else if (productId) params.set("id", productId);
  else if (game.upc) params.set("upc", game.upc);
  return params;
}

function collectionPriceKey(game) {
  const condition = conditionLabel(game);
  if (condition === "Sealed") return "sealed";
  if (condition.startsWith("Complete")) return "complete";
  return "loose";
}

function collectionValueFor(game) {
  const prices = game?.collectionPrices || {};
  const key = collectionPriceKey(game);
  const value = prices[key] ?? game?.price;
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function applyManualCollectionValue(game, rawValue, existing = null) {
  const price = numberOrNull(rawValue);
  if (!Number.isFinite(price) || price <= 0) return;
  const key = collectionPriceKey(game);
  const currency = currencyForManualPrice(rawValue);
  const today = new Date().toISOString().slice(0, 10);
  const previousHistory = Array.isArray(existing?.priceHistory) ? existing.priceHistory : [];
  const history = previousHistory
    .map((item) => ({ ...item, value: numberOrNull(item.value) }))
    .filter((item) => Number.isFinite(item.value));
  const last = history.at(-1);
  const nextPoint = { date: today, value: price };
  const nextHistory = last && last.date === today
    ? [...history.slice(0, -1), nextPoint]
    : (last && Number(last.value) === price ? history : [...history, nextPoint]);
  game.collectionPrices = { ...(game.collectionPrices || {}), [key]: price };
  game.price = price;
  game.priceCurrency = currency;
  game.priceFetchedAt = game.priceFetchedAt || new Date().toISOString();
  game.priceHistory = nextHistory.slice(-60);
}

function currencyForManualPrice(value) {
  const text = String(value || "");
  if (text.includes("$")) return "USD";
  if (text.includes("£")) return "GBP";
  if (text.includes("¥") || text.includes("円")) return "JPY";
  if (text.includes("€")) return "EUR";
  return normalizePriceSettings(state.gamelistSettings).currency || "USD";
}

function normalizePriceLabel(value, currency = "USD") {
  const symbol = ({ USD: "$", GBP: "£", JPY: "¥", EUR: "€" })[currency] || "€";
  if (!value) return `- ${symbol}`;
  if (currency === "GBP" || currency === "JPY") return String(value).trim();
  if (!value) return currency === "USD" ? "- $" : "- €";
  const text = String(value).trim();
  return currency === "USD" ? text : text.replace(/€\s*([0-9][0-9.,]*)/g, "$1€").replace(/\bEUR\s*([0-9][0-9.,]*)/gi, "$1€");
}
function normalizedStoreLinks(game = {}) {
  const slots = { playstation: "", nintendo: "", steam: "", xbox: "", hltb: "", igdb: "" };
  const source = game.storeLinks && typeof game.storeLinks === "object" ? game.storeLinks : {};
  Object.keys(slots).forEach((key) => { slots[key] = cleanUrl(source[key]); });
  for (const link of (Array.isArray(game.websites) ? game.websites : [])) mergeLinkSlot(slots, link);
  if (game.hltbUrl || game.howLongToBeatUrl) slots.hltb = cleanUrl(game.hltbUrl || game.howLongToBeatUrl);
  if (game.igdbUrl) slots.igdb = cleanUrl(game.igdbUrl);
  return slots;
}
function editorStoreLinks() {
  return {
    playstation: cleanUrl(el.fields.playstationUrl.value),
    nintendo: cleanUrl(el.fields.nintendoUrl.value),
    steam: cleanUrl(el.fields.steamUrl.value),
    xbox: cleanUrl(el.fields.xboxUrl.value),
    hltb: cleanUrl(el.fields.hltbUrl.value),
    igdb: cleanUrl(el.fields.igdbUrl.value),
  };
}
function fillStoreLinkFields(links = {}) {
  const normalized = normalizedStoreLinks({ storeLinks: links });
  if (normalized.playstation && !el.fields.playstationUrl.value) el.fields.playstationUrl.value = normalized.playstation;
  if (normalized.nintendo && !el.fields.nintendoUrl.value) el.fields.nintendoUrl.value = normalized.nintendo;
  if (normalized.steam && !el.fields.steamUrl.value) el.fields.steamUrl.value = normalized.steam;
  if (normalized.xbox && !el.fields.xboxUrl.value) el.fields.xboxUrl.value = normalized.xbox;
  if (normalized.hltb && !el.fields.hltbUrl.value) el.fields.hltbUrl.value = normalized.hltb;
}
function mergeWebsiteIntoSlots(link) {
  const slots = editorStoreLinks();
  mergeLinkSlot(slots, link);
  el.fields.playstationUrl.value = slots.playstation;
  el.fields.nintendoUrl.value = slots.nintendo;
  el.fields.steamUrl.value = slots.steam;
  el.fields.xboxUrl.value = slots.xbox;
  el.fields.hltbUrl.value = slots.hltb;
  el.fields.igdbUrl.value = slots.igdb;
}
function mergeLinkSlot(slots, link) {
  const url = cleanUrl(link);
  if (!url) return;
  const key = linkSlot(url);
  if (key && !slots[key]) slots[key] = url;
}
function linkSlot(value) {
  const host = (() => { try { return new URL(value).hostname.toLowerCase(); } catch { return ""; } })();
  if (host.includes("playstation")) return "playstation";
  if (host.includes("nintendo")) return "nintendo";
  if (host.includes("steampowered")) return "steam";
  if (host.includes("xbox")) return "xbox";
  if (host.includes("howlongtobeat")) return "hltb";
  if (host.includes("igdb")) return "igdb";
  return "";
}
function legacyWebsiteLinks(game) {
  return (Array.isArray(game?.websites) ? game.websites : []).filter((link) => !linkSlot(link));
}
function websiteLinks(game) {
  const links = storeLinksWithFallbacks(game);
  const providers = platformStoreProvidersForGame(game);
  return [
    providers.includes("PlayStation") ? links.playstation : "",
    providers.includes("Nintendo") ? links.nintendo : "",
    providers.includes("Steam") ? links.steam : "",
    providers.includes("Xbox") ? links.xbox : "",
    links.hltb,
  ].filter(Boolean);
}
function storeLinkButtons(game, links = websiteLinks(game)) {
  const buttons = links.map((link) => ({ label: linkLabel(link), url: link, cls: siteClass(link), icon: siteIcon(link) }));
  return storeButtonsMarkup(buttons, escapeHtml);
}
function storeLinksWithFallbacks(game) {
  const links = normalizedStoreLinks(game);
  const q = encodeURIComponent(retailTitle(game.title));
  const region = normalizePriceSettings(state.gamelistSettings).region;
  return {
    playstation: links.playstation || playStationSearchUrl(q, region),
    nintendo: links.nintendo || nintendoSearchUrl(q, region),
    steam: links.steam || `https://store.steampowered.com/search/?term=${q}`,
    xbox: links.xbox || xboxSearchUrl(q, region),
    hltb: links.hltb || hltbUrlFor(game),
  };
}
function platformStoreProvidersForGame(game) {
  const platform = normalize(shortPlatform(game.platform));
  if (/switch|nintendo|3ds|ds|wii|gamecube|n64|game boy|gba|gbc/.test(platform)) return ["Nintendo"];
  if (/ps[1-5]|playstation|psp|vita/.test(platform)) return ["PlayStation"];
  if (/steam|\bpc\b/.test(platform)) return ["Steam"];
  if (/xbox|x360|xone|series/.test(platform)) return ["Xbox"];
  return [];
}
function priceProvidersForGame(game) {
  return game.digital || isXboxStoreGame(game) ? pricePlatformStoreProvidersForGame(game) : physicalStoreProviders();
}
function isXboxStoreGame(game) {
  return ["Xbox PC", "Xbox Series", "X360", "XOne", "Xbox"].includes(shortPlatform(game?.platform));
}
function pricePlatformStoreProvidersForGame(game) {
  const platform = shortPlatform(game.platform);
  if (platform === "Switch" || platform === "Switch 2") return [nintendoStoreName()];
  if (platform === "PS4" || platform === "PS5") return [playStationStoreName()];
  if (platform === "Steam") return ["Steam"];
  if (["Xbox PC", "Xbox Series", "X360", "XOne", "Xbox"].includes(platform)) return ["Xbox"];
  return [];
}
function physicalStoreProviders() {
  return normalizePriceSettings(state.gamelistSettings).stores.map((store) => store === "Amazon" ? amazonStoreName() : store);
}
function normalizedPrices(game) {
  const existing = new Map([...(game.prices || []), ...(game.storePrices || [])].map((price) => [price.store, price]));
  return priceProvidersForGame(game).map((store) => existing.get(store) || fallbackPriceLinks(game).find((item) => item.store === store));
}
function pricesFor(game) {
  return storePricesMarkup(normalizedPrices(game), normalizePriceSettings(state.gamelistSettings).currency);
}
function fallbackPriceLinks(game) {
  const q = encodeURIComponent(`${retailTitle(game.title)} ${shortPlatform(game.platform)}`.trim());
  const settings = normalizePriceSettings(state.gamelistSettings);
  if (game.digital || isXboxStoreGame(game)) {
    const providers = priceProvidersForGame(game);
    return [
      { store: nintendoStoreName(), url: nintendoSearchUrl(q, settings.region) },
      { store: playStationStoreName(), url: playStationSearchUrl(q, settings.region) },
      { store: "Steam", url: `https://store.steampowered.com/search/?term=${q}` },
      { store: "Xbox", url: xboxSearchUrl(q, settings.region) },
    ].filter((link) => providers.includes(link.store));
  }
  return [
    { store: amazonStoreName(settings.region), url: amazonSearchUrl(q, settings.region) },
    { store: "eBay", url: ebaySearchUrl(q, settings.region) },
    { store: "Xtralife", url: `https://www.xtralife.com/buscar/${q}` },
    { store: "GAME.es", url: `https://www.game.es/buscar/${q}` },
    { store: "Retro Island NY", url: `https://retroislandny.com/search?q=${q}&country=${settings.region}&currency=${settings.currency}` },
    { store: "GameStop", url: `https://www.gamestop.com/search/?q=${q}` },
    { store: "Walmart", url: `https://www.walmart.com/search?q=${q}` },
  ];
}
function amazonStoreName(region = normalizePriceSettings(state.gamelistSettings).region) {
  const regional = {
    US: "Amazon.com", UK: "Amazon.co.uk", IT: "Amazon.it", IE: "Amazon.ie", FR: "Amazon.fr", JP: "Amazon.co.jp", MX: "Amazon.com.mx",
  }[region];
  if (regional) return regional;
  if (region === "US") return "Amazon.com";
  if (region === "UK") return "Amazon.co.uk";
  if (region === "IT") return "Amazon.it";
  return "Amazon.es";
}
function nintendoStoreName(region = normalizePriceSettings(state.gamelistSettings).region) {
  const regional = {
    US: "Nintendo US", UK: "Nintendo UK", IT: "Nintendo Italia", IE: "Nintendo Ireland", FR: "Nintendo France", PT: "Nintendo Portugal", JP: "Nintendo Japan", MX: "Nintendo Mexico",
  }[region];
  if (regional) return regional;
  if (region === "US") return "Nintendo US";
  if (region === "UK") return "Nintendo UK";
  if (region === "IT") return "Nintendo Italia";
  return "Nintendo Espana";
}
function playStationStoreName(region = normalizePriceSettings(state.gamelistSettings).region) {
  const regional = {
    US: "PlayStation US", UK: "PlayStation UK", IT: "PlayStation Italia", IE: "PlayStation Ireland", FR: "PlayStation France", PT: "PlayStation Portugal", JP: "PlayStation Japan", MX: "PlayStation Mexico",
  }[region];
  if (regional) return regional;
  if (region === "US") return "PlayStation US";
  if (region === "UK") return "PlayStation UK";
  if (region === "IT") return "PlayStation Italia";
  return "PlayStation Espana";
}
function retailTitle(title) {
  return String(title || "").replace(/[™®]/g, "").replace(/[^\p{L}\p{N}]+/gu, " ").replace(/\s+/g, " ").trim();
}
function hltbUrlFor(game) {
  const direct = cleanUrl(game.hltbUrl || game.howLongToBeatUrl || game.storeLinks?.hltb);
  if (direct) return direct;
  const id = String(game.hltbId || game.howLongToBeatId || "").trim();
  if (/^\d+$/.test(id)) return `https://howlongtobeat.com/game/${encodeURIComponent(id)}`;
  const query = retailTitle(game.title);
  return query ? `https://howlongtobeat.com/?q=${encodeURIComponent(query)}` : "";
}
function amazonSearchUrl(query, region = "ES") {
  const regionalHost = {
    US: "www.amazon.com", UK: "www.amazon.co.uk", IT: "www.amazon.it", IE: "www.amazon.ie", FR: "www.amazon.fr", JP: "www.amazon.co.jp", MX: "www.amazon.com.mx",
  }[region];
  if (regionalHost) return `https://${regionalHost}/s?k=${query}`;
  if (region === "US") return `https://www.amazon.com/s?k=${query}`;
  if (region === "UK") return `https://www.amazon.co.uk/s?k=${query}`;
  if (region === "IT") return `https://www.amazon.it/s?k=${query}`;
  return `https://www.amazon.es/s?k=${query}`;
}
function ebaySearchUrl(query, region = "ES") {
  const host = ({ US: "www.ebay.com", UK: "www.ebay.co.uk", IT: "www.ebay.it", IE: "www.ebay.ie", FR: "www.ebay.fr", JP: "www.ebay.com", MX: "www.ebay.com" })[region] || "www.ebay.es";
  return `https://${host}/sch/i.html?_nkw=${query}&LH_BIN=1`;
}
function nintendoSearchUrl(query, region = "ES") {
  const locale = ({ US: "us", UK: "en-gb", IE: "en-gb", IT: "it-it", FR: "fr-fr", PT: "pt-pt", JP: "jp", MX: "es-mx" })[region];
  if (locale === "fr-fr") return `https://www.nintendo.com/fr-fr/Rechercher/Rechercher-299117.html?q=${query}`;
  if (locale === "pt-pt") return `https://www.nintendo.com/pt-pt/Pesquisar/Pesquisar-299117.html?q=${query}`;
  if (locale === "jp") return `https://www.nintendo.com/jp/search/?q=${query}`;
  if (locale === "es-mx") return `https://www.nintendo.com/es-mx/search/?q=${query}`;
  if (locale === "en-gb") return `https://www.nintendo.com/en-gb/Search/Search-299117.html?q=${query}`;
  if (region === "US") return `https://www.nintendo.com/us/search/?q=${query}`;
  if (region === "UK") return `https://www.nintendo.com/en-gb/Search/Search-299117.html?q=${query}`;
  if (region === "IT") return `https://www.nintendo.com/it-it/Cerca/Cerca-299117.html?q=${query}`;
  return `https://www.nintendo.com/es-es/Buscar/Buscar-299117.html?q=${query}&f=147394-86`;
}
function playStationSearchUrl(query, region = "ES") {
  const locale = ({ US: "en-us", UK: "en-gb", IE: "en-ie", IT: "it-it", FR: "fr-fr", PT: "pt-pt", JP: "ja-jp", MX: "es-mx" })[region];
  if (locale) return `https://www.playstation.com/${locale}/search/?q=${query}`;
  if (region === "US") return `https://www.playstation.com/en-us/search/?q=${query}`;
  if (region === "UK") return `https://www.playstation.com/en-gb/search/?q=${query}`;
  if (region === "IT") return `https://www.playstation.com/it-it/search/?q=${query}`;
  return `https://www.playstation.com/es-es/search/?q=${query}`;
}
function xboxSearchUrl(query, region = "ES") {
  const locale = ({ US: "en-US", UK: "en-GB", IE: "en-IE", IT: "it-IT", FR: "fr-FR", PT: "pt-PT", JP: "ja-JP", MX: "es-MX" })[region] || "es-ES";
  return `https://www.xbox.com/${locale}/search?q=${query}`;
}
function cleanUrl(value) {
  const url = String(value || "").trim();
  return /^https?:\/\//i.test(url) ? url : "";
}

function twitchChannelUrl(value) {
  const user = String(value || "").trim().replace(/^@/, "").replace(/[^A-Za-z0-9_]/g, "").slice(0, 25);
  return user ? `https://www.twitch.tv/${encodeURIComponent(user)}` : "";
}
function metadataHltbUrl(result = {}) {
  const direct = cleanUrl(result.hltbUrl || result.howLongToBeatUrl);
  if (direct) return direct;
  const id = String(result.hltbId || result.howLongToBeatId || "").trim();
  return /^\d+$/.test(id) ? `https://howlongtobeat.com/game/${encodeURIComponent(id)}` : "";
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
  return label === "howlongtobeat" ? "store-hltb" : label ? `store-${label}` : "";
}
function siteIcon(value) { const host = (() => { try { return new URL(value).hostname; } catch { return ""; } })(); if (host.includes("playstation")) return "assets/sites/playstation.png"; if (host.includes("nintendo")) return "assets/sites/nintendo.png"; if (host.includes("steam")) return "assets/sites/steam.png"; if (host.includes("howlongtobeat")) return "assets/sites/howlongtobeat.png"; return host ? `https://${host}/favicon.ico` : "assets/Icon.png"; }
function renderSavedStorePrices(game) {
  const settings = normalizePriceSettings(state.gamelistSettings);
  const prices = Array.isArray(game.storePrices) && game.storePrices.length ? game.storePrices : placeholderStorePrices(settings);
  const currency = game.storePriceCurrency || settings.currency;
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
function placeholderStorePrices(settings = normalizePriceSettings(state.gamelistSettings)) {
  return settings.stores.map((store) => ({ store, price: "", numericPrice: null, url: "" }));
}
function storeIcon(store) { const normalizedStore = normalizeTag(store); if (isPlayasiaStore(store)) return "assets/stores/playasia.ico"; if (String(store).startsWith("Amazon")) return "assets/stores/amazon.ico"; if (store === "eBay") return "https://www.ebay.com/favicon.ico"; if (isKickstarterStore(store)) return "https://www.kickstarter.com/favicon.ico"; if (store === "Xtralife") return "assets/stores/xtralife.ico"; if (store === "GAME.es") return "assets/stores/game.ico"; if (store === "Retro Island NY") return "assets/stores/retroisland.png"; if (normalizedStore === "limitedrun" || normalizedStore === "limitedrungames" || normalizedStore === "lrg") return "assets/stores/limited-run-games.png"; if (["squareenix", "squareenixstore", "sqex", "sqexstore"].includes(normalizedStore.replace(/[^a-z0-9]/g, ""))) return "assets/stores/square-enix-store.png"; if (store === "GameStop") return "https://www.gamestop.com/favicon.ico"; if (store === "Walmart") return "https://www.walmart.com/favicon.ico"; if (String(store).startsWith("Nintendo")) return "assets/sites/nintendo.png"; if (String(store).startsWith("PlayStation")) return "assets/sites/playstation.png"; if (store === "Steam") return "assets/sites/steam.png"; if (store === "Xbox") return "assets/platforms/xbox.png"; return "assets/Icon.png"; }
function isKickstarterStore(store) { return ["kickstarter", "kickstater", "kicstarter", "kickstart"].includes(normalizeTag(store).replace(/[^a-z0-9]+/g, "")); }
function renderPriceDetails(game) {
  const prices = game.collectionPrices || {};
  const rows = [["Loose", prices.loose], ["Complete", prices.complete], ["Sealed", prices.sealed]].filter(([, value]) => value != null);
  const currency = game.priceCurrency || "USD";
  const identifiers = [["UPC", game.upc], ["SKU", game.sku], ["ASIN", game.asin], ["eBay ID", game.epid]].filter(([, value]) => value);
  const productUrl = game.collectionProductUrl || priceChartingPageUrl(game.pricechartingId);
  const priceChartingUrl = productUrl || priceChartingSearchUrl(game);
  const priceMarkup = rows.length ? `<div class="collection-price-grid">${rows.map(([label, value]) => productUrl ? `<a href="${escapeHtml(productUrl)}" target="_blank" rel="noreferrer"><small>${escapeHtml(tt(label))}</small><strong>${formatMoney(value, currency)}</strong></a>` : `<span><small>${escapeHtml(tt(label))}</small><strong>${formatMoney(value, currency)}</strong></span>`).join("")}</div>` : `<a class="collection-price-empty" href="${escapeHtml(priceChartingUrl)}" target="_blank" rel="noreferrer">${escapeHtml(tt("No collection value fetched yet."))}</a>`;
  const identifierMarkup = identifiers.length ? `<div class="collection-product-meta">${identifiers.map(([label, value]) => `<span><small>${label}</small><strong>${escapeHtml(value)}</strong></span>`).join("")}</div>` : "";
  el.detailPriceSummary.innerHTML = `${priceMarkup}${identifierMarkup}`;
  const collectionValue = collectionValueFor(game);
  el.detailPriceHeadline.textContent = Number.isFinite(collectionValue) ? formatMoney(collectionValue, currency) : "";
  const history = game.priceHistory || [];
  el.detailPriceGraph.innerHTML = priceGraph(history, currency);
  el.detailPriceGraph.hidden = history.length < 1;
  syncFetchValueButton();
}
function syncFetchValueButton(label = "Fetch value") {
  el.fetchValue.innerHTML = currencyIcon();
  el.fetchValue.title = tt(label);
  el.fetchValue.setAttribute("aria-label", tt(label));
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
  if (!state.canEdit || !shelfPricesVisible()) return;
  const game = state.games.find((item) => item.id === el.detailDialog.dataset.id); if (!game) return;
  el.fetchValue.disabled = true; syncFetchValueButton("Fetching value");
  showToast("Fetching collection value...");
  try {
    const settings = normalizePriceSettings(state.gamelistSettings);
    const params = collectionPriceParams(game, settings);
    const response = await fetch(`/api/collection-price?${params}`);
    const data = await response.json();
    if (!response.ok || data.error) el.detailPriceSummary.innerHTML = `<span class="auth-error">${escapeHtml(data.error || "No matching physical edition was found.")}</span>`;
    else applyCollectionPrice(game, data);
    el.detailStorePrices.innerHTML = `<span class="muted">Checking store prices...</span>`;
    await fetchAndSaveStorePrices(game).catch((error) => { el.detailStorePrices.innerHTML = `<span class="auth-error">${escapeHtml(error?.message || "Store prices unavailable.")}</span>`; });
    await persistShelf();
    if (!data.error && response.ok) renderPriceDetails(game);
    renderSavedStorePrices(game);
    renderStats();
    showToast(tt(response.ok && !data.error ? "Collection value updated." : "Store prices checked."));
  } catch (error) { el.detailPriceSummary.innerHTML = `<span class="auth-error">${escapeHtml(error?.message || tt("Collection value is unavailable."))}</span>`; showToast(tt("Collection value is unavailable."), "error"); } finally { el.fetchValue.disabled = false; syncFetchValueButton(); }
}

function applyCollectionPrice(game, data) {
  const historyKey = collectionPriceKey(game);
  const nextPrice = data.prices?.[historyKey] ?? data.mainValue;
  if (!Number.isFinite(Number(nextPrice)) || Number(nextPrice) <= 0) return false;
  game.collectionPrices = { ...(game.collectionPrices || {}), ...(data.prices || {}) };
  game.price = nextPrice;
  game.priceCurrency = data.currency || "USD";
  if (data.productUrl || (!game.pricechartingId && data.productId)) game.pricechartingId = data.productUrl || data.productId;
  game.collectionProductUrl = data.productUrl || game.collectionProductUrl || priceChartingPageUrl(game.pricechartingId);
  game.priceFetchedAt = data.checkedAt || new Date().toISOString();
  game.priceHistory = (data.history?.[historyKey]?.length ? data.history[historyKey] : [...(game.priceHistory || []), { date: String(data.checkedAt || "").slice(0, 10), value: game.price }]).filter((item) => item.value != null).slice(-60);
  game.updatedAt = new Date().toISOString();
  syncShelfGameRecord(game);
  return true;
}

function hasCollectionPriceValue(data) {
  return Object.values(data?.prices || {}).some((value) => Number.isFinite(Number(value)) && Number(value) > 0)
    || (Number.isFinite(Number(data?.mainValue)) && Number(data.mainValue) > 0);
}
function syncShelfGameRecord(game) {
  const clean = stripRuntimeFields(game);
  const index = state.additions.findIndex((item) => item.id === game.id);
  if (game.sourceRecord) state.overrides[game.id] = clean;
  else if (index >= 0) state.additions[index] = clean;
}
async function loadShelfTrophies(game) {
  game = shelfTrophyLookupGame(game);
  if (!shelfAllowsTrophyActivity(game.platform)) { el.detailTrophies.hidden = true; el.detailTrophyPercent.innerHTML = ""; return; }
  const isSteamGame = shelfIsSteamAchievementGame(game);
  if (isSteamGame && !steamAppIdForShelfGame(game)) { el.detailTrophies.hidden = true; el.detailTrophyPercent.innerHTML = ""; el.detailTrophyList.innerHTML = ""; return; }
  const external = externalActivityFor(game);
  if (external) {
    el.detailTrophies.hidden = false;
    el.detailTrophyTitle.textContent = tt("ACHIEVEMENTS");
    el.detailTrophyCount.textContent = "";
    if (external.loading) {
      el.detailTrophyPercent.innerHTML = "";
      el.detailTrophyList.innerHTML = `<div class="detail-trophy-empty">${escapeHtml(tt("Loading earned achievements..."))}</div>`;
      return;
    }
    if (isSteamGame && !external.achievements.length) { el.detailTrophies.hidden = true; el.detailTrophyPercent.innerHTML = ""; el.detailTrophyList.innerHTML = ""; return; }
    const progress = external.total ? Math.round((external.earned / external.total) * 100) : 0;
    el.detailTrophyPercent.innerHTML = external.total ? shelfProgressBadge({ progress, earned: external.earned, total: external.total }, { includeIcon: false, separator: true }) : "";
    el.detailTrophyList.innerHTML = external.achievements.length
      ? external.achievements.map((item) => `<article class="detail-trophy-card trophy-${trophyTone(item.type || item.rarity)} ${item.earned ? "earned" : "missing"}"><img src="${escapeHtml(item.icon || platformLogo(game.platform))}" alt=""><div><strong>${escapeHtml(item.title || "Achievement")}</strong><span>${escapeHtml([item.earned ? item.earnedAt || tt("Earned") : tt("Missing"), item.rarity].filter(Boolean).join(" · "))}</span>${item.description ? `<p>${escapeHtml(item.description)}</p>` : ""}</div></article>`).join("")
      : `<div class="detail-trophy-empty">No achievements found for this game yet.</div>`;
    return;
  }
  const match = activityGameFor(game);
  const id = match?.npCommunicationId || match?.id || "";
  if (!id) {
    const recent = (state.trophyActivity?.achievements || [])
      .filter((item) => activityTitleMatchScore(game.trophyName || game.title, item.game || item.title || "") >= 75)
      .sort((a, b) => Date.parse(b.rawEarnedAt || b.earnedAt || 0) - Date.parse(a.rawEarnedAt || a.earnedAt || 0));
    if (recent.length) {
      el.detailTrophies.hidden = false;
      el.detailTrophyTitle.textContent = tt("TROPHIES");
      el.detailTrophyCount.textContent = "";
      el.detailTrophyPercent.innerHTML = "";
      el.detailTrophyList.innerHTML = recent.map((item) => `<article class="detail-trophy-card trophy-${trophyTone(item.type || item.rarity)} ${item.earned ? "earned" : "missing"}"><img src="${escapeHtml(item.icon || "assets/platforms/playstation.png")}" alt=""><div><strong>${escapeHtml(item.title || "Trophy")}</strong><span>${escapeHtml([item.earned ? item.earnedAt || tt("Earned") : tt("Missing"), item.rarity].filter(Boolean).join(" · "))}</span>${item.description ? `<p>${escapeHtml(item.description)}</p>` : ""}</div></article>`).join("");
      return;
    }
    el.detailTrophies.hidden = true;
    el.detailTrophyPercent.innerHTML = "";
    return;
  }
  const cached = state.cardTrophies[id];
  const cachedTrophies = Array.isArray(cached?.allTrophies) && cached.allTrophies.length
    ? cached.allTrophies
    : Array.isArray(cached?.trophies) ? cached.trophies : [];
  if (cached && !cached.loading && cachedTrophies.length) {
    const earned = Number(cached.earned ?? cachedTrophies.filter((item) => item.earned).length);
    const total = Number(cached.total ?? cachedTrophies.length);
    const progress = total ? Math.round((earned / total) * 100) : 0;
    el.detailTrophies.hidden = false;
    el.detailTrophyTitle.textContent = tt("TROPHIES");
    el.detailTrophyCount.textContent = "";
    el.detailTrophyPercent.innerHTML = total ? shelfProgressBadge({ progress, earned, total }, { includeIcon: false, separator: true }) : "";
    el.detailTrophyList.innerHTML = cachedTrophies.map((item) => `<article class="detail-trophy-card trophy-${trophyTone(item.type || item.rarity)} ${item.earned ? "earned" : "missing"}"><img src="${escapeHtml(item.icon || "assets/platforms/playstation.png")}" alt=""><div><strong>${escapeHtml(item.title || "Trophy")}</strong><span>${escapeHtml([item.earned ? item.earnedAt || tt("Earned") : tt("Missing"), item.rarity].filter(Boolean).join(" · "))}</span>${item.description ? `<p>${escapeHtml(item.description)}</p>` : ""}</div></article>`).join("");
    refreshShelfPsnTrophiesInBackground(game, match, id, "shelf");
    return;
  }
  const activityTrophies = (state.trophyActivity?.achievements || [])
    .filter((item) => item.npCommunicationId === id || activityTitleMatchScore(game.trophyName || game.title, item.game || item.title || "") >= 75)
    .sort((a, b) => Date.parse(b.rawEarnedAt || b.earnedAt || 0) - Date.parse(a.rawEarnedAt || a.earnedAt || 0));
  if (activityTrophies.length) {
    el.detailTrophies.hidden = false;
    el.detailTrophyTitle.textContent = tt("TROPHIES");
    el.detailTrophyCount.textContent = "";
    el.detailTrophyPercent.innerHTML = "";
    el.detailTrophyList.innerHTML = activityTrophies.map((item) => `<article class="detail-trophy-card trophy-${trophyTone(item.type || item.rarity)} ${item.earned ? "earned" : "missing"}"><img src="${escapeHtml(item.icon || "assets/platforms/playstation.png")}" alt=""><div><strong>${escapeHtml(item.title || "Trophy")}</strong><span>${escapeHtml([item.earned ? item.earnedAt || tt("Earned") : tt("Missing"), item.rarity].filter(Boolean).join(" · "))}</span>${item.description ? `<p>${escapeHtml(item.description)}</p>` : ""}</div></article>`).join("");
    refreshShelfPsnTrophiesInBackground(game, match, id, "shelf");
    return;
  }
  el.detailTrophyTitle.textContent = tt("TROPHIES");
  el.detailTrophyPercent.innerHTML = "";
  el.detailTrophies.hidden = false; el.detailTrophyList.innerHTML = `<span>Loading trophies…</span>`;
  try { const params = achievementParams({ id, service: match.npServiceName || "trophy", user: state.gamelistSettings.psnUser || "" }); const response = await fetch(`/api/trophies?${params}`); const data = await response.json(); const trophies = data.trophies || []; const earned = trophies.filter((item) => item.earned).length; const total = trophies.length; const progress = total ? Math.round((earned / total) * 100) : 0; state.cardTrophies[id] = { loading: false, allTrophies: trophies, trophies: trophies.filter((item) => item.earned).sort((a, b) => Date.parse(b.rawEarnedAt || b.earnedAt || 0) - Date.parse(a.rawEarnedAt || a.earnedAt || 0)).slice(0, 3), earned, total }; refreshShelfProjectedActivity(game); el.detailTrophyCount.textContent = ""; el.detailTrophyPercent.innerHTML = total ? shelfProgressBadge({ progress, earned, total }, { includeIcon: false, separator: true }) : ""; el.detailTrophyList.innerHTML = trophies.map((item) => `<article class="detail-trophy-card trophy-${trophyTone(item.type)} ${item.earned ? "earned" : "missing"}"><img src="${escapeHtml(item.icon || "assets/platforms/playstation.png")}" alt=""><div><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml([item.earned ? item.earnedAt || tt("Earned") : tt("Missing"), item.rarity].filter(Boolean).join(" · "))}</span>${item.description ? `<p>${escapeHtml(item.description)}</p>` : ""}</div></article>`).join(""); } catch { el.detailTrophies.hidden = true; }
}

function shelfTrophyLookupGame(game) {
  const platform = canonicalShelfPlatform(game?.platform || "");
  const title = normalizeSearchText(game?.title || "");
  const linked = state.gamelistGames.find((item) => !item.deletedAt && (
    item.id === game?.gamelistId
    || item.shelfId === game?.id
    || (normalizeSearchText(item.title || "") === title && canonicalShelfPlatform(item.platform || "") === platform)
  ));
  if (!linked) return { ...game, platform };
  return {
    ...linked,
    ...game,
    id: game.id,
    platform: platform || canonicalShelfPlatform(linked.platform || ""),
    trophyName: game.trophyName || linked.trophyName || "",
    steamAppId: game.steamAppId || linked.steamAppId || "",
    storeLinks: { ...(linked.storeLinks || {}), ...(game.storeLinks || {}) },
  };
}
function shelfIsSteamAchievementGame(game) {
  const platform = normalize(shortPlatform(game?.platform || ""));
  return platform.includes("steam") || platform === "pc";
}
function pencilIcon() { return `<svg class="pencil-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4l11-11a2.8 2.8 0 0 0-4-4L4 16v4Z"></path><path d="M13.5 6.5l4 4"></path></svg>`; }
function trashIcon() { return `<svg class="trash-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18"></path><path d="M8 6V4h8v2"></path><path d="M19 6l-1 14H6L5 6"></path><path d="M10 11v5"></path><path d="M14 11v5"></path></svg>`; }
function pauseTrailerIcon() { return `<svg class="pause-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14"></path></svg>`; }
function playTrailerIcon() { return `<svg class="play-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 11 7-11 7Z"></path></svg>`; }
function checkIcon() { return `<svg class="check-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5 9.5 17 19 7"></path></svg>`; }
function backIcon() { return `<svg class="back-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M10 6 4 12l6 6"></path><path d="M4 12h10a6 6 0 0 1 6 6"></path></svg>`; }
function forwardIcon() { return `<svg class="forward-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m10 6-6 6 6 6"></path><path d="M4 12h10a6 6 0 0 1 6 6"></path></svg>`; }
function currencyIcon() { const currency = normalizePriceSettings(state.gamelistSettings).currency; if (currency === "USD") return `<svg class="dollar-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M16.8 7.2c-1.1-1-2.7-1.7-4.8-1.7-2.8 0-4.8 1.4-4.8 3.5 0 5.3 9.8 2.1 9.8 7 0 2.1-2 3.5-5 3.5-2.3 0-4.2-.8-5.4-2"></path><path d="M12 3v18"></path></svg>`; if (currency === "GBP") return `<svg class="pound-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 20h9"></path><path d="M7 13h8"></path><path d="M16.5 6.6A4.4 4.4 0 0 0 12.8 5C10.5 5 9 6.5 9 8.8V20"></path></svg>`; if (currency === "JPY") return `<svg class="yen-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4l6 8 6-8"></path><path d="M12 12v8"></path><path d="M8 12h8"></path><path d="M8 16h8"></path></svg>`; return `<svg class="euro-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M19 5.5A7 7 0 0 0 8.2 7.1 7.4 7.4 0 0 0 7 12a7.4 7.4 0 0 0 1.2 4.9A7 7 0 0 0 19 18.5"></path><path d="M4 10h10"></path><path d="M4 14h10"></path></svg>`; }
function trophyIcon() { return `<svg class="trophy-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4h8v4a4 4 0 0 1-8 0V4Z"></path><path d="M8 6H5a3 3 0 0 0 3 3"></path><path d="M16 6h3a3 3 0 0 1-3 3"></path><path d="M12 12v4"></path><path d="M9 20h6"></path><path d="M10 16h4v4h-4z"></path></svg>`; }
function coopIcon() { return `<svg class="coop-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="8" r="3"></circle><circle cx="16" cy="8" r="3"></circle><path d="M2.8 19c.4-4 2.1-6 5.2-6s4.8 2 5.2 6"></path><path d="M10.8 19c.4-4 2.1-6 5.2-6s4.8 2 5.2 6"></path></svg>`; }
function carouselArrowIcon(direction = "right") { return `<svg class="sort-arrow-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${direction === "left" ? "M15.5 5.5 9 12l6.5 6.5" : "M8.5 5.5 15 12l-6.5 6.5"}"></path></svg>`; }
function sortArrowIcon(desc = false) { return `<svg class="sort-arrow-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${desc ? "M12 5v14m-7-7 7 7 7-7" : "M12 19V5m-7 7 7-7 7 7"}"></path></svg>`; }
function linesIcon() { return `<svg class="view-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M5 12h14M5 17h14"></path></svg>`; }
function gridIcon() { return `<svg class="view-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="4.5" y="4.5" width="5.5" height="5.5"></rect><rect x="14" y="4.5" width="5.5" height="5.5"></rect><rect x="4.5" y="14" width="5.5" height="5.5"></rect><rect x="14" y="14" width="5.5" height="5.5"></rect></svg>`; }
function ownerBadge(owner) { return `<span class="owner-pill ${escapeHtml(ownerColorClass(owner))}">${escapeHtml(owner)}</span>`; }
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
function showToast(message, tone = "info") { if (!message) return; const host = [...document.querySelectorAll("dialog[open]")].at(-1) || document.body; let toast = document.querySelector(".toast-notification"); if (!toast) { toast = document.createElement("div"); toast.className = "toast-notification"; toast.setAttribute("role", "status"); toast.setAttribute("aria-live", "polite"); } if (toast.parentElement !== host) host.appendChild(toast); window.clearTimeout(showToast.timer); toast.textContent = message; toast.classList.toggle("is-error", tone === "error"); toast.classList.remove("visible"); requestAnimationFrame(() => toast.classList.add("visible")); showToast.timer = window.setTimeout(() => toast.classList.remove("visible"), tone === "error" ? 4200 : 2800); }
function registerServiceWorker() { if ("serviceWorker" in navigator) navigator.serviceWorker.register("/service-worker.js").catch(() => {}); }
async function checkSiteVersion() { try { await clearSiteCachesForNewHour(); const response = await fetch(`/version.json?t=${Date.now()}`, { cache: "no-store" }); if (!response.ok) return false; const remote = await response.json(); applySiteVersion(remote); const remoteVersion = siteVersion.version; if (!remoteVersion) return false; const current = localStorage.getItem(VERSION_STORAGE_KEY); if (!current || current === remoteVersion) { localStorage.setItem(VERSION_STORAGE_KEY, remoteVersion); return false; } if (!forceCacheOnLoadEnabled()) return false; await clearSiteCaches(); localStorage.setItem(VERSION_STORAGE_KEY, remoteVersion); window.location.reload(); return true; } catch { return false; } }
async function clearSiteCachesForNewHour() { const currentHour = currentCacheHour(); const previousHour = localStorage.getItem(CACHE_HOUR_STORAGE_KEY); if (!previousHour) { localStorage.setItem(CACHE_HOUR_STORAGE_KEY, currentHour); return; } if (previousHour === currentHour) return; await clearSiteCaches(); localStorage.setItem(CACHE_HOUR_STORAGE_KEY, currentHour); }
function currentCacheHour() { return new Date().toISOString().slice(0, 13); }
function forceCacheOnLoadEnabled() { try { return JSON.parse(localStorage.getItem("gamelist:settings:v1") || "{}")?.forceCacheOnLoad === true; } catch { return false; } }
function applySiteVersion(value = {}) { siteVersion.version = String(value.version || "").trim(); siteVersion.updatedAt = String(value.updatedAt || "").trim(); siteVersion.notificationVersion = Math.max(0, Math.floor(Number(value.notificationVersion) || 0)); }
async function maybeShowUpdatesPopup() {
  if (!state.canEdit || !siteVersion.notificationVersion) return;
  if (localStorage.getItem(UPDATES_NOTIFICATION_STORAGE_KEY) === String(siteVersion.notificationVersion)) return;
  if (!document.querySelector("#updatesDialog")) await loadUpdatesPopup();
  const dialog = document.querySelector("#updatesDialog");
  if (!state.canEdit || !dialog || dialog.open) return;
  openDialog(dialog);
  dialog.focus({ preventScroll: true });
}
async function loadUpdatesPopup() {
  if (!updatesPopupLoadPromise) {
    updatesPopupLoadPromise = fetch("/updates-popup.html", { cache: "no-store" })
      .then((response) => { if (!response.ok) throw new Error(`Update popup unavailable (${response.status})`); return response.text(); })
      .then((markup) => {
        document.body.insertAdjacentHTML("beforeend", markup);
        const dialog = document.querySelector("#updatesDialog");
        document.querySelector("#updatesCloseButton")?.addEventListener("click", () => closeDialog(dialog));
        dialog?.addEventListener("close", () => {
          if (state.canEdit && siteVersion.notificationVersion > 0) localStorage.setItem(UPDATES_NOTIFICATION_STORAGE_KEY, String(siteVersion.notificationVersion));
          document.body.classList.toggle("dialog-open", document.querySelector("dialog[open]") !== null);
        });
      })
      .catch(() => { updatesPopupLoadPromise = null; });
  }
  await updatesPopupLoadPromise;
}

async function clearSiteCaches() { if ("caches" in window) { const keys = await caches.keys(); await Promise.all(keys.filter((key) => key.startsWith("gamelist-cache-")).map((key) => caches.delete(key))); } if ("serviceWorker" in navigator) { const registrations = await navigator.serviceWorker.getRegistrations(); await Promise.all(registrations.map((registration) => registration.update().catch(() => {}))); } }
async function clearSiteCachesAndReload() { await clearSiteCaches(); localStorage.removeItem(ACHIEVEMENT_CACHE_KEY); if (siteVersion.version) localStorage.setItem(VERSION_STORAGE_KEY, siteVersion.version); window.location.reload(); }
function stripRuntimeFields(game) { const { sourceRecord, ...clean } = game; return clean; }
function numberOrNull(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const text = String(value ?? "").trim();
  if (!text) return null;
  const cleaned = text.replace(/[^\d,.-]/g, "");
  if (!cleaned || !/\d/.test(cleaned)) return null;
  const comma = cleaned.lastIndexOf(",");
  const dot = cleaned.lastIndexOf(".");
  let normalized = cleaned;
  if (comma >= 0 && dot >= 0) {
    const decimal = comma > dot ? "," : ".";
    const thousands = decimal === "," ? "." : ",";
    normalized = cleaned.split(thousands).join("").replace(decimal, ".");
  } else if (comma >= 0) {
    const decimals = cleaned.length - comma - 1;
    normalized = decimals > 0 && decimals <= 2 ? cleaned.replace(",", ".") : cleaned.replace(/,/g, "");
  } else if (dot >= 0) {
    const decimals = cleaned.length - dot - 1;
    normalized = decimals > 0 && decimals <= 2 ? cleaned : cleaned.replace(/\./g, "");
  }
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}
function firstGenre(value) { return String(value).split(",")[0].trim(); }
function rawCoverUrl(value) { try { const url = new URL(value, location.origin); return url.searchParams.get("src") || value; } catch { return value; } }
function coverUrl(value) { return value.includes("howlongtobeat.com/games/") ? `/api/cover?src=${encodeURIComponent(value)}` : value; }
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
  const isDetailCover = frame.classList.contains("detail-cover");
  const detailCap = window.matchMedia?.("(max-width: 699px)").matches ? 335 : 255;
  const viewportCap = Math.max(90, (unifiedShelfScope ? window.innerWidth : document.documentElement.clientWidth) - 28);
  const width = isDetailCover ? Math.round(Math.min(detailCap, viewportCap)) : Math.round(Math.min(180, Math.max(72, 142 * ratio)));
  const renderedHeight = Math.round(width / ratio);
  frame.style.setProperty("--shelf-cover-ratio", `${image.naturalWidth} / ${image.naturalHeight}`);
  frame.style.setProperty("--shelf-cover-width", `${width}px`);
  frame.style.setProperty("--shelf-cover-height", `${renderedHeight}px`);
  if (isDetailCover) {
    frame.style.width = `${width}px`;
    frame.style.height = `${renderedHeight}px`;
    frame.style.maxWidth = `${width}px`;
    frame.style.maxHeight = `${renderedHeight}px`;
    frame.style.aspectRatio = `${image.naturalWidth} / ${image.naturalHeight}`;
    image.style.width = `${width}px`;
    image.style.height = `${renderedHeight}px`;
    image.style.maxWidth = `${width}px`;
    image.style.maxHeight = `${renderedHeight}px`;
  }
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
function platformFallback(platform) { return platformLogo(platform); }
function shortPlatform(value) { return canonicalShelfPlatform(value); }
function platformDisplayName(value) {
  const platform = shortPlatform(value);
  const labels = {
    PS1: "Sony PlayStation",
    PS2: "Sony PlayStation 2",
    PS3: "Sony PlayStation 3",
    PS4: "Sony PlayStation 4",
    PS5: "Sony PlayStation 5",
    PSP: "Sony Playstation Portable",
    PSVita: "Sony Playstation Vita",
    Switch: "Nintendo Switch",
    "Switch 2": "Nintendo Switch 2",
    "Game Gear": "Sega Game Gear",
    X360: "Xbox 360",
    XOne: "Xbox One",
    GBC: "Game Boy Color",
    GB: "Game Boy",
    GC: "Nintendo Gamecube",
    GBA: "Game Boy Advance",
    NES: "Nintendo Entertainment System",
    SNES: "Super Nintendo Entertainment System",
    N64: "Nintendo 64",
    DS: "Nintendo DS",
    Wii: "Nintendo Wii",
    "Wii U": "Nintendo Wii U",
    "3DS": "Nintendo 3DS",
    Gen: "Sega Genesis",
    DC: "Sega Dreamcast",
  };
  return labels[platform] || value || platform;
}
function flagAsset(country) { return `assets/flags/${({ "United Kingdom": "gb", Spain: "es", Italy: "it", Ireland: "ie", Portugal: "pt", Mexico: "mx", "United States of America": "us", Japan: "jp", Taiwan: "tw", France: "fr", Germany: "de", Australia: "au", China: "cn", Europe: "eu", World: "world" })[country] || "world"}.svg`; }
function flagIcon(country, withClass = false) { return `<img${withClass ? ` class="detail-flag"` : ""} src="${flagAsset(country)}" alt="" width="47" height="31" decoding="async">`; }
function platformBadge(platform, options = {}) { const label = shortPlatform(platform); return `<span class="platform-badge ${platformClass(platform, options)}" title="${escapeHtml(label)}"><span class="platform-icon"><img src="${platformLogo(platform)}" alt="" width="18" height="18" decoding="async"></span><span class="platform-label">${escapeHtml(label)}</span></span>`; }
function syncShelfEditorIcons() {
  const platform = canonicalShelfPlatform(el.fields.platform?.value || "");
  const logo = platform ? platformLogo(platform) : "";
  setShelfEditorIcon(el.platformFieldIcon, logo && logo !== "assets/Icon_shelf.png" ? logo : "", platform);
  syncShelfEntitlementEditor(platform);
}
function syncShelfEditorCoverPreview() {
  const image = el.editorCoverPreview;
  if (!image) return;
  const source = rawCoverUrl(String(el.fields.cover?.value || "").trim());
  image.dataset.placeholderApplied = "";
  image.classList.toggle("is-placeholder", !source);
  image.src = source || "assets/Icon_shelf.png";
  image.onerror = () => {
    if (image.dataset.placeholderApplied) return;
    image.dataset.placeholderApplied = "true";
    image.classList.add("is-placeholder");
    image.src = "assets/Icon_shelf.png";
  };
}
function syncShelfEntitlementEditor(platform = canonicalShelfPlatform(el.fields.platform?.value || "")) {
  const digitalMode = el.addForm.dataset.digital === "true";
  el.addForm.classList.toggle("shelf-psplus-editor", digitalMode && ["PS3", "PS4", "PS5"].includes(platform));
  el.addForm.classList.toggle("shelf-games-with-gold-editor", digitalMode && ["X360", "XOne"].includes(platform));
  el.addForm.querySelector(".unified-game-editor-grid").classList.toggle("has-editor-entitlement", digitalMode && ["PS3", "PS4", "PS5", "X360", "XOne"].includes(platform));
}
function setShelfEditorIcon(slot, icon, title = "") {
  const wrapper = slot?.closest?.(".icon-input");
  if (!slot || !wrapper) return;
  wrapper.classList.toggle("has-icon", Boolean(icon));
  slot.title = icon ? title : "";
  slot.innerHTML = icon ? `<img src="${escapeHtml(icon)}" alt="" width="18" height="18" decoding="async">` : "";
}
function platformLogo(platform) { const value = normalize(shortPlatform(platform)); if (value === "wii") return "assets/platforms/wii.png"; if (value === "wii u" || value === "wiiu") return "assets/platforms/wiiu.png"; if (value === "n64") return "assets/platforms/n64.png"; if (value === "gc" || value.includes("gamecube")) return "assets/platforms/gc.png"; if (value === "nes") return "assets/platforms/nes.png"; if (value === "snes") return "assets/platforms/snes.png"; if (value === "ds") return "assets/platforms/nds.png"; if (value === "3ds") return "assets/platforms/3ds.png"; if (value === "gba") return "assets/platforms/gba.png"; if (value === "gbc") return "assets/platforms/gbc.png"; if (value === "gb") return "assets/platforms/gb.png"; if (value === "game gear") return "assets/platforms/gamegear.png"; if (value === "dc" || value.includes("dreamcast")) return "assets/platforms/dreamcast.png"; if (isSegaPlatform(value)) return "assets/platforms/sega.png"; if (value.includes("switch")) return "assets/platforms/switch.png"; if (value === "ps1" || value === "ps2") return "assets/platforms/playstation_retro.png"; if (value === "ps5") return "assets/platforms/playstation_modern.png"; if (value === "x360" || value === "xbox 360") return "assets/platforms/xbox360.png"; if (value === "xbox") return "assets/platforms/xbox_retro.png"; if (value.includes("xbox") || value === "xone") return "assets/platforms/xbox.png"; if (value.includes("steam") || value === "pc") return "assets/platforms/steam.png"; if (value.includes("ps") || value.includes("playstation") || value.includes("psp") || value.includes("vita")) return "assets/platforms/playstation.png"; return "assets/Icon_shelf.png"; }
function platformClass(platform, options = {}) { const value = normalize(shortPlatform(platform)); const title = normalize(options.title); if (value === "wii") return "platform-wii"; if (value === "wii u" || value === "wiiu") return "platform-wiiu"; if (value === "n64") return "platform-n64"; if (value === "gc" || value.includes("gamecube")) return "platform-gamecube"; if (value === "nes") return "platform-nes"; if (value === "snes") return "platform-snes"; if (value === "ds") return "platform-ds"; if (value === "3ds") return "platform-3ds"; if (value === "gba") return "platform-gba"; if (value === "gbc") return "platform-gbc"; if (value === "gb") return "platform-gb"; if (value === "game gear") return "platform-gamegear"; if (value === "dc" || value.includes("dreamcast")) return "platform-dreamcast"; if (isSegaPlatform(value)) return "platform-sega"; if (value.includes("switch")) return "platform-nintendo"; if (value === "ps1") return "platform-playstation platform-ps1"; if (value === "ps3" && PS3_BLUE_PILL_TITLES.has(title)) return "platform-playstation platform-ps3-as-ps4"; if (value === "ps3") return "platform-playstation platform-ps3"; if (value === "ps5") return "platform-playstation platform-ps5"; if (value === "psp") return "platform-playstation platform-psp"; if (value === "x360" || value === "xbox 360") return "platform-xbox platform-xbox360"; if (value === "xbox") return "platform-xbox platform-xbox-retro"; if (value.includes("xbox") || value === "xone") return "platform-xbox"; if (value.includes("steam") || value === "pc") return "platform-pc"; if (value.includes("ps") || value.includes("playstation") || value.includes("psp") || value.includes("vita")) return "platform-playstation"; return "platform-generic"; }
const PS3_BLUE_PILL_TITLES = new Set(["deception iv blood ties", "drakengard 3", "dynasty warriors 8 xtreme legends", "everybody dance 3", "lego hobbit", "mugen souls z", "murdered soul suspect", "rambo the video game", "sports pack vol 1", "the amazing spider man 2", "ultra street fighter iv", "watch dogs", "wolfenstein the new order"]);
function isSegaPlatform(value) { return /\b(gen|genesis|mega drive|megadrive|sega|saturn|cd|32x|master system|game gear)\b/i.test(value); }
function canonicalShelfPlatform(value) {
  const text = String(value || "").trim();
  const key = normalize(text).replace(/\s+/g, "");
  const aliases = {
    sonyplaystation: "PS1", playstation: "PS1", psone: "PS1", psx: "PS1", ps1: "PS1",
    sonyplaystation2: "PS2", playstation2: "PS2", ps2: "PS2",
    sonyplaystation3: "PS3", playstation3: "PS3", ps3: "PS3",
    sonyplaystation4: "PS4", playstation4: "PS4", ps4: "PS4",
    sonyplaystation5: "PS5", playstation5: "PS5", ps5: "PS5",
    sonyplaystationportable: "PSP", playstationportable: "PSP", psp: "PSP", sonyplaystationvita: "PSVita", playstationvita: "PSVita", psvita: "PSVita", vita: "PSVita",
    nintendoswitch: "Switch", switch: "Switch", nintendoswitch2: "Switch 2", switch2: "Switch 2",
    nintendo64: "N64", n64: "N64", nintendogamecube: "GC", gamecube: "GC", gc: "GC",
    nintendoentertainmentsystem: "NES", nes: "NES", supernintendo: "SNES", supernintendoentertainmentsystem: "SNES", snes: "SNES",
    nintendods: "DS", nds: "DS", ds: "DS", nintendo3ds: "3DS", n3ds: "3DS", "3ds": "3DS",
    nintendowii: "Wii", wii: "Wii", nintendowiiu: "Wii U", wiiu: "Wii U",
    gameboyadvance: "GBA", gameboyadvanced: "GBA", gba: "GBA", gameboycolor: "GBC", gbc: "GBC", gameboy: "GB", gb: "GB",
    genesis: "Gen", megadrive: "Gen", segamegadrive: "Gen", segagenesis: "Gen", sega: "Sega",
    dreamcast: "DC", segadreamcast: "DC", dc: "DC", segacd: "Sega CD", saturn: "Saturn", segasaturn: "Saturn",
    mastersystem: "Master System", segamastersystem: "Master System", gamegear: "Game Gear", segagamegear: "Game Gear", sega32x: "32X", "32x": "32X",
    steam: "Steam", pc: "Steam", xboxpc: "Xbox PC", microsoftpc: "Xbox PC", xbox360: "X360", x360: "X360", xboxone: "XOne", xone: "XOne", xboxseries: "Xbox Series", xbox: "Xbox",
  };
  return aliases[key] || text;
}
function regionName(country) { if (country === "United States of America") return "US"; if (country === "United Kingdom") return "UK"; return country; }
function regionFor(country) { if (country === "Japan") return "Japan"; if (country === "Taiwan") return "Taiwan"; if (country === "United States of America") return "USA"; if (["United Kingdom", "Spain", "Italy", "France", "Germany", "Europe"].includes(country)) return country === "Spain" ? "Spain" : "Europe"; return country || "Other"; }
function countValues(values) { const map = new Map(); values.filter(Boolean).forEach((value) => map.set(value, (map.get(value) || 0) + 1)); return [...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])); }
function conditionMatches(game, condition) { const label = conditionLabel(game).toLowerCase(); if (condition === "all") return true; if (condition === "complete") return label === "complete"; if (condition === "complete-plus") return label === "complete +"; if (condition === "loose") return label === "loose"; if (condition === "sealed") return label === "sealed"; return true; }
function sorter(type) { const direction = state.filters.direction === "desc" ? -1 : 1; if (type === "custom") return (a, b) => direction * ((a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER) || a.title.localeCompare(b.title)); if (type === "title" || type === "name") return (a, b) => direction * a.title.localeCompare(b.title); if (type === "added") return (a, b) => direction * (new Date(a.createdAt || 0) - new Date(b.createdAt || 0)); if (type === "value") return (a, b) => direction * (collectionValueFor(a) - collectionValueFor(b)); if (["time", "playtime"].includes(type)) return (a,b) => direction * ((Number(a.lengthHours) || 0) - (Number(b.lengthHours) || 0) || a.title.localeCompare(b.title)); if (type === "rating") return (a,b) => direction * ((Number(a.igdbRating) || 0) - (Number(b.igdbRating) || 0) || a.title.localeCompare(b.title)); if (type === "region") return (a, b) => direction * (a.country.localeCompare(b.country) || a.title.localeCompare(b.title)); return (a, b) => direction * (a.platform.localeCompare(b.platform) || a.title.localeCompare(b.title)); }
function uniqueSorted(values) { return [...new Set(values.filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), undefined, { sensitivity: "base" })); }
function orderedPlatforms(values) { return [...values].sort((a, b) => platformOrderRank(a) - platformOrderRank(b) || platformDisplayName(a).localeCompare(platformDisplayName(b), undefined, { sensitivity: "base" })); }
function platformOrderRank(platform) {
  const value = shortPlatform(platform);
  const order = [
    "Steam", "PC",
    "Game Gear", "Gen", "DC",
    "GB", "GBC", "NES", "SNES", "N64", "GC", "GBA", "DS", "Wii", "Wii U", "3DS", "Switch", "Switch 2",
    "PS1", "PS2", "PS3", "PSP", "PSVita", "PS4", "PS5",
    "Xbox", "X360", "XOne", "Xbox PC", "Xbox Series",
  ];
  const index = order.indexOf(value);
  return index >= 0 ? index : 1000;
}
function shelfSortForDefault(value) { if (value === "time") return "added"; if (value === "name") return "title"; return ["added", "title", "platform", "region", "value"].includes(value) ? value : "platform"; }
function applyShelfDefaultOrder(value) { state.filters.sort = shelfSortForDefault(value); state.filters.direction = ["added", "value"].includes(state.filters.sort) ? "desc" : "asc"; }
function bestCollectionPlatform(platforms, fallback) {
  const value = platforms.map(normalize).join(" ");
  if (value.includes("nintendo switch 2")) return "Switch 2";
  if (value.includes("nintendo switch")) return "Switch";
  if (value.includes("playstation 5")) return "PS5";
  if (value.includes("playstation 4")) return "PS4";
  if (value.includes("playstation 3")) return "PS3";
  if (value.includes("playstation 2")) return "PS2";
  if (value.includes("playstation portable")) return "PSP";
  if (value.includes("playstation vita")) return "PSVita";
  if (value.includes("playstation")) return "PS1";
  if (value.includes("nintendo 3ds")) return "3DS";
  if (value.includes("nintendo ds")) return "DS";
  if (value.includes("nintendo 64")) return "N64";
  return canonicalShelfPlatform(fallback || "Switch");
}
function shelfRatingScoreValue(game = {}) {
  const ratings = game?.ratings && typeof game.ratings === "object" ? game.ratings : {};
  const values = ["gameplay", "story", "soundtrack", "graphics", "performance"]
    .map((key) => Math.max(0, Math.min(5, Number(ratings[key]) || 0)))
    .filter((value) => value > 0);
  return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length * 20) / 10 : null;
}
function shelfRatingScoreBadge(game) {
  const score = shelfRatingScoreValue(game);
  if (score == null) return "";
  const tone = score >= 9 ? "gold" : score >= 7 ? "high" : score >= 5 ? "mid" : "low";
  const label = score === 10 ? "10" : score.toFixed(1);
  const title = `${tt("Rating")}: ${label}/10`;
  return `<span class="rating-score-pill rating-score-${tone}" title="${escapeHtml(title)}" aria-label="${escapeHtml(title)}"><span class="rating-score-star" aria-hidden="true"><svg class="rounded-star-icon" viewBox="0 0 24 24"><path d="M12 2.8 14.9 8.7l6.5.9-4.7 4.6 1.1 6.5L12 17.6l-5.8 3.1 1.1-6.5-4.7-4.6 6.5-.9L12 2.8Z"></path></svg></span>${label}</span>`;
}
function normalize(value) { return String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim(); }
function shortDescription(value, max = 260) { const text = String(value || "").trim(); return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text; }
function formatDate(value) { return formatPillDate(value) || "Jun 22, 2026"; }
function formatShortDate(value) { return formatPillDate(value); }
function formatLongDate(value) { return formatPillDate(value); }
function formatPillDate(value) { const date = String(value || "").match(/\d{4}-\d{2}-\d{2}/)?.[0]; if (!date) return ""; const parsed = new Date(`${date}T00:00:00`); return Number.isNaN(parsed.getTime()) ? "" : new Intl.DateTimeFormat(currentLanguage(), { month: "short", day: "2-digit", year: "numeric" }).format(parsed); }
function escapeCss(value) { return String(value).replace(/["'()\\]/g, "\\$&"); }
function escapeHtml(value) { return String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]); }

function clearShelfSpecificEditorData() {
  el.fields.country.value = defaultShelfCountry();
  el.fields.additionDate.value = shelfTodayInputValue();
  el.fields.price.value = "";
  el.fields.notes.value = "";
  Object.entries(el.conditionFields).forEach(([key, input]) => { input.checked = key === "game"; });
  syncConditionInputs();
}

function initUnifiedShelf() {
  populateEditorOptions();
  bindEvents();
  bindCardHoverSounds(document);
  initRenderSettling();
  unifiedShelfScope.ready({
    update(data) {
      const settingsKey = JSON.stringify(data.settings);
      const sourceChanged = state.unifiedShelfData !== data.shelf;
      const settingsChanged = state.unifiedSettingsKey !== settingsKey;
      const listChanged = state.unifiedListData !== data.games;
      const authChanged = state.canEdit !== data.canEdit;
      state.unifiedShelfData = data.shelf;
      state.unifiedSettingsKey = settingsKey;
      state.unifiedListData = data.games;
      state.sourceGames = data.shelf.sourceGames || [];
      state.additions = data.shelf.games || [];
      state.overrides = data.shelf.overrides || {};
      state.updatedAt = data.shelf.updatedAt || "";
      state.gamelistGames = data.games;
      state.gamelistSettings = { ...data.settings,  };
      state.canEdit = data.canEdit;
      applyUnifiedFilters(data.sharedFilters || {});
      state.filters.tab = normalizedShelfTab(data.tab || "shelf");
      state.unifiedMedia = data.media || "all";
      state.viewMode = data.view || "grid";
      state.layout = normalizeLayout(data.shelf.layout || state.layout);
      if (sourceChanged) rebuildGames();
      if (sourceChanged || settingsChanged || listChanged || authChanged) {
        state.unifiedCardCache = new Map();
        state.unifiedRevision = (state.unifiedRevision || 0) + 1;
        state.favoriteGameIds = shelfFavoriteIdsFromSources(data.shelf, { settings: data.settings });
        renderFavorites();
      }
      if (settingsChanged) {
        applyLanguage();
        const accountKey = achievementSettingsKey(state.gamelistSettings);
        if (state.unifiedAchievementKey !== accountKey) {
          state.unifiedAchievementKey = accountKey;
          void loadTrophyActivity().then(() => {
            state.unifiedCardCache = new Map();
            state.unifiedRevision = (state.unifiedRevision || 0) + 1;
            renderLibrary();
            const current = state.games.find(game => game.id === el.detailDialog.dataset.id);
            if (current && el.detailDialog.open) void loadShelfTrophies(current);
          }).catch(() => {});
        }
      }
      document.body.classList.toggle("can-edit", state.canEdit);
      renderStats();
      renderLibrary();
    },
    matches(filters, media) {
      const previous = { ...state.filters };
      const previousMedia = state.unifiedMedia;
      applyUnifiedFilters(filters);
      state.unifiedMedia = media;
      const count = filteredGamesForShelfTab("shelf").length;
      state.filters = previous;
      state.unifiedMedia = previousMedia;
      return count;
    },
    select(tab, media = "all") { state.filters.tab = normalizedShelfTab(tab); state.unifiedMedia = media; renderUnifiedShelf(); },
    search: scrollToShelfSearch,
    view(mode) { state.viewMode = mode; renderUnifiedShelf(); },
    visibleCount() { return filteredGames().length; },
    pending() { return state.canEdit ? state.games.filter(isPendingCollectionGame) : []; },
    finishedKpi(node) {
      if (!node) return;
      el.stats.querySelector("[data-stat-action='completed']")?.remove();
      state.unifiedFinishedKpi = node;
      el.stats.prepend(node);
    },
    years: shelfStatsYears,
    translate: tt,
    mediaIcon(mode) { return mode === "physical" ? physicalDiskIcon() : downloadBadgeIcon(); },
    refreshPrices: refreshAllShelfPrices,
    stats(year, dialog, body) {
      state.shelfStatsYear = String(year || "all");
      el.statsBody = document.createElement("div");
      renderShelfStatsDialog();
      const nodes = [...el.statsBody.children];
      el.statsBody = body;
      el.statsDialog = dialog;
      return { nodes, count: state.games.filter(game => !isPendingCollectionGame(game) && !game.deletedAt && (state.gamelistSettings.shelfDigitalGames === true || !isDigitalShelfGame(game)) && (year === "all" || shelfStatsDate(game)?.getFullYear() === Number(year))).length, bind: bindShelfStatsHoverDetails };
    },
    exportPhysical: exportShelfPhysicalCsv,
    importPhysical: importShelfPhysicalCsv,
    exportDigital: exportShelfDigitalCsv,
    importDigital: importShelfDigitalCsv,
    settings: openLayout,
  });
}

function renderUnifiedShelf() {
  document.body.classList.toggle("can-edit", state.canEdit);
  applyLanguage();
  renderFilters();
  renderStats();
  renderFavorites();
  renderLibrary();
  syncViewModeButton(el.view, state.viewMode, { gridIcon, linesIcon });
  el.sortDirection.innerHTML = sortArrowIcon(state.filters.direction === "desc");
  el.sortDirection.title = tt(state.filters.direction === "desc" ? "Sort descending" : "Sort ascending");
  el.tabs.hidden = true;
  el.libraryTitle.hidden = false;
  el.favorites.closest("section").hidden = false;
  if (state.unifiedMedia && state.unifiedMedia !== "all") {
    el.shelf.querySelectorAll("[data-id]").forEach(card => {
      const game = state.games.find(game => game.id === card.dataset.id);
      card.hidden = game && (state.unifiedMedia === "digital") !== isDigitalShelfGame(game);
    });
  }
}

function shelfTodayInputValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function roundApproximateHours(value) {
  const hours = Number(value);
  return Number.isFinite(hours) && hours > 0 ? Math.ceil(hours) : 0;
}
function applyUnifiedFilters(filters) {
  state.filters.query = filters.query || "";
  state.filters.platform = filters.platform && filters.platform !== "all" ? canonicalShelfPlatform(filters.platform) : "all";
  state.filters.category = filters.tag || "all";
  state.filters.region = filters.region || "all";
  state.filters.condition = filters.condition || "all";
  state.filters.sort = filters.sort === "name" ? "title" : filters.sort || "custom";
  state.filters.direction = filters.direction || "asc";
}
