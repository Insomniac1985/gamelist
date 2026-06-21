const STORAGE_KEY = "gamelist:v1";
const LEGACY_STORAGE_KEY = "buylist-tracker:v6";
const SESSION_KEY = "gamelist-editor";
const VIEW_MODE_KEY = "gamelist:view-mode";
const PLATINUM_VIEW_MODE_KEY = "gamelist:platinum-view-mode";
const PLATINUM_META_CACHE_KEY = "gamelist:platinum-meta:v1";
const SETTINGS_KEY = "gamelist:settings:v1";
const KASH_TWITCH_URL = "https://www.twitch.tv/kashhoward";
const DEFAULT_PAGE_ORDER = ["trophies", "calendar", "highlights", "search", "gamelist", "finished"];
const LAYOUT_SECTION_KEYS = ["playing", ...DEFAULT_PAGE_ORDER, "latestFinished"];
const SITE_VERSION = "v136";
const SITE_UPDATED_AT = "2026-06-21T14:43:50Z";
const VERSION_STORAGE_KEY = "gamelist:site-version";
const STORE_OPTIONS = ["Amazon", "GAME.es", "Xtralife", "Retro Island NY", "GameStop", "Walmart"];
const THEMES = {
  shabii: {
    name: "Shabii",
    title: "Shabii's Gamelist",
    shortName: "Gamelist",
    icon: "assets/Icon.png",
    appIcon: "assets/app-Icon.png",
    themeColor: "#ff0039",
  },
  kash: {
    name: "Kash",
    title: "Kash's Gamelist",
    shortName: "Kash",
    icon: "assets/kh_icon.png",
    appIcon: "assets/kh_app-icon.png",
    themeColor: "#005cff",
  },
};
const DEFAULT_SETTINGS = {
  pageOrder: DEFAULT_PAGE_ORDER,
  hiddenSections: [],
  theme: "shabii",
  psnUser: "ShabiiEXE",
  microsoftUser: "",
  steamUser: "",
  currency: "EUR",
  region: "ES",
  stores: ["Amazon", "Xtralife", "GAME.es", "Retro Island NY"],
  defaultOwner: "Xavi",
};
const STATUS_OPTIONS = [
  "To Collect",
  "Scarce",
  "Waiting for Physical",
];
const UI_ICON_URLS = [
  "/assets/Icon.png",
  "/assets/kh_icon.png",
  "/assets/kh_app-icon.png",
  "/assets/platforms/playstation.png",
  "/assets/platforms/steam.png",
  "/assets/platforms/switch.png",
  "/assets/platforms/xbox.png",
  "/assets/platforms/wii.png",
  "/assets/platforms/wiiu.png",
  "/assets/platforms/n64.png",
  "/assets/platforms/gc.png",
  "/assets/platforms/nes.png",
  "/assets/platforms/snes.png",
  "/assets/platforms/nds.png",
  "/assets/platforms/3ds.png",
  "/assets/platforms/gba.png",
  "/assets/platforms/gbc.png",
  "/assets/platforms/gb.png",
  "/assets/platforms/sega.png",
  "/assets/platforms/dreamcast.png",
  "/assets/sites/howlongtobeat.png",
  "/assets/sites/neoseeker.png",
  "/assets/sites/nintendo.png",
  "/assets/sites/playstation.png",
  "/assets/sites/psnprofiles.png",
  "/assets/sites/rpgsite.png",
  "/assets/sites/steam.png",
  "/assets/sites/wikipedia.ico",
  "/assets/stores/amazon.ico",
  "/assets/stores/game.ico",
  "/assets/stores/retroisland.png",
  "/assets/stores/xtralife.ico",
];
const MANUAL_GAME_COVER_OVERRIDES = {
  mandagon: "https://cdn.thegamesdb.net/images/original/boxart/front/45783-1.jpg",
};
const MANUAL_PLATINUM_COVER_OVERRIDES = [
  { match: ["we", "were", "here", "together"], cover: "https://cdn.cloudflare.steamstatic.com/steam/apps/865360/library_600x900_2x.jpg" },
  { match: ["we", "were", "here", "too"], cover: "https://m.media-amazon.com/images/M/MV5BODY0YzhlZTgtMTE1OS00NzI4LTk4YjktYjliNGYyMDU0NmUzXkEyXkFqcGc@._V1_.jpg" },
  { match: ["we", "were", "here"], exclude: ["too", "together"], cover: "https://store-images.s-microsoft.com/image/apps.35419.14623959840279805.b70e315b-f457-43e0-ae70-9c5caadb7e59.6f028cbc-8306-4423-b49b-43e1f6e75ee8" },
  { match: ["nier", "automata"], cover: "https://howlongtobeat.com/games/38029_Nier_Automata.jpg?width=250" },
  { match: ["persona", "3", "reload"], cover: "https://howlongtobeat.com/games/129805_Persona_3_Reload.jpg?width=250" },
  { match: ["spider", "man", "2"], ids: ["23918"], exclude: ["miles"], cover: "https://howlongtobeat.com/games/79769_Marvels_Spider-Man_2.jpg?width=250" },
  { match: ["spider", "man"], exclude: ["2", "miles"], cover: "https://howlongtobeat.com/games/44852_Spider-Man_(2017).jpg?width=250" },
];
const MANUAL_PLATINUM_META_OVERRIDES = [
  { match: ["spider", "man", "2"], ids: ["23918"], exclude: ["miles"], trophyName: "Dedicated", icon: "https://img.psnprofiles.com/trophy/m/23918/c6620db1-4320-4a50-99af-fce3f5be2b41.png" },
  { match: ["spider", "man"], ids: ["8143"], exclude: ["2", "23918", "miles"], trophyName: "Be Greater", icon: "https://img.psnprofiles.com/trophy/m/8143/ccb3b536-eaae-4c03-beb5-4d9b3f8cb72c.png" },
];
const MANUAL_PSN_TITLE_OVERRIDES = [
  { match: ["mortal", "kombat", "1"], exclude: ["11"], platforms: ["PS5"], ids: ["NPWR29323_00"] },
  { match: ["mortal", "kombat", "11"], platforms: ["PS5"], ids: ["NPWR21249_00"] },
  { match: ["mortal", "kombat", "11"], platforms: ["PS4"], ids: ["NPWR15142_00"] },
  { match: ["mortal", "kombat", "x"], platforms: ["PS4"], ids: ["NPWR07810_00"] },
  { match: ["mkx"], platforms: ["PS4"], ids: ["NPWR07810_00"] },
  { match: ["mortal", "kombat"], platforms: ["PS3"], ids: ["NPWR01747_00"] },
  { match: ["ai", "somnium", "files", "nirvana", "initiative"], platforms: ["PS4", "PS5"], ids: ["NPWR27307_00"] },
  { match: ["nirvana", "initiative"], platforms: ["PS4", "PS5"], ids: ["NPWR27307_00"] },
  { match: ["ace", "attorney", "investigations"], platforms: ["PS4", "PS5"], ids: ["NPWR40588_00"] },
  { match: ["miles", "edgeworth"], platforms: ["PS4", "PS5"], ids: ["NPWR40588_00"] },
  { match: ["zero", "escape", "nine", "hours", "nine", "persons", "nine", "doors"], platforms: ["PS4", "PSVita"], ids: ["NPWR12149_00"] },
  { match: ["nine", "hours", "nine", "persons", "nine", "doors"], platforms: ["PS4", "PSVita"], ids: ["NPWR12149_00"] },
  { match: ["999"], platforms: ["PS4", "PSVita"], ids: ["NPWR12149_00"] },
  { match: ["j", "stars", "victory"], platforms: ["PS3", "PS4", "PSVita"], ids: ["NPWR08138_00"] },
  { match: ["jstars", "victory"], platforms: ["PS3", "PS4", "PSVita"], ids: ["NPWR08138_00"] },
  { match: ["final", "fantasy", "7", "remake", "episode", "intermission"], platforms: ["PS5"], ids: ["NPWR22029_00"] },
  { match: ["final", "fantasy", "vii", "remake", "episode", "intermission"], platforms: ["PS5"], ids: ["NPWR22029_00"] },
  { match: ["klonoa", "2", "lunatea", "veil"], platforms: ["PS4", "PS5"], ids: ["NPWR25832_00"] },
  { match: ["klonoa", "door", "phantomile"], platforms: ["PS4", "PS5"], ids: ["NPWR25832_00"] },
];
const SEARCH_CACHE_TTL = 1000 * 60 * 60;
let titleLookupTimer = 0;
let selectMeasureContext = null;
let selectOverflowPopover = null;
let playingTrailerFrame = 0;
const searchCache = new Map();
const searchInflight = new Map();
const platinumMetaCache = loadPlatinumMetaCache();

const state = {
  games: [],
  psnActivity: { achievements: [], games: [], platinums: [], sourceUrl: "" },
  steamActivity: { achievements: [], games: [], completed: [], totalEarned: 0, sourceUrl: "" },
  xboxActivity: { achievements: [], games: [], completed: [], totalEarned: 0, sourceUrl: "" },
  steamOwnedAppIds: null,
  cardTrophies: {},
  platinumCoverCache: {},
  settings: loadLocalSettings(),
  filters: { query: "", platform: "all", tag: "all", sort: "time", direction: "asc", preordered: false },
  viewMode: localStorage.getItem(VIEW_MODE_KEY) === "list" ? "list" : "grid",
  editingId: "",
  pendingDescription: "",
  canEdit: sessionStorage.getItem(SESSION_KEY) === "true",
  draggingId: "",
  mobileSection: "backlog",
  mobileSwipeStart: null,
  completedYear: "all",
  completedVisiblePages: 1,
  historyYear: String(new Date().getFullYear()),
  platinumYear: "all",
  platinumPlatform: "all",
  platinumSort: "time",
  platinumDirection: "desc",
  platinumViewMode: localStorage.getItem(PLATINUM_VIEW_MODE_KEY) === "list" ? "list" : "grid",
  releaseCalendarOffset: 0,
  detailTrophyRequest: "",
  detailReturnToHistory: false,
  detailGameId: "",
  detailTrophiesData: [],
  detailTrophyProvider: "psn",
  detailTrophySort: "order",
  detailTrophyDirection: "asc",
  playingTrailerObserver: null,
  playingTrailerVisibility: new Map(),
  activeTrailerCard: null,
  playingHeightFrame: 0,
  paintRefreshFrame: 0,
};

const el = {
  brandLink: document.querySelector(".brand"),
  playingSection: document.querySelector("#playingSection"),
  playingCount: document.querySelector("#playingCount"),
  playingList: document.querySelector(".playing-list"),
  playingFinished: document.querySelector("#playingFinished"),
  playingFinishedList: document.querySelector(".playing-finished-list"),
  playingPrevButton: document.querySelector("#playingPrevButton"),
  playingNextButton: document.querySelector("#playingNextButton"),
  achievementSection: document.querySelector("#achievementSection"),
  calendarSection: document.querySelector(".calendar-section"),
  highlightsSection: document.querySelector(".highlights-section"),
  achievementPanel: document.querySelector("#achievementPanel"),
  achievementProfileLink: document.querySelector("#achievementProfileLink"),
  stats: document.querySelector("#stats"),
  loginButton: document.querySelector("#loginButton"),
  addButton: document.querySelector("#addButton"),
  syncButton: document.querySelector("#syncButton"),
  settingsButton: document.querySelector("#settingsButton"),
  fetchDataButton: document.querySelector("#fetchDataButton"),
  fetchPricesButton: document.querySelector("#fetchPricesButton"),
  searchInput: document.querySelector("#searchInput"),
  platformFilter: document.querySelector("#platformFilter"),
  tagFilter: document.querySelector("#tagFilter"),
  sortFilter: document.querySelector("#sortFilter"),
  sortDirectionButton: document.querySelector("#sortDirectionButton"),
  viewToggleButton: document.querySelector("#viewToggleButton"),
  preorderedFilter: document.querySelector("#preorderedFilter"),
  completedCount: document.querySelector("#completedCount"),
  completedYearControl: document.querySelector("#completedYearControl"),
  completedYearFilter: document.querySelector("#completedYearFilter"),
  completedMoreButton: document.querySelector("#completedMoreButton"),
  footerDataUpdate: document.querySelector("#footerDataUpdate"),
  footerVersion: document.querySelector("#footerVersion"),
  scrollTopButton: document.querySelector("#scrollTopButton"),
  floatingEditActions: document.querySelector("#floatingEditActions"),
  floatingAddButton: document.querySelector("#floatingAddButton"),
  mobileTabs: document.querySelectorAll("[data-mobile-section]"),
  board: document.querySelector(".board"),
  detailDialog: document.querySelector("#detailDialog"),
  detailCloseButton: document.querySelector("#detailCloseButton"),
  historyDialog: document.querySelector("#historyDialog"),
  historyCloseButton: document.querySelector("#historyCloseButton"),
  historyYearTabs: document.querySelector("#historyYearTabs"),
  historyList: document.querySelector("#historyList"),
  platinumDialog: document.querySelector("#platinumDialog"),
  platinumCloseButton: document.querySelector("#platinumCloseButton"),
  platinumTitle: document.querySelector("#platinumTitle"),
  platinumCount: document.querySelector("#platinumCount"),
  platinumSortSelect: document.querySelector("#platinumSortSelect"),
  platinumSortDirection: document.querySelector("#platinumSortDirection"),
  platinumViewToggleButton: document.querySelector("#platinumViewToggleButton"),
  platinumYearTabs: document.querySelector("#platinumYearTabs"),
  platinumYearSelect: document.querySelector("#platinumYearSelect"),
  platinumPlatformSelect: document.querySelector("#platinumPlatformSelect"),
  platinumList: document.querySelector("#platinumList"),
  releaseCalendar: document.querySelector("#releaseCalendar"),
  releaseDialog: document.querySelector("#releaseDialog"),
  releaseCloseButton: document.querySelector("#releaseCloseButton"),
  releaseDialogTitle: document.querySelector("#releaseDialogTitle"),
  releaseDialogList: document.querySelector("#releaseDialogList"),
  settingsDialog: document.querySelector("#settingsDialog"),
  settingsForm: document.querySelector("#settingsForm"),
  settingsCloseButton: document.querySelector("#settingsCloseButton"),
  authDialog: document.querySelector("#authDialog"),
  authForm: document.querySelector("#authForm"),
  authCloseButton: document.querySelector("#authCloseButton"),
  authCancelButton: document.querySelector("#authCancelButton"),
  authPasswordInput: document.querySelector("#authPasswordInput"),
  authError: document.querySelector("#authError"),
  settingsLayoutList: document.querySelector("#settingsLayoutList"),
  settingsPsnUser: document.querySelector("#settingsPsnUser"),
  settingsMicrosoftUser: document.querySelector("#settingsMicrosoftUser"),
  settingsSteamUser: document.querySelector("#settingsSteamUser"),
  settingsCurrency: document.querySelector("#settingsCurrency"),
  settingsRegion: document.querySelector("#settingsRegion"),
  settingsStores: document.querySelector("#settingsStores"),
  settingsDefaultOwner: document.querySelector("#settingsDefaultOwner"),
  detailTitle: document.querySelector("#detailTitle"),
  detailStudio: document.querySelector("#detailStudio"),
  detailMeta: document.querySelector("#detailMeta"),
  detailDates: document.querySelector("#detailDates"),
  detailChips: document.querySelector("#detailChips"),
  detailStoreLinks: document.querySelector("#detailStoreLinks"),
  detailDescription: document.querySelector("#detailDescription"),
  detailPrices: document.querySelector("#detailPrices"),
  detailGuides: document.querySelector("#detailGuides"),
  detailGuideLinks: document.querySelector("#detailGuideLinks"),
  detailTrophies: document.querySelector("#detailTrophies"),
  detailTrophyTitle: document.querySelector("#detailTrophyTitle"),
  detailTrophyCount: document.querySelector("#detailTrophyCount"),
  detailTrophyPercent: document.querySelector("#detailTrophyPercent"),
  detailTrophySort: document.querySelector("#detailTrophySort"),
  detailTrophyDirection: document.querySelector("#detailTrophyDirection"),
  detailTrophyScroller: document.querySelector("#detailTrophyScroller"),
  detailTrophyList: document.querySelector("#detailTrophyList"),
  detailCover: document.querySelector(".detail-cover img"),
  dialog: document.querySelector("#gameDialog"),
  form: document.querySelector("#gameForm"),
  dialogTitle: document.querySelector("#dialogTitle"),
  lookupInput: document.querySelector("#lookupInput"),
  lookupButton: document.querySelector("#lookupButton"),
  lookupResults: document.querySelector("#lookupResults"),
  deleteButton: document.querySelector("#deleteButton"),
  closeDialogButton: document.querySelector("#closeDialogButton"),
  pricesButton: document.querySelector("#pricesButton"),
  coverUpload: document.querySelector("#coverUpload"),
  template: document.querySelector("#cardTemplate"),
  fields: {
    id: document.querySelector("#gameId"),
    title: document.querySelector("#titleInput"),
    platform: document.querySelector("#platformInput"),
    section: document.querySelector("#sectionInput"),
    releaseDate: document.querySelector("#releaseDateInput"),
    releaseText: document.querySelector("#releaseTextInput"),
    length: document.querySelector("#lengthInput"),
    startedAt: document.querySelector("#startedAtInput"),
    completedAt: document.querySelector("#completedAtInput"),
    replayCount: document.querySelector("#replayCountInput"),
    platinum: document.querySelector("#platinumInput"),
    preorderStore: document.querySelector("#preorderStoreInput"),
    preferredStore: document.querySelector("#preferredStoreInput"),
    owners: document.querySelector("#ownersInput"),
    statuses: document.querySelector("#statusesInput"),
    digital: document.querySelector("#digitalInput"),
    emulator: document.querySelector("#emulatorInput"),
    coop: document.querySelector("#coopInput"),
    stream: document.querySelector("#streamInput"),
    playing: document.querySelector("#playingInput"),
    genres: document.querySelector("#genresInput"),
    developer: document.querySelector("#developerInput"),
    publisher: document.querySelector("#publisherInput"),
    description: document.querySelector("#descriptionInput"),
    igdbUrl: document.querySelector("#igdbUrlInput"),
    trailerUrl: document.querySelector("#trailerUrlInput"),
    playstationUrl: document.querySelector("#playstationUrlInput"),
    nintendoUrl: document.querySelector("#nintendoUrlInput"),
    steamUrl: document.querySelector("#steamUrlInput"),
    steamAppId: document.querySelector("#steamAppIdInput"),
    cover: document.querySelector("#coverInput"),
    notes: document.querySelector("#notesInput"),
  },
};

init();

async function init() {
  if (await checkSiteVersion()) return;
  await window.__initialThemeReady?.catch(() => "shabii");
  registerServiceWorker();
  syncDisplayMode();
  document.body.classList.toggle("can-edit", state.canEdit);
  bindEvents();
  warmUiIcons();
  bindTextureParallax();
  await loadData();
  render();
  const cloudChanged = await pullCloudData();
  if (cloudChanged) render();
  refreshAchievements();
  scheduleBackgroundRefreshes();
}

function bindTextureParallax() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  let frame = 0;
  window.addEventListener("pointermove", (event) => {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      const x = ((event.clientX / window.innerWidth) - 0.5) * -14;
      const y = ((event.clientY / window.innerHeight) - 0.5) * -14;
      const backdropX = ((event.clientX / window.innerWidth) - 0.5) * -26;
      const backdropY = ((event.clientY / window.innerHeight) - 0.5) * -26;
      document.documentElement.style.setProperty("--grid-x", `${x.toFixed(2)}px`);
      document.documentElement.style.setProperty("--grid-y", `${y.toFixed(2)}px`);
      document.documentElement.style.setProperty("--backdrop-x", `${backdropX.toFixed(2)}px`);
      document.documentElement.style.setProperty("--backdrop-y", `${backdropY.toFixed(2)}px`);
    });
  }, { passive: true });
}

function quickAddGame() {
  scrollToSearchArea();
  window.setTimeout(() => openEditor(), 180);
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/service-worker.js").catch(() => {
      // Asset caching is optional; the app still works without it.
    });
  });
}

async function checkSiteVersion() {
  try {
    const response = await fetch(`/version.json?t=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) return false;
    const remote = await response.json();
    const remoteVersion = String(remote.version || "").trim();
    if (!remoteVersion) return false;
    const current = localStorage.getItem(VERSION_STORAGE_KEY);
    if (!current) {
      localStorage.setItem(VERSION_STORAGE_KEY, remoteVersion);
      return false;
    }
    if (current === remoteVersion || remoteVersion === SITE_VERSION) {
      localStorage.setItem(VERSION_STORAGE_KEY, remoteVersion);
      return false;
    }
    await clearSiteCaches();
    localStorage.setItem(VERSION_STORAGE_KEY, remoteVersion);
    window.location.reload();
    return true;
  } catch {
    return false;
  }
}

async function clearSiteCaches() {
  if ("caches" in window) {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter((key) => key.startsWith("gamelist-cache-"))
      .map((key) => caches.delete(key)));
  }
  if ("serviceWorker" in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.update().catch(() => {})));
  }
}

async function clearSiteCachesAndReload() {
  await clearSiteCaches();
  localStorage.setItem(VERSION_STORAGE_KEY, SITE_VERSION);
  window.location.reload();
}

function bindEvents() {
  el.brandLink.addEventListener("click", (event) => {
    event.preventDefault();
    if (normalizeSettings(state.settings).theme === "kash") {
      window.open(KASH_TWITCH_URL, "_blank", "noopener,noreferrer");
      return;
    }
    scrollToSearchArea();
  });
  el.loginButton.addEventListener("click", toggleEditMode);
  el.addButton.addEventListener("click", quickAddGame);
  el.floatingAddButton.addEventListener("click", quickAddGame);
  el.syncButton.addEventListener("click", syncNow);
  el.settingsButton?.addEventListener("click", openSettingsDialog);
  el.authCloseButton?.addEventListener("click", () => el.authDialog.close("cancel"));
  el.authCancelButton?.addEventListener("click", () => el.authDialog.close("cancel"));
  el.fetchDataButton?.addEventListener("click", refreshAllGameData);
  el.fetchPricesButton.addEventListener("click", refreshAllPrices);
  el.playingPrevButton.addEventListener("click", () => slidePlaying(-1));
  el.playingNextButton.addEventListener("click", () => slidePlaying(1));
  el.playingList.addEventListener("scroll", () => {
    updatePlayingSliderControls();
    scheduleFocusedPlayingTrailerUpdate();
  }, { passive: true });
  el.playingFinishedList.addEventListener("scroll", updatePlayingFinishedEdges, { passive: true });
  el.detailTrophyList.addEventListener("scroll", updateDetailTrophyEdges, { passive: true });
  el.platinumCloseButton.addEventListener("click", () => el.platinumDialog.close());
  el.platinumDialog.addEventListener("click", (event) => {
    if (event.target === el.platinumDialog) el.platinumDialog.close();
  });
  el.platinumDialog.addEventListener("close", syncScrollLock);
  window.addEventListener("scroll", () => {
    updateScrollTopButton();
    scheduleFocusedPlayingTrailerUpdate();
  }, { passive: true });
  window.addEventListener("resize", () => {
    schedulePlayingCardHeightSync();
    requestAnimationFrame(updateAllRowTitleOverflow);
    scheduleFocusedPlayingTrailerUpdate();
  }, { passive: true });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) pauseAllPlayingTrailers();
    else scheduleFocusedPlayingTrailerUpdate();
  });
  document.addEventListener("pointerover", handleSelectOverflowTitle);
  document.addEventListener("focusin", handleSelectOverflowTitle);
  document.addEventListener("pointerout", handleSelectOverflowLeave);
  document.addEventListener("focusout", handleSelectOverflowLeave);
  document.addEventListener("change", (event) => {
    if (event.target.matches?.("select")) updateSelectOverflowTitle(event.target);
  });
  window.addEventListener("scroll", hideSelectOverflowPopover, { passive: true });
  el.searchInput.addEventListener("input", (event) => {
    state.filters.query = event.target.value.trim().toLowerCase();
    state.completedVisiblePages = 1;
    render();
  });
  el.platformFilter.addEventListener("change", (event) => {
    state.filters.platform = event.target.value;
    state.completedVisiblePages = 1;
    render();
  });
  el.tagFilter.addEventListener("change", (event) => {
    state.filters.tag = event.target.value;
    state.completedVisiblePages = 1;
    render();
  });
  el.sortFilter.addEventListener("change", (event) => {
    state.filters.sort = event.target.value;
    if (state.filters.sort === "added") state.filters.direction = "desc";
    state.completedVisiblePages = 1;
    render();
  });
  el.sortDirectionButton.addEventListener("click", () => {
    state.filters.direction = state.filters.direction === "asc" ? "desc" : "asc";
    state.completedVisiblePages = 1;
    render();
  });
  el.viewToggleButton.addEventListener("click", () => {
    state.viewMode = state.viewMode === "grid" ? "list" : "grid";
    localStorage.setItem(VIEW_MODE_KEY, state.viewMode);
    render();
  });
  el.platinumViewToggleButton?.addEventListener("click", () => {
    state.platinumViewMode = state.platinumViewMode === "grid" ? "list" : "grid";
    localStorage.setItem(PLATINUM_VIEW_MODE_KEY, state.platinumViewMode);
    renderPlatinumDialog();
  });
  el.preorderedFilter.addEventListener("change", (event) => {
    state.filters.preordered = event.target.checked;
    state.completedVisiblePages = 1;
    render();
  });
  el.completedYearFilter?.addEventListener("change", handleCompletedYearChange);
  el.completedMoreButton?.addEventListener("click", () => {
    state.completedVisiblePages += 1;
    renderCompleted();
  });
  el.footerVersion?.addEventListener("click", clearSiteCachesAndReload);
  el.scrollTopButton.addEventListener("click", () => {
    if (document.body.classList.contains("dialog-open")) return;
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
  el.detailCloseButton.addEventListener("click", () => el.detailDialog.close());
  el.detailDialog.addEventListener("click", (event) => {
    if (event.target === el.detailDialog) el.detailDialog.close();
  });
  el.detailDialog.addEventListener("close", handleDetailClose);
  el.detailTrophySort.addEventListener("change", (event) => {
    state.detailTrophySort = event.target.value;
    renderDetailTrophyList();
  });
  el.detailTrophyDirection.addEventListener("click", () => {
    state.detailTrophyDirection = state.detailTrophyDirection === "asc" ? "desc" : "asc";
    renderDetailTrophyList();
  });
  el.historyCloseButton.addEventListener("click", () => el.historyDialog.close());
  el.historyDialog.addEventListener("click", (event) => {
    if (event.target === el.historyDialog) el.historyDialog.close();
  });
  el.historyDialog.addEventListener("close", syncScrollLock);
  el.releaseCloseButton.addEventListener("click", () => el.releaseDialog.close());
  el.releaseDialog.addEventListener("click", (event) => {
    if (event.target === el.releaseDialog) el.releaseDialog.close();
  });
  el.releaseDialog.addEventListener("close", syncScrollLock);
  el.dialog.addEventListener("close", syncScrollLock);
  el.settingsCloseButton?.addEventListener("click", () => el.settingsDialog.close());
  el.settingsDialog?.addEventListener("click", (event) => {
    if (event.target === el.settingsDialog) el.settingsDialog.close();
  });
  el.settingsDialog?.addEventListener("close", syncScrollLock);
  el.authDialog?.addEventListener("click", (event) => {
    if (event.target === el.authDialog) el.authDialog.close("cancel");
  });
  el.authDialog?.addEventListener("close", syncScrollLock);
  el.settingsForm?.addEventListener("submit", saveSettingsFromForm);
  el.mobileTabs.forEach((button) => button.addEventListener("click", () => {
    state.mobileSection = button.dataset.mobileSection;
    render();
  }));
  el.board.addEventListener("touchstart", handleBoardSwipeStart, { passive: true });
  el.board.addEventListener("touchend", handleBoardSwipeEnd, { passive: true });
  window.addEventListener("touchend", handleBoardSwipeEnd, { passive: true });
  el.fields.section.addEventListener("change", syncDialogPriceVisibility);
  el.fields.platform.addEventListener("input", syncDialogPriceVisibility);
  el.fields.digital.addEventListener("change", syncDialogPriceVisibility);
  el.fields.replayCount.addEventListener("input", syncReplaySection);
  el.form.addEventListener("submit", saveFromForm);
  el.deleteButton.addEventListener("click", deleteCurrentGame);
  el.closeDialogButton.addEventListener("click", () => el.dialog.close());
  el.lookupButton.addEventListener("click", lookupGame);
  el.lookupInput.addEventListener("input", queueTitleLookup);
  el.pricesButton.addEventListener("click", refreshCurrentPrices);
  el.coverUpload.addEventListener("change", handleCoverUpload);
  window.addEventListener("resize", syncDisplayMode, { passive: true });
  window.matchMedia("(display-mode: standalone)").addEventListener?.("change", syncDisplayMode);
}

function warmUiIcons() {
  UI_ICON_URLS.forEach((url) => {
    const image = new Image();
    image.decoding = "async";
    image.loading = "eager";
    image.src = url;
  });
}

function scheduleBackgroundRefreshes() {
  const run = () => {
    refreshUnreleasedGamesOnOpen();
    refreshMissingDescriptionsOnOpen();
  };
  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(run, { timeout: 1200 });
    return;
  }
  window.setTimeout(run, 240);
}

function syncDisplayMode() {
  const standalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  const mobile = window.matchMedia("(max-width: 760px)").matches;
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

async function loadData() {
  state.settings = loadLocalSettings();
  const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
  if (saved) {
    state.games = normalizeGameRecords(JSON.parse(saved));
    persistLocal(false);
    return;
  }
  state.games = [];
  persistLocal(false);
}

async function pullCloudData() {
  try {
    const response = await fetch("/api/sync");
    if (!response.ok) return false;
    const data = await response.json();
    let changed = false;
    if (data.settings && typeof data.settings === "object") {
      const nextSettings = normalizeSettings(data.settings);
      if (JSON.stringify(nextSettings) !== JSON.stringify(state.settings)) {
        state.settings = nextSettings;
        persistLocalSettings();
        changed = true;
      }
    }
    if (Array.isArray(data.games) && data.games.length) {
      const nextGames = normalizeGameRecords(data.games);
      if (JSON.stringify(nextGames) !== JSON.stringify(state.games)) {
        state.games = nextGames;
        persistLocal(false);
        changed = true;
      }
    }
    return changed;
  } catch {
    // Static local preview has no Cloudflare function. Local data stays authoritative.
  }
  return false;
}

function persistLocal(shouldRender = true) {
  state.games = normalizeGameRecords(state.games);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.games));
  persistLocalSettings();
  if (shouldRender) render();
}

function loadLocalSettings() {
  try {
    return normalizeSettings(JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}"));
  } catch {
    return normalizeSettings({});
  }
}

function persistLocalSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
}

function normalizeSettings(settings = {}) {
  const migratedOrder = Array.isArray(settings.pageOrder)
    ? settings.pageOrder.flatMap((item) => item === "dashboard" ? ["calendar", "highlights"] : [item])
    : [];
  const pageOrder = migratedOrder.length
    ? migratedOrder.filter((item) => DEFAULT_PAGE_ORDER.includes(item))
    : [];
  const migratedHidden = Array.isArray(settings.hiddenSections)
    ? settings.hiddenSections.flatMap((item) => item === "dashboard" ? ["calendar", "highlights"] : [item])
    : [];
  const stores = Array.isArray(settings.stores)
    ? settings.stores.filter((store) => STORE_OPTIONS.includes(store))
    : DEFAULT_SETTINGS.stores;
  const hiddenSections = migratedHidden.filter((item) => LAYOUT_SECTION_KEYS.includes(item));
  return {
    ...DEFAULT_SETTINGS,
    ...settings,
    pageOrder: [...pageOrder, ...DEFAULT_PAGE_ORDER.filter((item) => !pageOrder.includes(item))],
    hiddenSections,
    theme: THEMES[settings.theme] ? settings.theme : DEFAULT_SETTINGS.theme,
    psnUser: cleanPsnUser(settings.psnUser) || DEFAULT_SETTINGS.psnUser,
    microsoftUser: cleanMicrosoftUser(settings.microsoftUser),
    steamUser: cleanSteamUser(settings.steamUser),
    currency: settings.currency === "USD" ? "USD" : "EUR",
    region: ["ES", "US", "UK"].includes(settings.region) ? settings.region : DEFAULT_SETTINGS.region,
    stores: stores.slice(0, 4),
    defaultOwner: cleanOwnerLabel(settings.defaultOwner) || DEFAULT_SETTINGS.defaultOwner,
  };
}

async function persistCloud() {
  const password = sessionStorage.getItem(`${SESSION_KEY}:password`) || "";
  try {
    await fetch("/api/sync", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-edit-password": password,
      },
      body: JSON.stringify({ games: state.games, settings: state.settings }),
    });
  } catch {
    // Local-only mode is expected before Cloudflare hosting.
  }
}

function render() {
  applyTheme();
  document.documentElement.classList.remove("theme-booting");
  document.body.classList.toggle("can-edit", state.canEdit);
  document.body.classList.toggle("list-view-mode", state.viewMode === "list");
  el.loginButton.innerHTML = state.canEdit ? `${pauseIcon()}<span class="button-label">Stop Editing</span>` : pencilIcon();
  el.loginButton.title = state.canEdit ? "Stop Editing" : "Edit";
  el.loginButton.setAttribute("aria-label", el.loginButton.title);
  el.addButton.hidden = false;
  el.syncButton.hidden = !state.canEdit;
  if (el.settingsButton) el.settingsButton.hidden = !state.canEdit;
  if (el.fetchDataButton) el.fetchDataButton.hidden = true;
  el.fetchPricesButton.hidden = !state.canEdit;
  if (state.canEdit && !el.fetchPricesButton.disabled) el.fetchPricesButton.innerHTML = `${currencyIcon()}<span class="button-label">Fetch New Prices</span>`;
  renderFilters();
  renderPlayingSection();
  renderStats();
  renderReleaseCalendar();
  syncMobileSectionToResults();
  renderMobileTabs();
  renderSection("backlog");
  renderSection("upcoming");
  renderSection("wanted");
  renderCompleted();
  renderFooter();
  scheduleMobilePaintRefresh();
  el.sortFilter.value = state.filters.sort;
  el.sortDirectionButton.innerHTML = sortArrowIcon(state.filters.direction === "desc");
  el.sortDirectionButton.title = state.filters.direction === "asc" ? "Sort ascending" : "Sort descending";
  el.sortDirectionButton.setAttribute("aria-label", el.sortDirectionButton.title);
  el.sortDirectionButton.classList.toggle("desc", state.filters.direction === "desc");
  renderViewToggle();
  applyPageOrder();
  el.preorderedFilter.checked = state.filters.preordered;
  el.platformFilter.classList.toggle("is-active", state.filters.platform !== "all");
  el.tagFilter.classList.toggle("is-active", state.filters.tag !== "all");
  updateScrollTopButton();
}

function applyTheme() {
  const themeKey = normalizeSettings(state.settings).theme;
  const theme = THEMES[themeKey] || THEMES.shabii;
  document.documentElement.dataset.initialTheme = themeKey;
  document.documentElement.classList.toggle("theme-kash", themeKey === "kash");
  document.body.classList.toggle("theme-kash", themeKey === "kash");
  document.title = theme.title;
  document.querySelector("meta[name='theme-color']")?.setAttribute("content", theme.themeColor);
  document.querySelector("meta[name='apple-mobile-web-app-title']")?.setAttribute("content", theme.shortName);
  document.querySelector("link[rel='icon']")?.setAttribute("href", theme.icon);
  document.querySelector("link[rel='apple-touch-icon']")?.setAttribute("href", theme.appIcon);
  const manifest = document.querySelector("link[rel='manifest']");
  if (manifest) manifest.setAttribute("href", themedManifestUrl(theme));
  const brandMark = document.querySelector(".brand-mark");
  const brandText = document.querySelector(".brand span:last-child");
  if (brandMark) brandMark.src = theme.icon;
  if (brandText) brandText.textContent = theme.title;
  el.brandLink?.setAttribute("aria-label", theme.title);
  el.brandLink?.setAttribute("href", themeKey === "kash" ? KASH_TWITCH_URL : "#backlog");
  el.brandLink?.toggleAttribute("target", themeKey === "kash");
  if (themeKey === "kash") {
    el.brandLink?.setAttribute("rel", "noreferrer");
  } else {
    el.brandLink?.removeAttribute("rel");
  }
}

function themedManifestUrl(theme) {
  const manifest = {
    name: theme.title,
    short_name: theme.shortName,
    description: `${theme.title} backlog and preorder tracker.`,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0a0b0f",
    theme_color: theme.themeColor,
    icons: [{
      src: `/${theme.appIcon}`,
      sizes: "400x400",
      type: "image/png",
      purpose: "any maskable",
    }],
  };
  return `data:application/manifest+json,${encodeURIComponent(JSON.stringify(manifest))}`;
}

function renderViewToggle() {
  renderModeToggle(el.viewToggleButton, state.viewMode);
}

function applyPageOrder() {
  const settings = normalizeSettings(state.settings);
  const order = settings.pageOrder;
  const hidden = new Set(settings.hiddenSections);
  const orderMap = new Map(order.map((key, index) => [key, index + 1]));
  const hasPlayingGames = activeGames().some((game) => game.playing);
  const hasFinishedGames = state.games.some((game) => !game.deletedAt && game.completedAt);
  el.playingSection.style.order = "0";
  el.achievementSection.style.order = String(orderMap.get("trophies") || 1);
  el.calendarSection.style.order = String(orderMap.get("calendar") || 2);
  el.highlightsSection.style.order = String(orderMap.get("highlights") || 3);
  document.querySelector(".toolbar").style.order = String(orderMap.get("search") || 4);
  document.querySelector(".mobile-section-tabs").style.order = String(orderMap.get("gamelist") || 5);
  el.board.style.order = String(orderMap.get("gamelist") || 5);
  document.querySelector("#completed").style.order = String(orderMap.get("finished") || 6);
  el.playingSection.hidden = hidden.has("playing") || !hasPlayingGames;
  el.achievementSection.hidden = hidden.has("trophies");
  el.calendarSection.hidden = hidden.has("calendar");
  el.highlightsSection.hidden = hidden.has("highlights");
  document.querySelector(".toolbar").hidden = hidden.has("search");
  document.querySelector(".mobile-section-tabs").hidden = hidden.has("gamelist");
  el.board.hidden = hidden.has("gamelist");
  document.querySelector("#completed").hidden = hidden.has("finished");
  el.playingFinished.hidden = hidden.has("latestFinished") || !hasFinishedGames;
}

function openSettingsDialog() {
  if (!state.canEdit || window.matchMedia("(max-width: 760px)").matches) return;
  renderSettingsDialog();
  el.settingsDialog.showModal();
  syncScrollLock();
}

function renderSettingsDialog() {
  state.settings = normalizeSettings(state.settings);
  el.settingsPsnUser.value = state.settings.psnUser;
  el.settingsMicrosoftUser.value = state.settings.microsoftUser;
  el.settingsSteamUser.value = state.settings.steamUser;
  el.settingsCurrency.value = state.settings.currency;
  el.settingsRegion.value = state.settings.region;
  el.settingsDefaultOwner.value = state.settings.defaultOwner;
  const pageIndex = new Map(state.settings.pageOrder.map((key, index) => [key, index]));
  el.settingsLayoutList.innerHTML = [
    settingsLayoutItem("playing", -1, { fixed: true }),
    settingsLayoutItem("latestFinished", -1, { fixed: true }),
    ...state.settings.pageOrder.map((key) => settingsLayoutItem(key, pageIndex.get(key) ?? 0)),
    settingsThemeItem(),
  ].join("");
  el.settingsStores.innerHTML = STORE_OPTIONS.map((store) => `
    <label class="check-filter toggle-check settings-store-check">
      <input type="checkbox" value="${escapeHtml(store)}" ${state.settings.stores.includes(store) ? "checked" : ""}>
      <span>${escapeHtml(store)}</span>
    </label>
  `).join("");
  el.settingsStores.querySelectorAll("input[type='checkbox']").forEach((input) => {
    input.addEventListener("change", () => {
      const checked = [...el.settingsStores.querySelectorAll("input[type='checkbox']:checked")];
      if (checked.length <= 4) return;
      input.checked = false;
    });
  });
  el.settingsLayoutList.querySelectorAll("[data-layout-move]").forEach((button) => {
    button.addEventListener("click", () => moveSettingsLayoutItem(button.dataset.layoutKey, Number(button.dataset.layoutMove)));
  });
  el.settingsLayoutList.querySelectorAll("[data-layout-hidden]").forEach((input) => {
    input.addEventListener("change", () => {
      const hidden = new Set(state.settings.hiddenSections || []);
      if (input.checked) hidden.delete(input.value);
      else hidden.add(input.value);
      state.settings.hiddenSections = [...hidden].filter((key) => LAYOUT_SECTION_KEYS.includes(key));
      renderSettingsDialog();
    });
  });
  el.settingsLayoutList.querySelector("[data-theme-select]")?.addEventListener("change", (event) => {
    state.settings.theme = event.target.value;
    applyTheme();
  });
}

function settingsLayoutItem(key, index, options = {}) {
  const title = {
    playing: "Currently Playing",
    trophies: "Achievements",
    calendar: "Calendar",
    highlights: "Highlights",
    search: "Search",
    gamelist: "Gamelist",
    finished: "Finished Games",
    latestFinished: "Last Finished",
  }[key] || key;
  const wireClass = {
    playing: "wire-playing",
    trophies: "wire-trophies",
    calendar: "wire-calendar",
    highlights: "wire-highlights",
    search: "wire-search",
    gamelist: "wire-list",
    finished: "wire-finished",
    latestFinished: "wire-latest-finished",
  }[key] || "";
  const fixed = Boolean(options.fixed);
  const visible = !(state.settings.hiddenSections || []).includes(key);
  return `
    <article class="settings-layout-card ${fixed ? "is-fixed" : ""} ${visible ? "" : "is-hidden-section"}" data-layout-key="${escapeHtml(key)}">
      <div class="settings-wire ${wireClass}" aria-hidden="true">${Array.from({ length: 6 }, () => "<span></span>").join("")}</div>
      <strong>${escapeHtml(title)}</strong>
      <div class="settings-layout-actions">
        ${fixed ? `<span class="settings-fixed-label">Fixed</span>` : `
          <button class="icon-button" type="button" data-layout-key="${escapeHtml(key)}" data-layout-move="-1" ${index === 0 ? "disabled" : ""} title="Move up" aria-label="Move ${escapeHtml(title)} up">↑</button>
          <button class="icon-button" type="button" data-layout-key="${escapeHtml(key)}" data-layout-move="1" ${index === state.settings.pageOrder.length - 1 ? "disabled" : ""} title="Move down" aria-label="Move ${escapeHtml(title)} down">↓</button>
        `}
        <label class="check-filter toggle-check settings-visible-check" title="${visible ? "Visible" : "Hidden"}">
          <input type="checkbox" value="${escapeHtml(key)}" data-layout-hidden ${visible ? "checked" : ""}>
          <span>${visible ? "Show" : "Hide"}</span>
        </label>
      </div>
    </article>
  `;
}

function moveSettingsLayoutItem(key, delta) {
  const order = [...state.settings.pageOrder];
  const index = order.indexOf(key);
  const nextIndex = index + delta;
  if (index < 0 || nextIndex < 0 || nextIndex >= order.length) return;
  [order[index], order[nextIndex]] = [order[nextIndex], order[index]];
  state.settings.pageOrder = order;
  renderSettingsDialog();
  applyPageOrder();
}

function settingsThemeItem() {
  return `
    <article class="settings-layout-card settings-theme-card" data-layout-key="theme">
      <div class="settings-wire wire-theme" aria-hidden="true"><span></span><span></span><span></span><span></span><span></span><span></span></div>
      <strong>Theme</strong>
      <label class="settings-theme-select">
        <span>Theme</span>
        <select data-theme-select aria-label="Theme">
          ${Object.entries(THEMES).map(([key, theme]) => `<option value="${escapeHtml(key)}" ${state.settings.theme === key ? "selected" : ""}>${escapeHtml(theme.name)}</option>`).join("")}
        </select>
      </label>
    </article>
  `;
}

async function saveSettingsFromForm(event) {
  event.preventDefault();
  const previousCurrency = state.settings.currency;
  const stores = [...el.settingsStores.querySelectorAll("input[type='checkbox']:checked")]
    .map((input) => input.value)
    .filter((store) => STORE_OPTIONS.includes(store))
    .slice(0, 4);
  const visibleSections = new Set([...el.settingsLayoutList.querySelectorAll("[data-layout-hidden]:checked")].map((input) => input.value));
  state.settings = normalizeSettings({
    ...state.settings,
    hiddenSections: LAYOUT_SECTION_KEYS.filter((key) => !visibleSections.has(key)),
    theme: el.settingsLayoutList.querySelector("[data-theme-select]")?.value || state.settings.theme,
    psnUser: el.settingsPsnUser.value,
    microsoftUser: el.settingsMicrosoftUser.value,
    steamUser: el.settingsSteamUser.value,
    currency: el.settingsCurrency.value,
    region: el.settingsRegion.value,
    stores,
    defaultOwner: el.settingsDefaultOwner.value,
  });
  persistLocalSettings();
  await persistCloud();
  el.settingsDialog.close();
  state.cardTrophies = {};
  refreshAchievements();
  render();
  if (previousCurrency !== state.settings.currency) await refreshAllPrices();
}

function renderModeToggle(button, mode) {
  if (!button) return;
  const showingGrid = mode === "grid";
  button.innerHTML = showingGrid ? gridIcon() : linesIcon();
  button.title = showingGrid ? "Grid view" : "List view";
  button.setAttribute("aria-label", button.title);
  button.classList.toggle("active", mode === "list");
}

function syncScrollLock() {
  document.body.classList.toggle("dialog-open", el.dialog.open || el.detailDialog.open || el.historyDialog.open || el.releaseDialog.open || el.platinumDialog.open || Boolean(el.settingsDialog?.open) || Boolean(el.authDialog?.open));
  if (document.body.classList.contains("dialog-open")) pauseAllPlayingTrailers();
  else scheduleFocusedPlayingTrailerUpdate();
  updateScrollTopButton();
}

function handleDetailClose() {
  if (state.detailReturnToHistory) {
    state.detailReturnToHistory = false;
    renderHistoryDialog();
    el.historyDialog.showModal();
    syncScrollLock();
    return;
  }
  syncScrollLock();
}

function renderPlayingSection() {
  const games = activeGames().filter((game) => game.playing);
  games.sort(comparePlayingGames);
  el.playingSection.hidden = !games.length;
  el.playingCount.textContent = `Playing ${games.length} ${games.length === 1 ? "game" : "games"}`;
  el.playingList.innerHTML = "";
  games.forEach((game) => el.playingList.appendChild(cardFor(game, { staticCard: true, imagePriority: "eager" })));
  bindPlayingTrailerFocus();
  renderPlayingFinished();
  schedulePlayingCardHeightSync();
  requestAnimationFrame(updatePlayingSliderControls);
  scheduleFocusedPlayingTrailerUpdate();
}

function renderPlayingFinished() {
  const games = state.games
    .filter((game) => !game.deletedAt && game.completedAt)
    .sort((a, b) => String(b.completedAt).localeCompare(String(a.completedAt)) || stringCompare(a.title, b.title))
    .slice(0, 10);
  el.playingFinished.hidden = !games.length;
  el.playingFinishedList.innerHTML = games.map((game) => {
    const achievementProgress = achievementProgressForGame(game);
    const progress = achievementProgress ? progressValue(achievementProgress.game) : 0;
    const badges = completedBadges(game, { includePsn: false });
    return `
      <button class="achievement-game playing-finished-game ${game.platinum ? "completed-trophy-card" : ""}" type="button" data-id="${escapeHtml(game.id)}" aria-label="${escapeHtml(`Open ${game.title}`)}">
        <img src="${escapeHtml(game.cover || platformLogo(game.platform || "PS5"))}" alt="" loading="lazy" decoding="async">
        <div>
          <strong class="${game.platinum ? "completed-achievements-title" : ""}">${escapeHtml(game.title)}</strong>
          ${badges ? `<span class="playing-finished-tags">${badges}</span>` : ""}
          <span>${escapeHtml([formatLongDate(game.completedAt), finishedDurationText(game.startedAt, game.completedAt)].filter(Boolean).join(" · "))}</span>
          ${achievementProgress ? `<em style="--progress:${progress}%"></em>` : ""}
        </div>
      </button>
    `;
  }).join("");
  el.playingFinishedList.querySelectorAll(".playing-finished-game").forEach((button) => {
    button.addEventListener("click", () => openDetail(button.dataset.id));
  });
  requestAnimationFrame(updatePlayingFinishedEdges);
}

function scrollToSearchArea() {
  document.querySelector(".toolbar")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function updatePlayingFinishedEdges() {
  const list = el.playingFinishedList;
  const maxScroll = Math.max(0, list.scrollWidth - list.clientWidth - 1);
  const hasOverflow = maxScroll > 2;
  el.playingFinished.classList.toggle("finished-at-start", !hasOverflow || list.scrollLeft <= 2);
  el.playingFinished.classList.toggle("finished-at-end", !hasOverflow || list.scrollLeft >= maxScroll);
  el.playingFinished.classList.toggle("finished-has-overflow", hasOverflow);
}

function slidePlaying(direction) {
  const card = el.playingList.querySelector(".game-card");
  const gap = Number.parseFloat(getComputedStyle(el.playingList).columnGap) || 0;
  const distance = card ? card.getBoundingClientRect().width + gap : el.playingList.clientWidth;
  el.playingList.scrollBy({ left: direction * distance, behavior: "smooth" });
}

function updatePlayingSliderControls() {
  const maxScroll = Math.max(0, el.playingList.scrollWidth - el.playingList.clientWidth - 1);
  const hasOverflow = maxScroll > 2;
  el.playingPrevButton.hidden = !hasOverflow;
  el.playingNextButton.hidden = !hasOverflow;
  el.playingPrevButton.disabled = !hasOverflow || el.playingList.scrollLeft <= 2;
  el.playingNextButton.disabled = !hasOverflow || el.playingList.scrollLeft >= maxScroll;
  el.playingSection.classList.toggle("playing-at-start", !hasOverflow || el.playingList.scrollLeft <= 2);
  el.playingSection.classList.toggle("playing-at-end", !hasOverflow || el.playingList.scrollLeft >= maxScroll);
}

function schedulePlayingCardHeightSync() {
  cancelAnimationFrame(state.playingHeightFrame);
  state.playingHeightFrame = requestAnimationFrame(() => {
    state.playingHeightFrame = requestAnimationFrame(equalizeMobilePlayingCards);
  });
}

function equalizeMobilePlayingCards() {
  state.playingHeightFrame = 0;
  el.playingList.style.removeProperty("--mobile-playing-card-height");
  if (!window.matchMedia("(max-width: 760px)").matches) return;
  const cards = [...el.playingList.querySelectorAll(".game-card.playing-card")];
  if (!cards.length) return;
  const height = Math.ceil(Math.max(...cards.map((card) => card.scrollHeight), 252));
  el.playingList.style.setProperty("--mobile-playing-card-height", `${height}px`);
}

async function refreshAchievements() {
  const psnUser = state.settings.psnUser || DEFAULT_SETTINGS.psnUser;
  el.achievementProfileLink.href = `https://psnprofiles.com/${encodeURIComponent(psnUser)}`;
  const psnRequest = (async () => {
    const response = await fetch(`/api/achievements?user=${encodeURIComponent(psnUser)}&schema=3`);
    return response.json();
  })();
  const [psnResult, steamResult, xboxResult] = await Promise.allSettled([psnRequest, fetchSteamActivity(), fetchXboxActivity()]);
  const psnData = psnResult.status === "fulfilled"
    ? psnResult.value
    : { user: psnUser, achievements: [], sourceUrl: "https://www.playstation.com/", source: "psn", authError: true };
  renderAchievements(
    psnData,
    steamResult.status === "fulfilled" ? steamResult.value : emptySteamActivity(),
    xboxResult.status === "fulfilled" ? xboxResult.value : emptyXboxActivity()
  );
  render();
}

async function fetchXboxActivity() {
  const params = new URLSearchParams();
  if (state.settings.microsoftUser) params.set("user", state.settings.microsoftUser);
  const response = await fetch(`/api/xbox-achievements${params.size ? `?${params}` : ""}`);
  const data = await response.json().catch(() => emptyXboxActivity());
  if (!response.ok || data.authError || data.error) {
    if (!data.needsSetup) console.warn("[trophies] Xbox activity unavailable", data.error || response.status);
    return emptyXboxActivity();
  }
  return data;
}

function emptyXboxActivity() {
  return { achievements: [], games: [], completed: [], totalEarned: 0, sourceUrl: "" };
}

async function fetchSteamActivity() {
  const steamUser = state.settings.steamUser || "";
  const steamGames = await fetchSteamAccountActivity(steamUser);
  state.steamOwnedAppIds = new Set(steamGames.map((game) => game.appId));
  const results = steamGames.map((steamGame) => {
    const game = steamActivityGame(steamGame);
    const achievements = Array.isArray(steamGame.achievements) ? steamGame.achievements : [];
    const earned = achievements.filter((achievement) => achievement.earned).length;
    const total = achievements.length;
    state.cardTrophies[`steam:${steamGame.appId}`] = { loading: false, achievements, trophies: achievements, earned, total };
    return { game, achievements, earned, total };
  }).filter((result) => result.total > 0);
  const achievements = results.flatMap(({ game, achievements }) => achievements
    .filter((achievement) => achievement.earned && achievement.earnedAt)
    .map((achievement) => ({
      title: achievement.title || "Achievement unlocked",
      game: game.title,
      earnedAt: achievement.earnedAt,
      rawEarnedAt: achievement.rawEarnedAt || achievement.earnedAt,
      rarity: "Steam",
      type: "achievement",
      icon: achievement.icon || platformLogo("Steam"),
      url: game.storeLinks?.steam || hltbUrlFor(game) || "",
      source: "steam",
      platform: "Steam",
    })));
  achievements.sort(compareEarnedTrophies);
  const completed = results
    .filter(({ earned, total }) => total > 0 && earned >= total)
    .map(({ game, achievements, earned, total }) => {
      const latest = achievements.filter((achievement) => achievement.earned).sort(compareEarnedTrophies)[0];
      return {
        title: game.title,
        cover: game.cover ? coverDisplayUrl(game.cover, "card") : steamLibraryCoverUrl(game.steamAppId),
        trophyName: "100% Achievements",
        trophyIcon: game.steamIcon || platformLogo("Steam"),
        earnedAt: latest?.earnedAt || formatLongDate(game.completedAt),
        rawEarnedAt: latest?.rawEarnedAt || game.completedAt || "",
        platform: "Steam",
        url: game.storeLinks?.steam || hltbUrlFor(game) || "",
        gameId: game.localGameId || "",
        source: "steam",
        earned,
        total,
      };
    });
  const totalEarned = results.reduce((sum, result) => sum + result.earned, 0);
  return {
    achievements,
    games: results.map(({ game, earned, total }) => ({ title: game.title, game: `${total ? Math.round((earned / total) * 100) : 0}% · ${earned}/${total} achievements` })),
    completed,
    totalEarned,
    sourceUrl: steamProfileUrl(steamUser),
  };
}

async function fetchSteamAccountActivity(steamUser = state.settings.steamUser || "") {
  const games = [];
  let cursor = 0;
  for (let page = 0; page < 20 && cursor !== null; page += 1) {
    const params = new URLSearchParams({ activity: "1", cursor: String(cursor), limit: "20", debug: "1" });
    if (steamUser) params.set("user", steamUser);
    const response = await fetch(`/api/steam-achievements?${params}`);
    const data = await response.json().catch(() => ({ games: [], error: "Invalid Steam activity response" }));
    if (!response.ok || data.needsSetup || data.authError || data.error) {
      console.warn("[trophies] Steam account activity unavailable", {
        status: response.status,
        error: data.error || "",
        debug: data.debug || "",
        needsSetup: Boolean(data.needsSetup),
        authError: Boolean(data.authError),
      });
      break;
    }
    games.push(...(Array.isArray(data.games) ? data.games : []));
    cursor = data.nextCursor !== null && Number.isFinite(Number(data.nextCursor)) ? Number(data.nextCursor) : null;
  }
  return games;
}

function steamActivityGame(steamGame) {
  const appId = cleanSteamAppId(steamGame.appId);
  const localGame = state.games.find((game) => !game.deletedAt && isPcGame(game) && steamAppIdFor(game) === appId);
  const storeUrl = `https://store.steampowered.com/app/${encodeURIComponent(appId)}`;
  return {
    ...(localGame || {}),
    id: localGame?.id || `steam-${appId}`,
    localGameId: localGame?.completedAt ? localGame.id : "",
    title: localGame?.title || steamGame.name || `Steam game ${appId}`,
    platform: "Steam",
    steamAppId: appId,
    steamIcon: steamGameIconUrl(steamGame),
    cover: localGame?.cover || steamLibraryCoverUrl(appId),
    storeLinks: { ...(localGame?.storeLinks || {}), steam: localGame?.storeLinks?.steam || storeUrl },
  };
}

function steamGameIconUrl(game) {
  const appId = cleanSteamAppId(game?.appId);
  const hash = String(game?.imgIconUrl || "").trim();
  return appId && hash ? `https://media.steampowered.com/steamcommunity/public/images/apps/${appId}/${hash}.jpg` : platformLogo("Steam");
}

function steamLibraryCoverUrl(appId) {
  const id = cleanSteamAppId(appId);
  return id ? `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${id}/library_600x900.jpg` : "";
}

function steamProfileUrl(user) {
  const value = String(user || "").trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  if (/^\d{17}$/.test(value)) return `https://steamcommunity.com/profiles/${encodeURIComponent(value)}/games/?tab=all`;
  return `https://steamcommunity.com/id/${encodeURIComponent(value)}/games/?tab=all`;
}

function emptySteamActivity() {
  return { achievements: [], games: [], completed: [], totalEarned: 0, sourceUrl: "" };
}

function steamAchievementParams(appId, steamUser = state.settings.steamUser || "") {
  const params = new URLSearchParams({ appId, debug: "1" });
  if (steamUser) params.set("user", steamUser);
  return params;
}

function renderAchievements(data = {}, steamData = state.steamActivity || emptySteamActivity(), xboxData = state.xboxActivity || emptyXboxActivity()) {
  const user = data.user || state.settings.psnUser || DEFAULT_SETTINGS.psnUser;
  const sourceUrl = data.sourceUrl || "https://www.playstation.com/";
  const platinums = Array.isArray(data.platinums) ? data.platinums : [];
  cachePlatinumMetadata(platinums);
  state.psnActivity = {
    achievements: Array.isArray(data.achievements) ? data.achievements : [],
    games: Array.isArray(data.games) ? data.games : [],
    platinums,
    summary: data.summary || null,
    sourceUrl,
  };
  state.steamActivity = {
    achievements: Array.isArray(steamData.achievements) ? steamData.achievements : [],
    games: Array.isArray(steamData.games) ? steamData.games : [],
    completed: Array.isArray(steamData.completed) ? steamData.completed : [],
    totalEarned: Number(steamData.totalEarned || 0),
    sourceUrl: steamData.sourceUrl || "",
  };
  state.xboxActivity = {
    achievements: Array.isArray(xboxData.achievements) ? xboxData.achievements : [],
    games: Array.isArray(xboxData.games) ? xboxData.games : [],
    completed: Array.isArray(xboxData.completed) ? xboxData.completed : [],
    totalEarned: Number(xboxData.totalEarned || 0),
    sourceUrl: xboxData.sourceUrl || "",
  };
  renderPlayingSection();
  el.achievementProfileLink.href = sourceUrl;
  const activitySources = ["PSN", state.steamActivity.achievements.length ? "Steam" : "", state.xboxActivity.achievements.length ? "Xbox" : ""].filter(Boolean);
  el.achievementProfileLink.textContent = `${activitySources.join(" + ")} activity`;
  const achievements = [...state.psnActivity.achievements, ...state.steamActivity.achievements, ...state.xboxActivity.achievements]
    .sort(compareEarnedTrophies)
    .slice(0, 6);
  const games = Array.isArray(data.games) ? data.games.slice(0, 3) : [];
  if (!achievements.length) {
    const fallbackText = data.needsSetup
      ? "Set PSN_NPSSO in Cloudflare to show recent PSN trophy activity here."
      : data.authError
        ? "PSN token needs refreshing. Update PSN_NPSSO in Cloudflare."
        : data.blocked
          ? "The public tracker is blocking embedded scraping, but your profile is one click away."
          : "No recent achievement activity found yet.";
    el.achievementPanel.innerHTML = `
      <a class="achievement-fallback" href="${escapeHtml(sourceUrl)}" target="_blank" rel="noreferrer">
        <img src="${escapeHtml(platformLogo("PS5"))}" alt="">
        <div>
          <strong>Achievement activity</strong>
          <span>${escapeHtml(fallbackText)}</span>
        </div>
      </a>
    `;
    return;
  }

  const trophyCards = achievements.map((item, index) => {
    const platform = achievementPlatformLabel(item);
    return `
      <a class="achievement-card ${index === 0 ? "latest" : ""} trophy-${escapeHtml(trophyTone(item.rarity))}" href="${escapeHtml(item.url || sourceUrl)}" target="_blank" rel="noreferrer">
        <img class="achievement-icon" src="${escapeHtml(item.icon || platformLogo(item.source === "steam" ? "Steam" : item.source === "xbox" ? "Xbox" : "PS5"))}" alt="">
        <div>
          <strong>${escapeHtml(item.title || (item.source === "steam" ? "Achievement unlocked" : "Trophy unlocked"))}</strong>
          ${item.game ? `<span class="achievement-game-name">${escapeHtml(item.game)}</span>` : ""}
          <span class="achievement-card-meta playing-finished-tags">
            ${platformBadge(platform)}
            ${item.earnedAt ? `<span class="achievement-earned-date">${escapeHtml(item.earnedAt)}</span>` : ""}
          </span>
        </div>
      </a>
    `;
  }).join("");
  const dashboard = achievementDashboard(achievements, games, sourceUrl, data.summary, state.steamActivity, state.xboxActivity);
  el.achievementPanel.innerHTML = `${dashboard}<span class="achievement-subtitle trophy-subtitle">Latest Achievements</span>${trophyCards}`;
  el.achievementPanel.querySelector("[data-action='platinums']")?.addEventListener("click", openPlatinumDialog);
  scheduleMobilePaintRefresh();
}

function achievementDashboard(achievements, games, sourceUrl, summary = null, steamActivity = emptySteamActivity(), xboxActivity = emptyXboxActivity()) {
  const trophies = summary?.trophies || {};
  const playStationCompleted = Number(trophies.platinum || 0);
  const pcCompleted = Number(steamActivity.completed?.length || 0);
  const xboxCompleted = Number(xboxActivity.completed?.length || 0);
  const completedCount = playStationCompleted + pcCompleted + xboxCompleted;
  const counts = [
    ["Platinum", Number(trophies.platinum || 0)],
    ["Gold", Number(trophies.gold || 0)],
    ["Silver", Number(trophies.silver || 0)],
    ["Bronze", Number(trophies.bronze || 0)],
  ];
  const psnTrophyTotal = counts.reduce((sum, [, count]) => sum + count, 0);
  const total = Math.max(1, psnTrophyTotal);
  const achievementTotal = psnTrophyTotal + Number(steamActivity.totalEarned || 0) + Number(xboxActivity.totalEarned || 0);
  const latestPlatinum = achievements.find((item) => trophyTone(item.rarity) === "platinum") || steamActivity.completed?.[0] || xboxActivity.completed?.[0];
  const average = games.length
    ? Math.round(games.reduce((sum, game) => sum + progressValue(game.game), 0) / games.length)
    : 0;
  return `
    <div class="achievement-summary">
      <button class="achievement-kpi platinum-highlight ${latestPlatinum ? "has-platinum" : ""}" type="button" data-action="platinums">
        <strong class="kpi-with-icon">${trophyIcon()}${escapeHtml(String(completedCount))}</strong>
        <span>COMPLETED</span>
        ${achievementKpiBreakdown([
          [pcCompleted, completedCount, "PC"],
          [xboxCompleted, completedCount, "Xbox"],
          [playStationCompleted, completedCount, "PlayStation"],
        ])}
      </button>
      <a class="achievement-kpi trophy-kpi" href="${escapeHtml(sourceUrl)}" target="_blank" rel="noreferrer">
        <strong>${escapeHtml(String(achievementTotal))}</strong>
        <span>TROPHIES</span>
        ${achievementKpiBreakdown([
          [steamActivity.totalEarned || 0, achievementTotal, "PC"],
          [xboxActivity.totalEarned || 0, achievementTotal, "Xbox"],
          [psnTrophyTotal, achievementTotal, "PlayStation"],
        ])}
      </a>
      <a class="achievement-kpi" href="${escapeHtml(sourceUrl)}" target="_blank" rel="noreferrer">
        <strong>${escapeHtml(String(summary?.level || average || 0))}</strong>
        <span>${summary?.level ? `LEVEL <small>${escapeHtml(String(summary.progress || 0))}% next</small>` : "LATEST GAME AVG"}</span>
      </a>
      <div class="rarity-graph" aria-label="Trophy rarity graph">
        ${counts.map(([type, count]) => `
          <span class="rarity-bar rarity-${escapeHtml(type.toLowerCase())}" title="${escapeHtml(`${type}: ${count}`)}">
            <em style="--bar:${trophyBarHeight(count, counts)}%"></em>
            <small>${escapeHtml(type)}</small>
            <strong>${escapeHtml(String(count))}</strong>
          </span>
        `).join("")}
      </div>
    </div>
  `;
}

function achievementPlatformLabel(item) {
  if (item?.source === "steam") return "Steam";
  return String(item?.platform || "PlayStation").trim() || "PlayStation";
}

function achievementKpiBreakdown(rows) {
  return `<span class="kpi-breakdown" aria-hidden="true">${rows.map(([value, totalValue, platform]) => `
    <small class="kpi-breakdown-pill kpi-breakdown-${escapeHtml(normalizeTag(platform))}"><strong>${escapeHtml(String(value))}</strong> out of ${escapeHtml(String(totalValue))} on ${escapeHtml(platform)}</small>
  `).join("")}</span>`;
}

function openPlatinumDialog() {
  const platinums = platinumItems();
  const years = platinumYears(platinums);
  if (state.platinumYear !== "all" && !years.includes(state.platinumYear)) state.platinumYear = "all";
  renderPlatinumDialog(platinums, years);
  el.platinumDialog.showModal();
  syncScrollLock();
  hydratePlatinumCovers(platinums);
}

function renderPlatinumDialog(platinums = platinumItems(), years = platinumYears(platinums)) {
  const selected = state.platinumYear;
  const platforms = platinumPlatforms(platinums);
  if (state.platinumPlatform !== "all" && !platforms.includes(state.platinumPlatform)) state.platinumPlatform = "all";
  const visible = sortedPlatinums(platinums.filter((item) => (
    (selected === "all" || platinumYearFor(item) === selected)
    && (state.platinumPlatform === "all" || platinumPlatformFor(item) === state.platinumPlatform)
  )));
  el.platinumTitle.innerHTML = `${trophyIcon()} <span>COMPLETED</span>`;
  el.platinumCount.textContent = `${visible.length} completed`;
  el.platinumList.classList.toggle("list-view", state.platinumViewMode === "list");
  renderModeToggle(el.platinumViewToggleButton, state.platinumViewMode);
  el.platinumSortSelect.value = state.platinumSort;
  el.platinumSortDirection.innerHTML = sortArrowIcon(state.platinumDirection === "desc");
  el.platinumSortDirection.title = state.platinumDirection === "asc" ? "Sort ascending" : "Sort descending";
  el.platinumSortDirection.setAttribute("aria-label", el.platinumSortDirection.title);
  el.platinumSortDirection.classList.toggle("desc", state.platinumDirection === "desc");
  el.platinumSortSelect.onchange = () => {
    state.platinumSort = el.platinumSortSelect.value || "time";
    renderPlatinumDialog(platinums, years);
  };
  el.platinumSortDirection.onclick = () => {
    state.platinumDirection = state.platinumDirection === "asc" ? "desc" : "asc";
    renderPlatinumDialog(platinums, years);
  };
  el.platinumYearSelect.innerHTML = platinums.length ? [
    `<option value="all">All</option>`,
    ...years.map((year) => `<option value="${escapeHtml(year)}">${escapeHtml(year)}</option>`),
  ].join("") : `<option value="all">No completed</option>`;
  el.platinumYearSelect.value = selected;
  el.platinumYearSelect.onchange = () => {
    state.platinumYear = el.platinumYearSelect.value || "all";
    renderPlatinumDialog(platinums, years);
  };
  el.platinumPlatformSelect.innerHTML = [
    `<option value="all">All</option>`,
    ...platforms.map((platform) => `<option value="${escapeHtml(platform)}">${escapeHtml(platinumPlatformLabel(platform))}</option>`),
  ].join("");
  el.platinumPlatformSelect.value = state.platinumPlatform;
  el.platinumPlatformSelect.onchange = () => {
    state.platinumPlatform = el.platinumPlatformSelect.value || "all";
    renderPlatinumDialog(platinums, years);
  };
  el.platinumList.innerHTML = visible.length ? visible.map(platinumCard).join("") : `<div class="empty">No completed games tracked yet.</div>`;
  el.platinumList.querySelectorAll("[data-game-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const gameId = button.dataset.gameId;
      el.platinumDialog.close();
      openDetail(gameId);
    });
  });
}

function sortedPlatinums(platinums) {
  const direction = state.platinumDirection === "asc" ? 1 : -1;
  return [...platinums].sort((a, b) => {
    if (state.platinumSort === "name") {
      return direction * (stringCompare(a.trophyName || "Platinum", b.trophyName || "Platinum") || stringCompare(a.title, b.title));
    }
    return direction * (platinumTimeValue(a) - platinumTimeValue(b) || stringCompare(a.title, b.title));
  });
}

function platinumTimeValue(item) {
  const raw = item.rawEarnedAt || item.earnedAt || "";
  const time = new Date(raw).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function platinumItems() {
  const psnPlatinums = (state.psnActivity.platinums || []).map((item) => {
    const localGame = localGameForTitle(item.title);
    const cachedMeta = cachedPlatinumMetadata(item.title);
    const manualMeta = manualPlatinumMetaForItem(item);
    return {
      title: item.title || "Platinum game",
      cover: platinumCoverFor(item),
      trophyName: manualMeta?.trophyName || (item.trophyName && item.trophyName !== "Platinum" ? item.trophyName : (cachedMeta?.trophyName || item.trophyName || "Platinum")),
      trophyIcon: manualMeta?.icon || item.icon || cachedMeta?.icon || platformLogo("PS5"),
      earnedAt: item.earnedAt || "",
      rawEarnedAt: item.rawEarnedAt || "",
      platform: item.platform || localGame?.platform || "",
      url: item.url || state.psnActivity.sourceUrl || "",
      gameId: localGame?.completedAt ? localGame.id : "",
    };
  });
  const steamCompleted = (state.steamActivity.completed || []).map((item) => ({
    ...item,
    cover: item.cover || localCoverForTitle(item.title, "card"),
    trophyIcon: item.trophyIcon || platformLogo("Steam"),
    trophyName: item.trophyName || "100% Achievements",
    platform: item.platform || "Steam",
  }));
  const xboxCompleted = (state.xboxActivity.completed || []).map((item) => {
    const localGame = localXboxGameForTitle(item.title);
    return {
      ...item,
      cover: item.cover || localGame?.cover || "",
      trophyIcon: item.trophyIcon || platformLogo("Xbox"),
      trophyName: item.trophyName || "100% Achievements",
      platform: item.platform || "Xbox",
      gameId: localGame?.completedAt ? localGame.id : "",
    };
  });
  if (psnPlatinums.length || steamCompleted.length || xboxCompleted.length) return [...psnPlatinums, ...steamCompleted, ...xboxCompleted];
  return state.games
    .filter((game) => !game.deletedAt && game.platinum)
    .sort((a, b) => String(b.completedAt || "").localeCompare(String(a.completedAt || "")) || stringCompare(a.title, b.title))
    .map((game) => ({
      title: game.title,
      cover: game.cover ? coverDisplayUrl(game.cover, "card") : "",
      trophyName: "Platinum",
      trophyIcon: platformLogo("PS5"),
      earnedAt: formatLongDate(game.completedAt),
      rawEarnedAt: game.completedAt || "",
      platform: game.platform || "",
      url: matchedPsnGame(game)?.url || "",
      gameId: game.id,
    }));
}

function localGameForTitle(title) {
  const normalized = normalizeTitleForMatch(title);
  if (!normalized) return null;
  const candidates = state.games
    .map((game) => ({ game, gameTitle: normalizeTitleForMatch(game.title) }))
    .filter((entry) => entry.gameTitle && compatibleTitleNumbers(normalized, entry.gameTitle) && (
      entry.gameTitle === normalized
      || entry.gameTitle.includes(normalized)
      || normalized.includes(entry.gameTitle)
    ));
  return candidates
    .sort((a, b) => {
      if (a.gameTitle === normalized && b.gameTitle !== normalized) return -1;
      if (b.gameTitle === normalized && a.gameTitle !== normalized) return 1;
      return b.gameTitle.length - a.gameTitle.length;
    })[0]?.game || null;
}

function localXboxGameForTitle(title) {
  return state.games
    .filter((game) => !game.deletedAt && isMicrosoftAchievementGame(game))
    .map((game) => ({ game, score: psnTitleMatchScore(game.title, title) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || stringCompare(a.game.title, b.game.title))[0]?.game || null;
}

function compatibleTitleNumbers(a, b) {
  const numbersA = titleNumberTokens(a);
  const numbersB = titleNumberTokens(b);
  if (!numbersA.size && !numbersB.size) return true;
  if (numbersA.size !== numbersB.size) return false;
  return [...numbersA].every((number) => numbersB.has(number));
}

function titleNumberTokens(value) {
  return new Set(String(value || "").match(/\d+/g) || []);
}

function localCoverForTitle(title, size = "card") {
  const match = localGameForTitle(title);
  return match?.cover ? coverDisplayUrl(match.cover, size) : "";
}

function platinumCoverFor(input) {
  const title = platinumInputTitle(input);
  const normalized = normalizeTitleForMatch(title);
  if (!normalized) return "";
  const cached = state.platinumCoverCache[normalized];
  return manualPlatinumCoverForItem(input) || localCoverForTitle(title, "card") || (cached === "__missing" ? "" : cached || "");
}

function manualPlatinumCoverForItem(input) {
  const title = platinumInputTitle(input);
  const normalized = normalizeTitleForMatch(title);
  if (!normalized) return "";
  return MANUAL_PLATINUM_COVER_OVERRIDES.find((entry) => manualPlatinumEntryMatches(entry, normalized, input))?.cover || "";
}

function manualPlatinumMetaForItem(input) {
  const title = platinumInputTitle(input);
  const normalized = normalizeTitleForMatch(title);
  if (!normalized) return null;
  return MANUAL_PLATINUM_META_OVERRIDES.find((entry) => manualPlatinumEntryMatches(entry, normalized, input)) || null;
}

function platinumInputTitle(input) {
  return typeof input === "string" ? input : input?.title || "";
}

function manualPlatinumEntryMatches(entry, normalized, input = {}) {
  const haystack = normalizeTitleForMatch([
    typeof input === "string" ? input : "",
    input?.title,
    input?.icon,
    input?.trophyIcon,
    input?.npCommunicationId,
    input?.npServiceName,
    input?.url,
  ].filter(Boolean).join(" "));
  const idMatch = (entry.ids || []).some((id) => haystack.includes(normalizeTitleForMatch(id)));
  if (idMatch) return true;
  const includesTerm = (term) => {
    const normalizedTerm = normalizeTitleForMatch(term);
    return Boolean(normalizedTerm && normalized.includes(normalizedTerm));
  };
  const hasMatches = entry.match.every(includesTerm);
  const hasExcluded = (entry.exclude || []).some(includesTerm);
  return hasMatches && !hasExcluded;
}

function loadPlatinumMetaCache() {
  try {
    const parsed = JSON.parse(localStorage.getItem(PLATINUM_META_CACHE_KEY) || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function cachePlatinumMetadata(platinums = []) {
  let changed = false;
  platinums.forEach((item) => {
    const key = normalizeTitleForMatch(item.title);
    const icon = String(item.icon || "").trim();
    const trophyName = String(item.trophyName || "").trim();
    if (!key || !icon) return;
    const current = platinumMetaCache[key] || {};
    const next = {
      trophyName: trophyName && trophyName !== "Platinum" ? trophyName : current.trophyName || trophyName,
      icon,
    };
    if (next.trophyName !== current.trophyName || next.icon !== current.icon) {
      platinumMetaCache[key] = next;
      changed = true;
    }
  });
  if (changed) {
    try {
      localStorage.setItem(PLATINUM_META_CACHE_KEY, JSON.stringify(platinumMetaCache));
    } catch {
      // Platinum metadata cache is optional.
    }
  }
}

function cachedPlatinumMetadata(title) {
  const key = normalizeTitleForMatch(title);
  return key ? platinumMetaCache[key] || null : null;
}

async function hydratePlatinumCovers(platinums) {
  const missing = platinums
    .filter((item) => !localCoverForTitle(item.title) && !state.platinumCoverCache[normalizeTitleForMatch(item.title)])
    .slice(0, 32);
  if (!missing.length) return;
  await Promise.all(missing.map(async (item) => {
    const key = normalizeTitleForMatch(item.title);
    if (!key) return;
    try {
      const result = await lookupFirstResult(item.title);
      state.platinumCoverCache[key] = result?.cover ? coverDisplayUrl(result.cover, "card") : "__missing";
    } catch {
      state.platinumCoverCache[key] = "__missing";
    }
  }));
  if (el.platinumDialog.open) renderPlatinumDialog(platinumItems(), platinumYears(platinumItems()));
}

function platinumYears(platinums) {
  return [...new Set(platinums.map(platinumYearFor).filter(Boolean))].sort((a, b) => b.localeCompare(a));
}

function platinumPlatforms(platinums) {
  return [...new Set(platinums.map(platinumPlatformFor).filter(Boolean))].sort((a, b) => stringCompare(platinumPlatformLabel(a), platinumPlatformLabel(b)));
}

function platinumPlatformFor(item) {
  const raw = String(item.platform || "").trim();
  const platform = canonicalPlatform(raw);
  if (isPlayStationPlatform(platform) || /(playstation|ps[1-5]|psp|psvita|pspc)/.test(normalizeTag(raw))) return "PlayStation";
  if (["Xbox PC", "Xbox Series", "Xbox", "X360", "XOne"].includes(platform)) return "Xbox";
  return platform || raw;
}

function platinumPlatformLabel(platform) {
  return platform === "PlayStation" ? "PlayStation" : platformDisplayName(platform);
}

function platinumYearFor(item) {
  const raw = item.rawEarnedAt || item.earnedAt || "";
  const date = new Date(raw);
  if (!Number.isNaN(date.getTime())) return String(date.getFullYear());
  const match = String(raw).match(/\b(20\d{2}|19\d{2})\b/);
  return match ? match[1] : "";
}

function platinumCard(item) {
  const artStyle = item.cover ? ` style="--platinum-art: url(&quot;${escapeHtml(cssUrl(item.cover))}&quot;)"` : "";
  const artClass = item.cover ? " has-platinum-art" : "";
  const coverPreview = item.cover
    ? `<img class="platinum-cover-preview" src="${escapeHtml(item.cover)}" alt="">`
    : "";
  const content = `
    ${item.cover ? `<span class="platinum-art-layer" aria-hidden="true"></span>` : ""}
    <span class="platinum-icon-wrap">
      <img class="platinum-icon" src="${escapeHtml(item.trophyIcon)}" alt="${escapeHtml(item.trophyName || "Platinum")}">
      ${coverPreview}
    </span>
    <div class="platinum-main">
      <strong>${escapeHtml(item.trophyName || "Platinum")}</strong>
      <span class="platinum-game">${escapeHtml(item.title)}</span>
      <span class="platinum-earned">${escapeHtml([item.platform, item.earnedAt].filter(Boolean).join(" · "))}</span>
    </div>
  `;
  if (item.gameId) {
    return `<button class="platinum-card platinum-card-button${artClass}" type="button" data-game-id="${escapeHtml(item.gameId)}"${artStyle}>${content}</button>`;
  }
  if (item.url) {
    return `<a class="platinum-card${artClass}" href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer"${artStyle}>${content}</a>`;
  }
  return `<article class="platinum-card${artClass}"${artStyle}>${content}</article>`;
}

function trophyBarHeight(count, counts) {
  const max = Math.max(1, ...counts.map(([, value]) => value));
  if (!count) return 8;
  const scaled = Math.log1p(count) / Math.log1p(max);
  return Math.round(18 + scaled * 82);
}

function achievementGameCard(game, sourceUrl) {
  const progress = progressValue(game.game);
  return `
    <a class="achievement-game" href="${escapeHtml(game.url || sourceUrl)}" target="_blank" rel="noreferrer">
      <img src="${escapeHtml(game.icon || platformLogo("PS5"))}" alt="">
      <div>
        <strong>${escapeHtml(game.title || "Recent game")}</strong>
        <span>${escapeHtml([game.game, game.earnedAt].filter(Boolean).join(" · "))}</span>
        <em style="--progress:${progress}%"></em>
      </div>
    </a>
  `;
}

function progressValue(text) {
  const match = String(text || "").match(/(\d+(?:\.\d+)?)%/);
  if (!match) return 0;
  return Math.max(0, Math.min(100, Number(match[1])));
}

function trophyTone(value) {
  const text = String(value || "").toLowerCase();
  if (text.includes("platinum")) return "platinum";
  if (text.includes("gold")) return "gold";
  if (text.includes("silver")) return "silver";
  if (text.includes("bronze")) return "bronze";
  return "generic";
}

function renderStats() {
  const active = filteredGames({ applyPreorder: false }).filter((game) => !game.completedAt);
  const total = active.length;
  const currentYear = String(new Date().getFullYear());
  const completedThisYear = completedGamesForYear(currentYear).length;
  const counts = {
    wanted: active.filter((game) => game.section === "wanted").length,
    upcoming: active.filter((game) => game.section === "upcoming").length,
    backlog: active.filter((game) => game.section === "backlog").length,
    completed: state.games.filter((game) => game.completedAt && !game.deletedAt).length,
  };
  el.stats.innerHTML = [
    stat(`Finished ${currentYear}`, completedThisYear, "done", { action: "completed", detail: completedStatDetail(currentYear, completedThisYear, counts.completed) }),
    stat("Backlog", counts.backlog, "backlog", { detail: sectionStatDetail("backlog", active, total) }),
    stat("To Release", counts.upcoming, "release", { detail: sectionStatDetail("upcoming", active, total) }),
    stat("Available", counts.wanted, "available", { detail: sectionStatDetail("wanted", active, total) }),
  ].join("");
  const completedStat = el.stats.querySelector("[data-stat-action='completed']");
  completedStat?.addEventListener("click", scrollToCompletedSection);
  completedStat?.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      scrollToCompletedSection();
    }
  });
  el.stats.querySelectorAll("[data-stat-detail]:not([data-stat-action])").forEach((node) => {
    node.addEventListener("click", () => {
      node.classList.toggle("detail-open");
    });
    node.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      node.classList.toggle("detail-open");
    });
  });
  for (const [section, count] of Object.entries(counts)) {
    const node = document.querySelector(`#${section}Count`);
    if (node) node.innerHTML = sectionCountLabel(section, active, count);
  }
}

function stat(label, value, tone = "", options = {}) {
  const attrs = [
    options.action ? `data-stat-action="${escapeHtml(options.action)}"` : "",
    options.detail ? "data-stat-detail" : "",
    options.action || options.detail ? 'role="button" tabindex="0"' : "",
  ].filter(Boolean).join(" ");
  return `<div class="stat ${tone ? `stat-${tone}` : ""} ${options.action ? "stat-action" : ""}"${attrs ? ` ${attrs}` : ""}><strong>${value}</strong><span>${label}</span>${options.detail || ""}</div>`;
}

function sectionStatDetail(section, games, total) {
  const sectionGames = games.filter((game) => game.section === section);
  const preordered = sectionGames.filter((game) => game.preorderStore).length;
  return `
    <div class="stat-detail">
      <span>${sectionGames.length} ${sectionGames.length === 1 ? "game" : "games"}</span>
      ${preordered ? `<span class="preorder-count-pill">${preordered} preordered</span>` : ""}
      <b>Total ${total}</b>
    </div>
  `;
}

function completedStatDetail(year, yearCount, total) {
  return `
    <div class="stat-detail">
      <span>${yearCount} ${yearCount === 1 ? "game" : "games"} in ${escapeHtml(year)}</span>
      ${yearCount ? `<span class="completed-year-count-pill">${yearCount} completed of ${total} this year</span>` : ""}
      <b>Total ${total} finished ${total === 1 ? "game" : "games"}</b>
    </div>
  `;
}

function scrollToCompletedSection() {
  document.querySelector("#completed")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function sectionCountLabel(section, games, count) {
  const preordered = games.filter((game) => game.section === section && game.preorderStore).length;
  return [
    `${count} ${count === 1 ? "game" : "games"}`,
    preordered ? `<span class="preorder-count-pill">${preordered} preordered</span>` : "",
  ].filter(Boolean).join("");
}

function renderReleaseCalendar() {
  const releases = releaseGamesByDate();
  const months = releaseCalendarMonths(4);
  const today = localDateKey(new Date());
  el.releaseCalendar.innerHTML = `
    <div class="release-calendar-head">
      <div class="release-calendar-actions">
        <button class="ghost-button calendar-today-action" type="button" data-calendar-today>Today</button>
        <button class="icon-button" type="button" data-calendar-shift="-1" title="Previous month" aria-label="Previous month">←</button>
        <button class="icon-button" type="button" data-calendar-shift="1" title="Next month" aria-label="Next month">→</button>
      </div>
    </div>
    <div class="release-months-frame glass">
      <div class="release-months">
        ${months.map((month) => releaseMonthMarkup(month, releases, today)).join("")}
      </div>
    </div>
  `;
  el.releaseCalendar.querySelectorAll("[data-calendar-shift]").forEach((button) => {
    button.addEventListener("click", () => {
      state.releaseCalendarOffset += Number(button.dataset.calendarShift || 0);
      renderReleaseCalendar();
    });
  });
  el.releaseCalendar.querySelector("[data-calendar-today]")?.addEventListener("click", () => {
    state.releaseCalendarOffset = 0;
    renderReleaseCalendar();
  });
  el.releaseCalendar.querySelectorAll(".release-day.has-release").forEach((button) => {
    button.addEventListener("click", () => openReleaseDialog(button.dataset.date));
  });
}

function releaseGamesByDate() {
  const groups = new Map();
  state.games
    .filter((game) => !game.deletedAt && !game.completedAt && game.section === "upcoming" && validReleaseDate(game.releaseDate))
    .forEach((game) => {
      const key = dateOnly(game.releaseDate);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(game);
    });
  groups.forEach((games) => games.sort((a, b) => stringCompare(a.title, b.title)));
  return groups;
}

function releaseCalendarMonths(count) {
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  return Array.from({ length: count }, (_, index) => new Date(start.getFullYear(), start.getMonth() + state.releaseCalendarOffset + index, 1));
}

function releaseMonthMarkup(monthDate, releases, today) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const leading = mondayWeekdayIndex(new Date(year, month, 1));
  const cells = [];
  for (let index = 0; index < leading; index += 1) {
    cells.push(`<span class="release-day empty" aria-hidden="true"></span>`);
  }
  for (let day = 1; day <= totalDays; day += 1) {
    const date = localDateKey(new Date(year, month, day));
    const games = releases.get(date) || [];
    const preordered = games.some((game) => game.preorderStore);
    const platformTone = releasePlatformTone(games);
    const titles = games.map((game) => game.title).join("\n");
    cells.push(`
      <button
        class="release-day ${games.length ? "has-release" : ""} ${platformTone} ${preordered ? "has-preorder" : ""} ${date === today ? "today" : ""}"
        type="button"
        data-date="${escapeHtml(date)}"
        data-games="${escapeHtml(games.map((game) => game.title).join(" · "))}"
        title="${escapeHtml(titles)}"
        ${games.length ? "" : "disabled"}
      >
        <span>${day}</span>
        ${games.length > 1 ? `<em>${games.length}</em>` : ""}
      </button>
    `);
  }
  while (cells.length < 42) {
    cells.push(`<span class="release-day empty" aria-hidden="true"></span>`);
  }
  return `
    <article class="release-month">
      <header>
        <strong>${escapeHtml(monthName(monthDate))}</strong>
        <span>${year}</span>
      </header>
      <div class="release-weekdays" aria-hidden="true">
        <span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span>
      </div>
      <div class="release-days">${cells.join("")}</div>
    </article>
  `;
}

function releasePlatformTone(games) {
  const platforms = unique(games.map((game) => canonicalPlatform(game.platform)).filter(Boolean));
  if (platforms.length !== 1) return games.length ? "release-platform-mixed" : "";
  const platform = platforms[0].toLowerCase();
  const cls = platformClass(platform);
  if (["platform-nintendo", "platform-wii", "platform-wiiu", "platform-n64", "platform-gamecube", "platform-nes", "platform-snes", "platform-ds", "platform-3ds"].includes(cls)) return "release-platform-nintendo";
  if (cls === "platform-playstation") return "release-platform-playstation";
  if (cls === "platform-xbox") return "release-platform-xbox";
  if (platform.includes("steam") || platform.includes("pc")) return "release-platform-pc";
  return "release-platform-generic";
}

function openReleaseDialog(date) {
  const games = releaseGamesByDate().get(date) || [];
  if (!games.length) return;
  el.releaseDialogTitle.textContent = formatLongDate(date);
  el.releaseDialogList.innerHTML = "";
  games.forEach((game) => el.releaseDialogList.appendChild(cardFor(game, { staticCard: true })));
  el.releaseDialog.showModal();
  syncScrollLock();
}

function mondayWeekdayIndex(date) {
  return (date.getDay() + 6) % 7;
}

function monthName(date) {
  return new Intl.DateTimeFormat("en-US", { month: "long" }).format(date);
}

function localDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function validReleaseDate(value) {
  const date = dateOnly(value);
  if (!date) return false;
  const year = Number(date.slice(0, 4));
  return year >= 1990;
}

function topCounts(games, mapper, limit = 0) {
  const counts = new Map();
  games.forEach((game) => {
    const values = [mapper(game)].flat().filter(Boolean);
    values.forEach((value) => counts.set(value, (counts.get(value) || 0) + 1));
  });
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1] || stringCompare(a[0], b[0]));
  return limit ? sorted.slice(0, limit) : sorted;
}

function platformCounts(games) {
  return topCounts(games, (game) => canonicalPlatform(game.platform));
}

function renderMobileTabs() {
  el.mobileTabs.forEach((button) => {
    const active = button.dataset.mobileSection === state.mobileSection;
    button.classList.toggle("active", active);
  });
  document.body.dataset.mobileSection = state.mobileSection;
}

function handleBoardSwipeStart(event) {
  if (!window.matchMedia("(max-width: 760px)").matches) return;
  const touch = event.changedTouches?.[0];
  if (!touch) return;
  state.mobileSwipeStart = { x: touch.clientX, y: touch.clientY };
}

function handleBoardSwipeEnd(event) {
  const start = state.mobileSwipeStart;
  state.mobileSwipeStart = null;
  if (!start || !window.matchMedia("(max-width: 760px)").matches) return;
  const touch = event.changedTouches?.[0];
  if (!touch) return;
  const dx = touch.clientX - start.x;
  const dy = touch.clientY - start.y;
  if (Math.abs(dx) < 34 || Math.abs(dx) < Math.abs(dy) * 1.15) return;
  const sections = ["backlog", "upcoming", "wanted"];
  const index = sections.indexOf(state.mobileSection);
  const next = dx < 0 ? sections[index + 1] : sections[index - 1];
  if (!next) return;
  state.mobileSection = next;
  render();
}

function syncMobileSectionToResults() {
  if (!state.filters.query && !state.filters.preordered) return;
  const sections = state.filters.preordered ? ["upcoming", "backlog", "wanted"] : ["backlog", "upcoming", "wanted"];
  const hasCurrent = filteredGames().some((game) => (
    game.section === state.mobileSection
    && !game.completedAt
    && !game.playing
  ));
  if (hasCurrent) return;
  const next = sections.find((section) => filteredGames().some((game) => (
    game.section === section
    && !game.completedAt
    && !game.playing
  )));
  if (next) state.mobileSection = next;
}

function renderFilters() {
  const active = state.games.filter((game) => !game.deletedAt);
  const platforms = unique(active.map((game) => platformFilterGroup(game.platform)).filter(Boolean));
  const genres = unique(active.flatMap((game) => game.genres || []));
  fillSelect(el.platformFilter, ["all", ...platforms], state.filters.platform, "All platforms");
  fillSelect(el.tagFilter, ["all", ...genres], state.filters.tag, "All categories");
}

function fillSelect(select, values, selected, allLabel) {
  const current = [...select.options].map((option) => option.value).join("|");
  const next = values.join("|");
  if (current === next) {
    select.value = values.includes(selected) ? selected : "all";
    updateSelectOverflowTitle(select);
    return;
  }
  select.innerHTML = values.map((value) => {
    const label = value === "all" ? allLabel : platformDisplayName(value);
    return `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`;
  }).join("");
  select.value = values.includes(selected) ? selected : "all";
  updateSelectOverflowTitle(select);
}

function handleSelectOverflowTitle(event) {
  const select = event.target.closest?.("select");
  if (!select) return;
  const isClipped = updateSelectOverflowTitle(select);
  if (isClipped) showSelectOverflowPopover(select);
}

function handleSelectOverflowLeave(event) {
  const select = event.target.closest?.("select");
  if (!select) return;
  hideSelectOverflowPopover();
}

function updateSelectOverflowTitle(select) {
  const text = select.selectedOptions?.[0]?.textContent?.trim() || "";
  if (!text) {
    select.classList.remove("is-clipped");
    if (selectOverflowPopover?.dataset.owner === select.id) hideSelectOverflowPopover();
    return false;
  }
  if (!selectMeasureContext) {
    selectMeasureContext = document.createElement("canvas").getContext("2d");
  }
  const style = getComputedStyle(select);
  selectMeasureContext.font = [
    style.fontStyle,
    style.fontVariant,
    style.fontWeight,
    style.fontSize,
    style.fontFamily,
  ].join(" ");
  const paddingLeft = parseFloat(style.paddingLeft) || 0;
  const paddingRight = parseFloat(style.paddingRight) || 0;
  const availableWidth = select.clientWidth - paddingLeft - paddingRight - 4;
  const isClipped = selectMeasureContext.measureText(text).width > availableWidth;
  select.classList.toggle("is-clipped", isClipped);
  if (!isClipped && selectOverflowPopover?.dataset.owner === select.id) hideSelectOverflowPopover();
  return isClipped;
}

function showSelectOverflowPopover(select) {
  if (!selectOverflowPopover) {
    selectOverflowPopover = document.createElement("div");
    selectOverflowPopover.className = "select-overflow-popover";
    document.body.appendChild(selectOverflowPopover);
  }
  const text = select.selectedOptions?.[0]?.textContent?.trim() || "";
  if (!text) return;
  selectOverflowPopover.textContent = text;
  selectOverflowPopover.dataset.owner = select.id || "";
  const rect = select.getBoundingClientRect();
  const popoverRect = selectOverflowPopover.getBoundingClientRect();
  const left = Math.min(Math.max(rect.left, 12), window.innerWidth - popoverRect.width - 12);
  const top = rect.bottom + 6 > window.innerHeight - popoverRect.height - 12
    ? rect.top - popoverRect.height - 6
    : rect.bottom + 6;
  selectOverflowPopover.style.left = `${left}px`;
  selectOverflowPopover.style.top = `${Math.max(12, top)}px`;
  selectOverflowPopover.classList.add("visible");
}

function hideSelectOverflowPopover() {
  if (!selectOverflowPopover) return;
  selectOverflowPopover.classList.remove("visible");
  selectOverflowPopover.dataset.owner = "";
}

function renderSection(section) {
  const list = document.querySelector(`.card-list[data-section="${section}"]`);
  const games = filteredGames().filter((game) => game.section === section && !game.completedAt && !game.playing);
  games.sort((a, b) => compareGames(a, b, section));
  list.innerHTML = "";
  list.classList.toggle("list-view", state.viewMode === "list");
  if (!games.length) {
    const query = el.searchInput.value.trim();
    list.innerHTML = emptyGamesMarkup(query);
    list.querySelector("[data-add-search]")?.addEventListener("click", () => addGameFromSearch(query, section));
    return;
  }
  const fragment = document.createDocumentFragment();
  games.forEach((game, index) => {
    fragment.appendChild(state.viewMode === "list"
      ? rowFor(game, section, { imagePriority: index < 10 ? "eager" : "lazy" })
      : cardFor(game, { imagePriority: index < 6 ? "eager" : "lazy" }));
  });
  list.appendChild(fragment);
  if (state.viewMode === "list") requestAnimationFrame(() => updateRowTitleOverflow(list));
  if (state.viewMode === "grid" && section === "backlog" && state.filters.sort === "custom") setupDrag(list);
}

function emptyGamesMarkup(query) {
  if (!query) return `<div class="empty">No games here.</div>`;
  return `
    <div class="empty empty-with-action">
      <span>No games found for "${escapeHtml(query)}".</span>
      <button class="primary-button" type="button" data-add-search>
        <span class="button-label">Add Game</span>
        <span class="button-icon" aria-hidden="true">${plusIcon()}</span>
      </button>
    </div>
  `;
}

function updateRowTitleOverflow(list) {
  list.querySelectorAll(".game-row-identity strong").forEach((title) => {
    title.classList.toggle("is-overflowing", title.scrollWidth > title.clientWidth + 1);
  });
}

function updateAllRowTitleOverflow() {
  document.querySelectorAll(".card-list.list-view").forEach(updateRowTitleOverflow);
}

function rowFor(game, section, options = {}) {
  const row = document.createElement("article");
  const statuses = gameStatuses(game);
  const owners = ownerTags(game);
  const showRowPrices = section !== "backlog" && priceProvidersForGame(game).length;
  row.className = "game-row";
  row.dataset.id = game.id;
  row.dataset.owner = statuses.join(" ");
  row.setAttribute("role", "button");
  row.tabIndex = 0;
  row.setAttribute("aria-label", `Open ${game.title}`);
  row.classList.toggle("owner-card-judy", owners.includes("Judy"));
  row.classList.toggle("owner-card-jordi", owners.includes("Jordi"));
  row.classList.toggle("digital-card", Boolean(game.digital));
  row.classList.toggle("stream-card", Boolean(game.stream));
  row.innerHTML = `
    <span class="game-row-cover-wrap" ${game.cover ? "" : "hidden"}>
      <img class="game-row-cover" src="${escapeHtml(game.cover ? coverDisplayUrl(game.cover, "tiny") : "")}" alt="" loading="${escapeHtml(options.imagePriority || "lazy")}" decoding="async">
      <img class="game-row-cover-preview" src="${escapeHtml(game.cover ? coverDisplayUrl(game.cover, "card") : "")}" alt="" loading="lazy" decoding="async" aria-hidden="true">
    </span>
    <div class="game-row-identity">
      <strong class="${game.platinum ? "completed-achievements-title" : ""} ${owners.includes("Judy") ? "owner-judy" : ""} ${owners.includes("Jordi") ? "owner-jordi" : ""}" tabindex="0">${escapeHtml(game.title)}</strong>
      ${studioText(game) ? `<span>${escapeHtml(studioText(game))}</span>` : ""}
    </div>
    <div class="game-row-core">${rowCoreStats(game)}</div>
    <div class="game-row-tags">${rowTags(game).join("")}</div>
    ${showRowPrices ? `<div class="game-row-prices">${rowPrices(game)}</div>` : ""}
    <div class="game-row-actions">
      <button class="icon-button row-edit-action" type="button" title="Edit" aria-label="Edit">${pencilIcon()}</button>
      ${rowPrimaryAction(game, section)}
    </div>
  `;
  row.addEventListener("click", (event) => {
    if (event.target.closest("button, input, a")) return;
    openDetail(game.id);
  });
  row.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    if (event.target.closest("button, input, a")) return;
    event.preventDefault();
    openDetail(game.id);
  });
  row.querySelector(".row-edit-action").addEventListener("click", () => openEditor(game.id));
  row.querySelector(".row-primary-action")?.addEventListener("click", () => {
    if (section === "backlog") startPlaying(game.id);
    else moveToBacklog(game.id);
  });
  return row;
}

function rowPrimaryAction(game, section) {
  if (section === "backlog") return `<button class="primary-button row-primary-action" type="button">Play</button>`;
  return `<button class="ghost-button row-primary-action" type="button">Got it</button>`;
}

function rowCoreStats(game) {
  const progress = achievementProgressForGame(game);
  const release = releaseStatus(game);
  return [
    game.platform ? platformBadge(game.platform) : "",
    game.digital ? `<span class="digital-pill">Digital</span>` : "",
    game.emulator ? `<span class="emulator-pill">Emulator</span>` : "",
    game.lengthHours ? timeBadge(game.lengthHours, hltbUrlFor(game)) : "",
    game.stream ? `<span class="stream-pill">Stream</span>` : "",
    release ? `<span class="release-pill">${escapeHtml(release)}</span>` : "",
    ...ownerTags(game).filter((owner) => owner !== (state.settings.defaultOwner || DEFAULT_SETTINGS.defaultOwner)).map(ownerBadge),
    ...gameStatuses(game).map(statusBadge),
    game.coop ? `<span class="coop-pill">Coop</span>` : "",
    game.replayCount ? replayBadge(game.replayCount) : "",
    progress ? psnProgressBadge(progress) : "",
  ].filter(Boolean).join("");
}

function rowTags(game) {
  return chipsFor(game);
}

function rowPrices(game) {
  return normalizedPrices(game).map((price) => {
    const hasPrice = Boolean(price.price);
    return `
      <a class="row-price-link ${hasPrice ? "has-price" : "missing-price"}" href="${escapeHtml(price.url)}" target="_blank" rel="noreferrer" title="${escapeHtml(price.store)}">
        <img class="store-icon" src="${escapeHtml(storeIcon(price.store))}" alt="" width="14" height="14" decoding="async">
        <strong>${escapeHtml(hasPrice ? price.price : price.store.replace(/ España|\.es/g, ""))}</strong>
      </a>
    `;
  }).join("");
}

function renderCompleted() {
  const list = document.querySelector(".completed-list");
  if (!list) return;
  list.classList.toggle("list-view", state.viewMode === "list");
  const years = completedYears();
  const selectedYear = el.completedYearFilter?.value || state.completedYear || "all";
  state.completedYear = selectedYear;
  if (state.completedYear !== "all" && !years.includes(state.completedYear)) state.completedYear = "all";
  renderCompletedYearFilter(years);
  const filteredFinishedGames = filteredGames({ applyPreorder: false }).filter((game) => game.completedAt);
  const visibleFinishedGames = filteredFinishedGames.filter((game) => state.completedYear === "all" || completionYear(game) === state.completedYear);
  const games = sortedCompletedGames(visibleFinishedGames);
  const pageSize = completedPageSize();
  const shownGames = games.slice(0, pageSize * state.completedVisiblePages);
  const hasMore = games.length > shownGames.length;
  list.classList.toggle("is-collapsed", hasMore);
  updateCompletedCount(completedCountForSelectedYear());
  list.innerHTML = shownGames.length ? shownGames.map((game) => `
    <div class="completed-row ${game.stream ? "stream-card" : ""} ${game.platinum ? "completed-trophy-card" : ""}" data-id="${escapeHtml(game.id)}" role="button" tabindex="0" aria-label="${escapeHtml(`Open ${game.title}`)}">
      <img class="completed-cover" src="${escapeHtml(game.cover || "")}" alt="" loading="lazy" decoding="async" ${game.cover ? "" : "hidden"}>
      <div class="completed-main">
        <strong class="${game.platinum ? "completed-achievements-title" : ""}">${escapeHtml(game.title)}</strong>
        <span class="completed-platform">${completedBadges(game)}</span>
        <span class="completed-dates">${escapeHtml(historyRangeText(game))}</span>
        ${completedDurationLine(game)}
      </div>
      <div class="completed-actions">
        <button class="icon-button completed-edit-action" type="button" title="Edit" aria-label="Edit">${pencilIcon()}</button>
        <button class="ghost-button restore-action" type="button">Backlog</button>
      </div>
    </div>
  `).join("") : `<div class="empty">Finished games will stay saved here.</div>`;
  if (el.completedMoreButton) {
    el.completedMoreButton.hidden = !hasMore;
    el.completedMoreButton.textContent = "See more";
  }
  list.querySelectorAll(".completed-edit-action").forEach((button) => {
    button.addEventListener("click", () => openEditor(button.closest(".completed-row").dataset.id));
  });
  list.querySelectorAll(".restore-action").forEach((button) => {
    button.addEventListener("click", () => restoreCompletedToBacklog(button.closest(".completed-row").dataset.id));
  });
  list.querySelectorAll(".completed-row").forEach((row) => {
    row.addEventListener("click", (event) => {
      if (event.target.closest("button, input, a")) return;
      openDetail(row.dataset.id);
    });
    row.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      if (event.target.closest("button, input, a")) return;
      event.preventDefault();
      openDetail(row.dataset.id);
    });
  });
}

function renderCompletedYearFilter(years) {
  if (!el.completedYearControl || !el.completedYearFilter) return;
  const showFilter = years.length > 1;
  el.completedYearControl.hidden = !showFilter;
  if (!showFilter) return;
  el.completedYearFilter.innerHTML = [
    `<option value="all">All</option>`,
    ...years.map((year) => `<option value="${escapeHtml(year)}">${escapeHtml(year)}</option>`),
  ].join("");
  el.completedYearFilter.value = state.completedYear;
}

function completedPageSize() {
  if (state.viewMode === "list" || window.matchMedia("(max-width: 1120px)").matches) return 10;
  return 30;
}

function renderFooter() {
  if (el.footerDataUpdate) {
    const latest = latestGameUpdateDate();
    el.footerDataUpdate.textContent = latest ? `Last edit ${formatFooterDate(latest)}` : "Last edit -";
  }
  if (el.footerVersion) {
    el.footerVersion.textContent = `${SITE_VERSION} · Updated ${formatFooterDateTime(SITE_UPDATED_AT)}`;
  }
}

function latestGameUpdateDate() {
  const times = state.games
    .flatMap((game) => [game.editedAt, game.createdAt].filter(Boolean))
    .map((value) => Date.parse(value))
    .filter((time) => Number.isFinite(time));
  if (!times.length) return "";
  return new Date(Math.max(...times)).toISOString();
}

function formatFooterDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, { day: "numeric", month: "long" }).format(date);
}

function formatFooterDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function handleCompletedYearChange(event) {
  state.completedYear = event.target.value || "all";
  state.completedVisiblePages = 1;
  renderCompleted();
}

function updateCompletedCount(count) {
  if (!el.completedCount) return;
  el.completedCount.innerHTML = `${count} ${count === 1 ? "game" : "games"}`;
}

function completedCountForSelectedYear() {
  return state.games.filter((game) => !game.deletedAt
    && game.completedAt
    && (state.completedYear === "all" || completionYear(game) === state.completedYear)).length;
}

function sortedCompletedGames(games) {
  const direction = state.filters.direction === "asc" ? 1 : -1;
  return [...games].sort((a, b) => {
    const streamSort = compareStreamFirst(a, b);
    if (streamSort) return streamSort;
    if (state.filters.sort === "title") {
      return direction * (stringCompare(a.title, b.title) || String(b.completedAt).localeCompare(String(a.completedAt)));
    }
    if (state.filters.sort === "platform") {
      return direction * (stringCompare(canonicalPlatform(a.platform), canonicalPlatform(b.platform)) || stringCompare(a.title, b.title));
    }
    if (state.filters.sort === "added") {
      return direction * (addedTimeValue(a) - addedTimeValue(b) || stringCompare(a.title, b.title));
    }
    if (state.filters.sort === "playtime") {
      return direction * (completedPlaytimeValue(a) - completedPlaytimeValue(b) || String(b.completedAt).localeCompare(String(a.completedAt)) || stringCompare(a.title, b.title));
    }
    return direction * (completionTimeValue(b) - completionTimeValue(a) || stringCompare(a.title, b.title));
  });
}

function openHistoryDialog() {
  state.historyYear = completedYears()[0] || String(new Date().getFullYear());
  renderHistoryDialog();
  el.historyDialog.showModal();
  syncScrollLock();
}

function renderHistoryDialog() {
  const years = completedYears();
  if (!years.includes(state.historyYear)) state.historyYear = years[0] || String(new Date().getFullYear());
  el.historyYearTabs.innerHTML = years.length ? years.map((year) => `
    <button class="year-tab ${year === state.historyYear ? "active" : ""}" type="button" data-year="${escapeHtml(year)}">
      ${escapeHtml(year)}
      <span>${completedGamesForYear(year).length}</span>
    </button>
  `).join("") : `<span class="empty-inline">No finished games yet.</span>`;
  el.historyYearTabs.querySelectorAll(".year-tab").forEach((button) => {
    button.addEventListener("click", () => {
      state.historyYear = button.dataset.year;
      renderHistoryDialog();
    });
  });

  const games = completedGamesForYear(state.historyYear);
  el.historyList.innerHTML = games.length ? games.map((game) => `
    <div class="history-row ${game.platinum ? "completed-trophy-card" : ""}" data-id="${escapeHtml(game.id)}" role="button" tabindex="0" aria-label="${escapeHtml(`Open ${game.title}`)}">
      <img class="completed-cover" src="${escapeHtml(game.cover || "")}" alt="" loading="lazy" decoding="async" ${game.cover ? "" : "hidden"}>
      <div>
        <strong class="${game.platinum ? "completed-achievements-title" : ""}">${escapeHtml(game.title)}</strong>
        <span class="completed-platform">${completedBadges(game)}</span>
        <span>${escapeHtml(historyRangeText(game))}</span>
        ${completedDurationLine(game)}
      </div>
      <button class="icon-button history-edit-action" type="button" title="Edit" aria-label="Edit">${pencilIcon()}</button>
    </div>
  `).join("") : `<div class="empty">No games finished in ${escapeHtml(state.historyYear)}.</div>`;
  el.historyList.querySelectorAll(".history-edit-action").forEach((button) => {
    button.addEventListener("click", () => {
      el.historyDialog.close();
      openEditor(button.closest(".history-row").dataset.id);
    });
  });
  el.historyList.querySelectorAll(".history-row").forEach((row) => {
    row.addEventListener("click", (event) => {
      if (event.target.closest("button, input, a")) return;
      el.historyDialog.close();
      openDetail(row.dataset.id, { returnToHistory: true });
    });
    row.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      if (event.target.closest("button, input, a")) return;
      event.preventDefault();
      el.historyDialog.close();
      openDetail(row.dataset.id, { returnToHistory: true });
    });
  });
}

function completedYears(games = state.games) {
  return unique(games
    .filter((game) => game.completedAt && !game.deletedAt)
    .map((game) => completionYear(game))
    .filter(Boolean))
    .sort((a, b) => Number(b) - Number(a));
}

function completedGamesForYear(year) {
  return state.games
    .filter((game) => !game.deletedAt && game.completedAt && completionYear(game) === String(year))
    .sort((a, b) => String(b.completedAt).localeCompare(String(a.completedAt)) || stringCompare(a.title, b.title));
}

function completionTimeValue(game) {
  const time = Date.parse(game.completedAt || "");
  return Number.isNaN(time) ? 0 : time;
}

function addedTimeValue(game) {
  const time = Date.parse(game.createdAt || game.updatedAt || "");
  return Number.isNaN(time) ? 0 : time;
}

function completedPlaytimeValue(game) {
  const start = Date.parse(dateOnly(game.startedAt));
  const done = Date.parse(dateOnly(game.completedAt));
  if (Number.isNaN(start) || Number.isNaN(done)) return 0;
  return Math.max(0, done - start);
}

function completionYear(game) {
  const date = dateOnly(game.completedAt);
  return date ? date.slice(0, 4) : "";
}

function historyRangeText(game) {
  const start = formatLongDate(game.startedAt);
  const done = formatLongDate(game.completedAt);
  if (start && done) return `${start} -> ${done}`;
  if (done) return `Finished ${done}`;
  if (start) return `Started ${start}`;
  return "No dates";
}

function completedDurationLine(game) {
  const duration = finishedDurationText(game.startedAt, game.completedAt);
  return duration ? `<span class="completed-duration">${escapeHtml(duration)}</span>` : "";
}

function finishedDurationText(startValue, doneValue) {
  const start = dateOnly(startValue);
  const done = dateOnly(doneValue);
  if (!start || !done) return "";
  const [startYear, startMonth, startDay] = start.split("-").map(Number);
  const [doneYear, doneMonth, doneDay] = done.split("-").map(Number);
  const startTime = new Date(startYear, startMonth - 1, startDay).getTime();
  const doneTime = new Date(doneYear, doneMonth - 1, doneDay).getTime();
  if (!Number.isFinite(startTime) || !Number.isFinite(doneTime) || doneTime < startTime) return "";
  let years = doneYear - startYear;
  let months = doneMonth - startMonth;
  let days = doneDay - startDay;
  if (days < 0) {
    months -= 1;
    days += daysInMonth(doneYear, doneMonth - 1);
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  if (!years && !months && !days) days = 1;
  return [
    years ? plural(years, "year") : "",
    months ? plural(months, "month") : "",
    days ? plural(days, "day") : "",
  ].filter(Boolean).join(" ");
}

function nextReplayCountForTitle(title, currentId = "") {
  const normalizedTitle = normalizeReplayTitle(title);
  if (!normalizedTitle) return 0;
  const matches = state.games.filter((game) => (
    !game.deletedAt
    && game.completedAt
    && game.id !== currentId
    && normalizeReplayTitle(game.title) === normalizedTitle
  ));
  if (!matches.length) return 0;
  return Math.max(0, ...matches.map((game) => replayCountValue(game.replayCount))) + 1;
}

function normalizeReplayTitle(value) {
  return normalizeTag(retailTitle(value));
}

function replayCountValue(value) {
  const count = Number(value);
  return Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
}

function plural(value, label) {
  return `${value} ${label}${value === 1 ? "" : "s"}`;
}

function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

function updateCompletedDate(id, key, value) {
  if (!state.canEdit) return;
  const game = getGame(id);
  if (!game) return;
  game[key] = value;
  if (key === "completedAt" && !value) {
    game.section = "backlog";
    game.platinum = false;
  }
  markGameEdited(game);
  upsertGame(game);
}

function activeGames() {
  return state.games.filter((game) => !game.completedAt && !game.deletedAt);
}

function filteredGames(options = {}) {
  const { applyPreorder = true } = options;
  return state.games.filter((game) => {
    if (game.deletedAt) return false;
    const haystack = [
      game.title,
      game.platform,
      game.description,
      game.notes,
      game.preorderStore,
      game.preferredStore,
      game.developer,
      game.publisher,
      game.digital ? "digital" : "",
      game.coop ? "coop" : "",
      game.platinum ? "completed trophy platinum" : "",
      game.replayCount ? `replay replayed ${game.replayCount}` : "",
      game.playing ? "playing" : "",
      game.startedAt,
      game.completedAt,
      ...(game.genres || []),
      ...(game.statuses || []),
      ...(game.tags || []),
      ...(game.owners || []),
    ].join(" ").toLowerCase();
    const tagText = [...(game.genres || []), ...gameStatuses(game), canonicalStatus(game.preorderStore), canonicalStatus(game.preferredStore)].filter(Boolean);
    return (!state.filters.query || haystack.includes(state.filters.query))
      && (state.filters.platform === "all" || platformFilterGroup(game.platform) === state.filters.platform)
      && (state.filters.tag === "all" || tagText.includes(state.filters.tag))
      && (!applyPreorder || !state.filters.preordered || Boolean(game.preorderStore));
  });
}

function cardFor(game, options = {}) {
  const card = el.template.content.firstElementChild.cloneNode(true);
  const statuses = gameStatuses(game);
  const owners = ownerTags(game);
  card.dataset.id = game.id;
  card.dataset.owner = statuses.join(" ");
  card.draggable = !options.staticCard && state.canEdit && game.section === "backlog" && state.filters.sort === "custom";
  card.classList.toggle("owner-card-judy", owners.includes("Judy"));
  card.classList.toggle("owner-card-jordi", owners.includes("Jordi"));
  card.classList.toggle("digital-card", Boolean(game.digital));
  card.classList.toggle("playing-card", Boolean(game.playing));
  card.classList.toggle("stream-card", Boolean(game.stream));
  card.classList.toggle("completed-trophy-card", Boolean(game.platinum));
  const trailer = card.querySelector(".card-trailer");
  const trailerUrl = shouldShowCardTrailer(game) ? trailerEmbedUrl(game.trailerUrl) : "";
  if (trailerUrl) {
    card.classList.add("has-trailer");
    trailer.dataset.src = trailerUrl;
    trailer.innerHTML = "";
  } else {
    trailer.remove();
  }
  const img = card.querySelector("img");
  img.hidden = !game.cover;
  img.src = game.cover ? coverDisplayUrl(game.cover) : "";
  img.alt = game.cover ? `${game.title} cover` : "";
  img.loading = options.imagePriority || "lazy";
  img.fetchPriority = options.imagePriority === "eager" ? "high" : "low";
  img.decoding = "async";
  if (game.playing && game.cover) upgradeCoverIfFast(img, game.cover, "playing");
  if (game.playing && game.cover) img.addEventListener("load", schedulePlayingCardHeightSync, { once: true });
  card.classList.toggle("has-art", Boolean(game.cover));
  if (game.cover) {
    card.style.setProperty("--card-art", `url("${cssUrl(backgroundCoverUrl(game.cover))}")`);
    setupCardParallax(card);
  }
  card.querySelector("h3").textContent = game.title;
  card.querySelector("h3").classList.toggle("owner-judy", owners.includes("Judy"));
  card.querySelector("h3").classList.toggle("owner-jordi", owners.includes("Jordi"));
  card.querySelector("h3").classList.toggle("completed-achievements-title", Boolean(game.platinum));
  const titleOwners = card.querySelector(".title-owners");
  titleOwners.innerHTML = owners.filter((owner) => owner !== (state.settings.defaultOwner || DEFAULT_SETTINGS.defaultOwner)).map(ownerBadge).join("");
  titleOwners.hidden = !titleOwners.innerHTML;
  const studioLine = card.querySelector(".studio-line");
  studioLine.textContent = studioText(game);
  studioLine.hidden = !studioLine.textContent;
  card.querySelector(".meta").innerHTML = metaFor(game, { includePsn: !game.playing }).join("");
  const playDates = card.querySelector(".play-dates");
  playDates.innerHTML = playDatesFor(game).join("");
  playDates.hidden = !playDates.innerHTML;
  card.querySelector(".chips").innerHTML = chipsFor(game).join("");
  const trophyStrip = card.querySelector(".card-trophies");
  trophyStrip.innerHTML = game.playing ? cardTrophiesFor(game) : "";
  trophyStrip.hidden = !trophyStrip.innerHTML;
  trophyStrip.addEventListener("click", (event) => {
    if (event.target.closest("a")) {
      event.stopPropagation();
      return;
    }
    event.preventDefault();
    openDetail(game.id);
  }, true);
  const description = card.querySelector(".notes");
  description.textContent = shortDescription(game.description || "");
  description.hidden = !description.textContent;
  const prices = card.querySelector(".prices");
  const priceRefreshAction = card.querySelector(".price-refresh-action");
  const boughtAction = card.querySelector(".bought-action");
  const backlogAction = card.querySelector(".backlog-action");
  const completeAction = card.querySelector(".complete-action");
  const trophyAction = card.querySelector(".trophy-action");
  if (game.section === "backlog" || game.completedAt) {
    prices.remove();
    priceRefreshAction.remove();
    boughtAction.remove();
    if (game.playing) backlogAction.addEventListener("click", () => returnPlayingToBacklog(game.id));
    else backlogAction.remove();
    completeAction.innerHTML = game.playing
      ? `${checkIcon()}<span class="action-label">Finished</span>`
      : `<span class="action-label">Play</span>`;
    completeAction.addEventListener("click", () => {
      if (game.playing) completeGame(game.id);
      else startPlaying(game.id);
    });
    trophyAction.hidden = !game.playing;
    trophyAction.classList.toggle("active", Boolean(game.platinum));
    trophyAction.addEventListener("click", () => completeGameWithTrophy(game.id));
  } else {
    backlogAction.remove();
    completeAction.remove();
    trophyAction.remove();
    const providers = priceProvidersForGame(game);
    if (providers.length) {
      prices.style.setProperty("--price-columns", providers.length);
      prices.innerHTML = pricesFor(game);
      priceRefreshAction.addEventListener("click", () => refreshPricesForGame(game.id));
    } else {
      prices.remove();
      priceRefreshAction.remove();
    }
    boughtAction.addEventListener("click", () => moveToBacklog(game.id));
  }
  card.querySelector(".edit-action").addEventListener("click", () => openEditor(game.id));
  const trailerToggle = card.querySelector(".trailer-toggle");
  if (trailerUrl) {
    trailerToggle.hidden = false;
    trailerToggle.innerHTML = pauseIcon();
    trailerToggle.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleCardTrailer(card);
    });
  } else {
    trailerToggle.remove();
  }
  card.querySelector(".cover-button").addEventListener("click", () => openDetail(game.id));
  card.querySelector(".delete-action").addEventListener("click", () => deleteGame(game.id));
  card.querySelectorAll(".psn-progress-pill").forEach((node) => {
    node.addEventListener("click", (event) => {
      event.stopPropagation();
      openDetail(game.id);
    });
  });
  card.addEventListener("click", (event) => {
    if (event.target.closest("button, a")) return;
    openDetail(game.id);
  });
  return card;
}

function trailerFrame(url) {
  if (directTrailerUrl(url)) {
    return `<video src="${escapeHtml(url)}" muted loop playsinline preload="none" aria-hidden="true"></video>`;
  }
  return `<iframe src="${escapeHtml(url)}" title="" tabindex="-1" loading="lazy" aria-hidden="true" allow="autoplay; encrypted-media; picture-in-picture"></iframe>`;
}

function toggleCardTrailer(card) {
  const trailer = card.querySelector(".card-trailer");
  const button = card.querySelector(".trailer-toggle");
  if (!trailer || !button) return;
  const isPaused = card.classList.toggle("trailer-user-paused");
  if (isPaused) pauseCardTrailer(card);
  else updateFocusedPlayingTrailer();
  button.innerHTML = isPaused ? playIcon() : pauseIcon();
  button.title = isPaused ? "Play trailer" : "Pause trailer";
  button.setAttribute("aria-label", button.title);
}

function bindPlayingTrailerFocus() {
  state.playingTrailerObserver?.disconnect();
  state.playingTrailerObserver = null;
  state.playingTrailerVisibility.clear();
  state.activeTrailerCard = null;
  const cards = [...el.playingList.querySelectorAll(".game-card.has-trailer")];
  if (!cards.length) return;
  if (!("IntersectionObserver" in window)) {
    cards.forEach((card) => state.playingTrailerVisibility.set(card, visibleRatio(card, el.playingList)));
    updateFocusedPlayingTrailer();
    return;
  }
  state.playingTrailerObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => state.playingTrailerVisibility.set(entry.target, entry.intersectionRatio));
    updateFocusedPlayingTrailer();
  }, {
    root: el.playingList,
    threshold: [0, 0.25, 0.5, 0.7, 0.9, 1],
  });
  cards.forEach((card) => {
    state.playingTrailerVisibility.set(card, 0);
    state.playingTrailerObserver.observe(card);
  });
}

function scheduleFocusedPlayingTrailerUpdate() {
  if (playingTrailerFrame) return;
  playingTrailerFrame = requestAnimationFrame(() => {
    playingTrailerFrame = 0;
    updateFocusedPlayingTrailer();
  });
}

function updateFocusedPlayingTrailer() {
  if (document.hidden || document.body.classList.contains("dialog-open") || !isPlayingCarouselInView()) {
    pauseAllPlayingTrailers();
    return;
  }
  const cards = [...el.playingList.querySelectorAll(".game-card.has-trailer")];
  if (!cards.length) return;
  if (!state.playingTrailerObserver) {
    cards.forEach((card) => state.playingTrailerVisibility.set(card, visibleRatio(card, el.playingList)));
  }
  const focused = cards
    .map((card) => ({ card, ratio: state.playingTrailerVisibility.get(card) || visibleRatio(card, el.playingList) }))
    .filter((entry) => entry.ratio >= 0.58)
    .sort((a, b) => b.ratio - a.ratio)[0]?.card || null;
  cards.forEach((card) => {
    if (card === focused && !card.classList.contains("trailer-user-paused")) playCardTrailer(card);
    else pauseCardTrailer(card);
  });
  state.activeTrailerCard = focused;
}

function isPlayingCarouselInView() {
  if (el.playingSection.hidden) return false;
  const rect = el.playingSection.getBoundingClientRect();
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
  const visibleHeight = Math.max(0, Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0));
  return visibleHeight >= Math.min(90, rect.height * 0.18);
}

function visibleRatio(card, root) {
  const cardRect = card.getBoundingClientRect();
  const rootRect = root.getBoundingClientRect();
  const visibleWidth = Math.max(0, Math.min(cardRect.right, rootRect.right) - Math.max(cardRect.left, rootRect.left));
  return cardRect.width ? Math.min(1, visibleWidth / cardRect.width) : 0;
}

function playCardTrailer(card) {
  const trailer = card.querySelector(".card-trailer");
  if (!trailer?.dataset.src) return;
  card.classList.remove("trailer-paused");
  const iframe = trailer.querySelector("iframe");
  if (iframe) {
    commandTrailer(iframe, "playVideo");
    return;
  }
  const video = trailer.querySelector("video");
  if (video) {
    video.play().catch(() => {});
    return;
  }
  trailer.innerHTML = trailerFrame(trailer.dataset.src);
  trailer.querySelector("video")?.play().catch(() => {});
  trailer.querySelector("iframe")?.addEventListener("load", (event) => {
    if (!card.classList.contains("trailer-paused") && !card.classList.contains("trailer-user-paused")) {
      commandTrailer(event.currentTarget, "playVideo");
    }
  }, { once: true });
}

function pauseCardTrailer(card) {
  const trailer = card.querySelector(".card-trailer");
  if (!trailer) return;
  card.classList.add("trailer-paused");
  const iframe = trailer.querySelector("iframe");
  if (iframe) commandTrailer(iframe, "pauseVideo");
  const video = trailer.querySelector("video");
  if (video) video.pause();
}

function pauseAllPlayingTrailers() {
  el.playingList.querySelectorAll(".game-card.has-trailer").forEach(pauseCardTrailer);
  state.activeTrailerCard = null;
}

function commandTrailer(iframe, command) {
  iframe.contentWindow?.postMessage(JSON.stringify({
    event: "command",
    func: command,
    args: [],
  }), "*");
}

function shouldShowCardTrailer(game) {
  return Boolean(game.playing && game.trailerUrl && window.matchMedia("(min-width: 900px)").matches);
}

function trailerEmbedUrl(value) {
  const url = String(value || "").trim();
  if (!url) return "";
  if (directTrailerUrl(url)) return url;
  const videoId = youtubeVideoId(url);
  if (videoId) {
    const params = new URLSearchParams({
      autoplay: "1",
      mute: "1",
      cc_load_policy: "0",
      controls: "0",
      disablekb: "1",
      enablejsapi: "1",
      fs: "0",
      iv_load_policy: "3",
      loop: "1",
      playlist: videoId,
      playsinline: "1",
      modestbranding: "1",
      rel: "0",
    });
    if (window.location.origin) params.set("origin", window.location.origin);
    return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;
  }
  return url;
}

function directTrailerUrl(value) {
  return /^https?:\/\/.+\.(?:mp4|webm|ogg)(?:[?#].*)?$/i.test(String(value || "").trim());
}

function youtubeVideoId(value) {
  const text = String(value || "").trim();
  const direct = text.match(/^[a-zA-Z0-9_-]{11}$/);
  if (direct) return direct[0];
  try {
    const url = new URL(text);
    if (url.hostname.includes("youtu.be")) return url.pathname.split("/").filter(Boolean)[0] || "";
    if (url.hostname.includes("youtube.com") || url.hostname.includes("youtube-nocookie.com")) {
      if (url.searchParams.get("v")) return url.searchParams.get("v");
      const parts = url.pathname.split("/").filter(Boolean);
      const embedIndex = parts.findIndex((part) => ["embed", "shorts", "live"].includes(part));
      if (embedIndex >= 0) return parts[embedIndex + 1] || "";
    }
  } catch {
    return "";
  }
  return "";
}

function setupCardParallax(card) {
  card.addEventListener("pointermove", (event) => {
    if (event.pointerType === "touch") return;
    const rect = card.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width - 0.5) * -18;
    const y = ((event.clientY - rect.top) / rect.height - 0.5) * -18;
    card.style.setProperty("--art-x", `${x.toFixed(2)}px`);
    card.style.setProperty("--art-y", `${y.toFixed(2)}px`);
  });
  card.addEventListener("pointerleave", () => {
    card.style.setProperty("--art-x", "0px");
    card.style.setProperty("--art-y", "0px");
  });
}

function openDetail(id, options = {}) {
  const game = getGame(id);
  if (!game) return;
  pauseAllPlayingTrailers();
  state.detailReturnToHistory = Boolean(options.returnToHistory);
  const owners = ownerTags(game);
  el.detailTitle.textContent = game.title;
  el.detailTitle.classList.toggle("owner-judy", owners.includes("Judy"));
  el.detailTitle.classList.toggle("owner-jordi", owners.includes("Jordi"));
  el.detailStudio.textContent = studioText(game);
  el.detailStudio.hidden = !el.detailStudio.textContent;
  el.detailMeta.innerHTML = metaFor(game, { includePsn: false, includePastRelease: true }).join("");
  el.detailDates.innerHTML = playDatesFor(game).join("");
  el.detailDates.hidden = !el.detailDates.innerHTML;
  el.detailChips.innerHTML = chipsFor(game).join("");
  el.detailStoreLinks.innerHTML = storeLinksFor(game);
  el.detailDescription.textContent = game.description || "No description yet.";
  renderDetailGuides(game);
  const priceProviders = priceProvidersForGame(game);
  if (game.section === "backlog" || game.completedAt || game.platinum || !priceProviders.length) {
    el.detailPrices.hidden = true;
    el.detailPrices.innerHTML = "";
  } else {
    el.detailPrices.hidden = false;
    el.detailPrices.style.setProperty("--price-columns", priceProviders.length);
    el.detailPrices.innerHTML = pricesFor(game);
  }
  el.detailCover.hidden = !game.cover;
  el.detailCover.src = game.cover ? coverDisplayUrl(game.cover) : "";
  el.detailCover.alt = game.cover ? `${game.title} cover` : "";
  if (game.cover) upgradeCoverIfFast(el.detailCover, game.cover, "detail");
  renderDetailTrophies(game);
  el.detailDialog.showModal();
  syncScrollLock();
}

async function renderDetailTrophies(game) {
  if (isPcGame(game)) {
    await renderDetailSteamAchievements(game);
    return;
  }
  if (isMicrosoftAchievementGame(game)) {
    await renderDetailXboxAchievements(game);
    return;
  }
  const psn = matchedPsnGame(game);
  const trophyId = psn?.npCommunicationId;
  if (!trophyId) {
    console.warn("[trophies] no PSN trophy id for game overlay", {
      game: game?.title || "",
      platform: game?.platform || "",
      matchedPsnGame: psn || null,
    });
    state.detailTrophyRequest = "";
    state.detailTrophiesData = [];
    state.detailTrophyProvider = "psn";
    if (el.detailTrophyTitle) el.detailTrophyTitle.textContent = "TROPHIES";
    el.detailTrophies.hidden = true;
    el.detailTrophyCount.textContent = "";
    el.detailTrophyPercent.innerHTML = "";
    el.detailTrophyList.innerHTML = "";
    updateDetailTrophyEdges();
    return;
  }

  const requestKey = `${game.id}:${trophyId}:${Date.now()}`;
  state.detailGameId = game.id;
  state.detailTrophyProvider = "psn";
  state.detailTrophyRequest = requestKey;
  el.detailTrophies.hidden = false;
  if (el.detailTrophyTitle) el.detailTrophyTitle.textContent = "TROPHIES";
  el.detailTrophyCount.textContent = "";
  el.detailTrophyPercent.innerHTML = psnProgressBadge(psn, { includeIcon: false });
  el.detailTrophyList.innerHTML = `<div class="detail-trophy-empty">Loading earned trophies...</div>`;

  try {
    const params = new URLSearchParams({
      id: trophyId,
      service: psn.npServiceName || "trophy",
      user: state.settings.psnUser || "",
      debug: "1",
      schema: "3",
    });
    const response = await fetch(`/api/trophies?${params}`);
    const data = await response.json().catch(() => ({ error: "Invalid trophy API JSON response" }));
    if (state.detailTrophyRequest !== requestKey) return;
    logTrophyLoadIssue("detail", game, psn, response, data);
    state.detailTrophiesData = Array.isArray(data.trophies) ? data.trophies : [];
    renderDetailTrophyList();
  } catch (error) {
    if (state.detailTrophyRequest !== requestKey) return;
    logTrophyLoadIssue("detail", game, psn, null, null, error);
    state.detailTrophiesData = [];
    el.detailTrophyCount.textContent = "";
    el.detailTrophyPercent.innerHTML = "";
    el.detailTrophyList.innerHTML = `<div class="detail-trophy-empty">Could not load trophies right now.</div>`;
    updateDetailTrophyEdges();
  }
}

async function renderDetailSteamAchievements(game) {
  const appId = steamAppIdFor(game);
  const steamUser = state.settings.steamUser || "";
  if (!appId || (state.steamOwnedAppIds && !state.steamOwnedAppIds.has(appId))) {
    state.detailTrophyRequest = "";
    state.detailTrophiesData = [];
    state.detailTrophyProvider = "steam";
    if (el.detailTrophyTitle) el.detailTrophyTitle.textContent = "ACHIEVEMENTS";
    el.detailTrophies.hidden = true;
    el.detailTrophyCount.textContent = "";
    el.detailTrophyPercent.innerHTML = "";
    el.detailTrophyList.innerHTML = "";
    updateDetailTrophyEdges();
    return;
  }

  const requestKey = `${game.id}:steam:${appId}:${Date.now()}`;
  state.detailGameId = game.id;
  state.detailTrophyProvider = "steam";
  state.detailTrophyRequest = requestKey;
  el.detailTrophies.hidden = false;
  if (el.detailTrophyTitle) el.detailTrophyTitle.textContent = "ACHIEVEMENTS";
  el.detailTrophyCount.textContent = "";
  el.detailTrophyPercent.innerHTML = "";
  el.detailTrophyList.innerHTML = `<div class="detail-trophy-empty">Loading earned achievements...</div>`;

  try {
    const params = steamAchievementParams(appId, steamUser);
    const response = await fetch(`/api/steam-achievements?${params}`);
    const data = await response.json().catch(() => ({ error: "Invalid Steam achievements API JSON response" }));
    if (state.detailTrophyRequest !== requestKey) return;
    logTrophyLoadIssue("steam-detail", game, { npCommunicationId: appId, npServiceName: "steam" }, response, { trophies: data.achievements, ...data });
    state.detailTrophiesData = Array.isArray(data.achievements) ? data.achievements : [];
    renderDetailTrophyList();
  } catch (error) {
    if (state.detailTrophyRequest !== requestKey) return;
    logTrophyLoadIssue("steam-detail", game, { npCommunicationId: appId, npServiceName: "steam" }, null, null, error);
    state.detailTrophiesData = [];
    el.detailTrophyCount.textContent = "";
    el.detailTrophyPercent.innerHTML = "";
    el.detailTrophyList.innerHTML = `<div class="detail-trophy-empty">Could not load achievements right now.</div>`;
    updateDetailTrophyEdges();
  }
}

async function renderDetailXboxAchievements(game) {
  const xboxGame = matchedXboxGame(game);
  state.detailGameId = game.id;
  state.detailTrophyProvider = "xbox";
  if (el.detailTrophyTitle) el.detailTrophyTitle.textContent = "ACHIEVEMENTS";
  el.detailTrophies.hidden = !xboxGame;
  el.detailTrophyCount.textContent = "";
  el.detailTrophyPercent.innerHTML = "";
  if (!xboxGame?.titleId) {
    state.detailTrophyRequest = "";
    state.detailTrophiesData = [];
    el.detailTrophyList.innerHTML = "";
    updateDetailTrophyEdges();
    return;
  }
  const cacheKey = xboxAchievementCacheKey(xboxGame);
  const cached = state.cardTrophies[cacheKey];
  if (cached && !cached.loading) {
    state.detailTrophyRequest = "";
    state.detailTrophiesData = cached.achievements || [];
    renderDetailTrophyList();
    return;
  }
  const requestKey = `${game.id}:xbox:${xboxGame.titleId}:${Date.now()}`;
  state.detailTrophyRequest = requestKey;
  state.detailTrophiesData = [];
  el.detailTrophyList.innerHTML = `<div class="detail-trophy-empty">Loading earned achievements...</div>`;
  try {
    const data = await fetchXboxTitleAchievements(xboxGame);
    if (state.detailTrophyRequest !== requestKey) return;
    const achievements = Array.isArray(data.achievements) ? data.achievements : [];
    state.cardTrophies[cacheKey] = xboxAchievementCache(data, achievements);
    state.detailTrophiesData = achievements;
    renderDetailTrophyList();
  } catch (error) {
    if (state.detailTrophyRequest !== requestKey) return;
    console.warn("[trophies] Xbox detail achievements unavailable", { game: game.title, titleId: xboxGame.titleId, error: error.message });
    state.detailTrophiesData = [];
    el.detailTrophyList.innerHTML = `<div class="detail-trophy-empty">Could not load achievements right now.</div>`;
    updateDetailTrophyEdges();
  }
}

function renderDetailTrophyList() {
  el.detailTrophySort.value = state.detailTrophySort;
  el.detailTrophyDirection.innerHTML = sortArrowIcon(state.detailTrophyDirection === "desc");
  el.detailTrophyDirection.title = state.detailTrophyDirection === "asc" ? "Sort ascending" : "Sort descending";
  el.detailTrophyDirection.setAttribute("aria-label", el.detailTrophyDirection.title);
  el.detailTrophyDirection.classList.toggle("desc", state.detailTrophyDirection === "desc");
  const trophies = sortedDetailTrophies();
  const earnedCount = trophies.filter((trophy) => trophy.earned).length;
  const game = getGame(state.detailGameId);
  const psn = game ? matchedPsnGame(game) : null;
  el.detailTrophyCount.textContent = "";
  const progressSource = state.detailTrophyProvider === "steam" || state.detailTrophyProvider === "xbox"
    ? { progress: trophies.length ? Math.round((earnedCount / trophies.length) * 100) : 0, game: "" }
    : psn;
  el.detailTrophyPercent.innerHTML = trophies.length && progressSource
    ? psnProgressBadge(progressSource, { includeIcon: false, label: `${earnedCount}/${trophies.length} earned`, separator: true })
    : "";
  el.detailTrophyList.innerHTML = trophies.length
    ? trophies.map(detailTrophyCard).join("")
    : `<div class="detail-trophy-empty">No ${state.detailTrophyProvider === "psn" ? "trophies" : "achievements"} found for this game yet.</div>`;
  requestAnimationFrame(updateDetailTrophyEdges);
}

function updateDetailTrophyEdges() {
  const list = el.detailTrophyList;
  const scroller = el.detailTrophyScroller;
  if (!list || !scroller) return;
  const maxScroll = Math.max(0, list.scrollHeight - list.clientHeight - 1);
  const hasOverflow = maxScroll > 2;
  scroller.classList.toggle("detail-trophy-at-start", !hasOverflow || list.scrollTop <= 2);
  scroller.classList.toggle("detail-trophy-at-end", !hasOverflow || list.scrollTop >= maxScroll);
  scroller.classList.toggle("detail-trophy-has-overflow", hasOverflow);
}

function updateScrollTopButton() {
  const visible = window.scrollY > 180 && !document.body.classList.contains("dialog-open");
  el.scrollTopButton?.classList.toggle("visible", visible);
  el.floatingEditActions?.classList.toggle("visible", visible);
}

function sortedDetailTrophies() {
  const direction = state.detailTrophyDirection === "asc" ? 1 : -1;
  return [...state.detailTrophiesData].sort((a, b) => {
    if (state.detailTrophySort === "name") {
      return direction * (stringCompare(a.title, b.title) || trophyOrderCompare(a, b));
    }
    if (state.detailTrophySort === "completed") {
      return direction * ((Number(b.earned) - Number(a.earned))
        || String(b.rawEarnedAt || "").localeCompare(String(a.rawEarnedAt || ""))
        || trophyOrderCompare(a, b));
    }
    return direction * trophyOrderCompare(a, b);
  });
}

function trophyOrderCompare(a, b) {
  return Number(a.order ?? a.trophyId ?? 0) - Number(b.order ?? b.trophyId ?? 0);
}

function detailTrophyCard(trophy) {
  const fallbackIcon = trophy.source === "steam"
    ? platformLogo("Steam")
    : trophy.source === "xbox" ? platformLogo("Xbox") : platformLogo("PS5");
  return `
    <article class="detail-trophy-card trophy-${escapeHtml(trophyTone(trophy.type))} ${trophy.earned ? "earned" : "missing"}">
      <img src="${escapeHtml(trophy.icon || fallbackIcon)}" alt="">
      <div>
        <strong>${escapeHtml(trophy.title || "Trophy")}</strong>
        <span>${escapeHtml([trophy.earned ? trophy.earnedAt : "Missing", trophy.rarity].filter(Boolean).join(" · "))}</span>
        ${trophy.description ? `<p>${escapeHtml(trophy.description)}</p>` : ""}
      </div>
    </article>
  `;
}

function sectionRank(section) {
  return { backlog: 0, upcoming: 1, wanted: 2 }[section] ?? 3;
}

function metaFor(game, options = {}) {
  const values = [];
  if (game.platform) values.push(platformBadge(game.platform));
  if (game.digital) values.push(`<span class="digital-pill">Digital</span>`);
  if (game.emulator) values.push(`<span class="emulator-pill">Emulator</span>`);
  if (game.lengthHours) values.push(timeBadge(game.lengthHours, hltbUrlFor(game)));
  if (game.stream) values.push(`<span class="stream-pill">Stream</span>`);
  const release = releaseStatus(game, { includePast: options.includePastRelease });
  if (release) values.push(`<span class="release-pill">${escapeHtml(release)}</span>`);
  gameStatuses(game).forEach((status) => values.push(statusBadge(status)));
  const progress = achievementProgressForGame(game);
  if (options.includePsn !== false && progress) values.push(psnProgressBadge(progress));
  if (game.coop) values.push(`<span class="coop-pill">Coop</span>`);
  if (game.replayCount) values.push(replayBadge(game.replayCount));
  return values;
}

function matchedPsnGame(game) {
  if (!isPlayStationGame(game)) return null;
  const manual = manualPsnTitleForGame(game);
  if (manual) return manual;
  let bestMatch = null;
  let bestScore = 0;
  (state.psnActivity.games || []).forEach((psnGame) => {
    const titleScore = psnTitleMatchScore(game.title, psnGame.title);
    if (!titleScore) return;
    const platformScore = psnPlatformMatchScore(game.platform, psnGame.rarity || psnGame.platform || "");
    if (platformScore === null) return;
    const score = titleScore + platformScore;
    if (score > bestScore) {
      bestMatch = psnGame;
      bestScore = score;
    }
  });
  return bestScore >= 75 ? bestMatch : null;
}

function manualPsnTitleForGame(game) {
  const local = titleMatchParts(game?.title || "");
  const platform = canonicalPlatform(game?.platform);
  const override = MANUAL_PSN_TITLE_OVERRIDES.find((entry) => {
    if (entry.platforms?.length && !entry.platforms.includes(platform)) return false;
    const values = uniqueTitleValues([...local.tokens, ...local.compacts]);
    const haystack = values.join(" ");
    const hasMatch = entry.match.every((term) => manualTitleTermMatches(values, haystack, term));
    const hasExcluded = (entry.exclude || []).some((term) => manualTitleTermMatches(values, haystack, term));
    return hasMatch && !hasExcluded;
  });
  if (!override) return null;
  return (state.psnActivity.games || []).find((psnGame) => (override.ids || []).includes(psnGame.npCommunicationId)) || null;
}

function manualTitleTermMatches(values, haystack, term) {
  const compact = normalizeTitleCompact(term);
  if (values.includes(compact)) return true;
  return compact.length >= 3 && haystack.includes(compact);
}

function achievementProgressForGame(game) {
  if (game?.emulator) return null;
  if (isPcGame(game)) return steamProgressForGame(game);
  if (isMicrosoftAchievementGame(game)) return xboxProgressForGame(game);
  return matchedPsnGame(game);
}

function matchedXboxGame(game) {
  if (!isMicrosoftAchievementGame(game)) return null;
  let bestMatch = null;
  let bestScore = 0;
  (state.xboxActivity.games || []).forEach((xboxGame) => {
    const titleScore = psnTitleMatchScore(game.title, xboxGame.title);
    const platformScore = xboxPlatformMatchScore(game.platform, xboxGame.platform);
    if (!titleScore || platformScore === null) return;
    const score = titleScore + platformScore;
    if (score > bestScore) {
      bestMatch = xboxGame;
      bestScore = score;
    }
  });
  return bestScore >= 75 ? bestMatch : null;
}

function xboxPlatformMatchScore(localPlatform, remotePlatform) {
  const local = canonicalPlatform(localPlatform);
  const remote = canonicalPlatform(remotePlatform);
  if (local === remote) return 18;
  const modernXbox = ["Xbox PC", "XOne", "Xbox Series"];
  if (modernXbox.includes(local) && modernXbox.includes(remote)) return 8;
  return null;
}

function xboxProgressForGame(game) {
  const match = matchedXboxGame(game);
  if (!match) return null;
  const cacheKey = xboxAchievementCacheKey(match);
  const cached = cacheKey ? state.cardTrophies[cacheKey] : null;
  if (!cached && (game.playing || game.completedAt)) loadCardXboxAchievements(game, match);
  const earned = Number(cached?.earned ?? match.earned ?? 0);
  const total = Number(cached?.total ?? match.total ?? 0);
  if (!total) return null;
  const progress = cached
    ? Math.round((earned / Math.max(total, 1)) * 100)
    : Number.isFinite(Number(match.progress)) ? Number(match.progress)
    : Math.round((earned / Math.max(total, 1)) * 100);
  return {
    title: match.title || game.title,
    game: `${progress}%`,
    progress,
    label: `${earned}/${total} earned`,
    provider: "xbox",
  };
}

function xboxAchievementCacheKey(xboxGame) {
  return xboxGame?.titleId ? `xbox:${xboxGame.titleId}` : "";
}

async function fetchXboxTitleAchievements(xboxGame) {
  const params = new URLSearchParams({ titleId: xboxGame.titleId });
  if (state.settings.microsoftUser) params.set("user", state.settings.microsoftUser);
  const response = await fetch(`/api/xbox-achievements?${params}`);
  const data = await response.json().catch(() => ({ error: "Invalid Xbox achievements response" }));
  if (!response.ok || data.authError || data.error) throw new Error(data.error || `Xbox achievements failed (${response.status})`);
  return data;
}

function xboxAchievementCache(data, achievements) {
  const earned = Number.isFinite(Number(data.earnedCount))
    ? Number(data.earnedCount)
    : achievements.filter((achievement) => achievement.earned).length;
  const total = Number.isFinite(Number(data.count)) ? Number(data.count) : achievements.length;
  return { loading: false, achievements, trophies: achievements, earned, total };
}

function steamAchievementCacheKey(game) {
  const appId = steamAppIdFor(game);
  return appId ? `steam:${appId}` : "";
}

function steamAchievementsForGame(game) {
  const cacheKey = steamAchievementCacheKey(game);
  return cacheKey ? state.cardTrophies[cacheKey] : null;
}

function steamGameIsOwned(game) {
  const appId = steamAppIdFor(game);
  return Boolean(appId && state.steamOwnedAppIds?.has(appId));
}

function steamProgressForGame(game) {
  if (!isPcGame(game)) return null;
  const appId = steamAppIdFor(game);
  if (!appId) return null;
  const cached = steamAchievementsForGame(game);
  if (!cached && !steamGameIsOwned(game)) return null;
  if (!cached) loadCardSteamAchievements(game);
  if (!cached?.achievements?.length) return null;
  const total = cached.total ?? cached.achievements.length;
  const earned = cached.earned ?? cached.achievements.filter((achievement) => achievement.earned).length;
  return {
    title: game.title,
    game: `${Math.round((earned / Math.max(total, 1)) * 100)}%`,
    progress: Math.round((earned / Math.max(total, 1)) * 100),
    label: `${earned}/${total} earned`,
    provider: "steam",
  };
}

function latestTrophiesForGame(game, limit = 3) {
  if (!isPlayStationGame(game)) return [];
  const psn = matchedPsnGame(game);
  const trophyId = psn?.npCommunicationId || "";
  if (trophyId) {
    const exact = (state.psnActivity.achievements || [])
      .filter((achievement) => achievement.npCommunicationId === trophyId)
      .sort(compareEarnedTrophies)
      .slice(0, limit);
    if (exact.length) return exact;
  }
  return (state.psnActivity.achievements || [])
    .filter((achievement) => {
      const titleScore = psnTitleMatchScore(game.title, achievement.game || achievement.title || "");
      if (!titleScore) return false;
      const platformScore = psnPlatformMatchScore(game.platform, achievement.platform || achievement.rarity || "");
      return platformScore !== null;
    })
    .sort(compareEarnedTrophies)
    .slice(0, limit);
}

function isPlayStationGame(game) {
  return isPlayStationPlatform(game?.platform);
}

function isPlayStationPlatform(platform) {
  return ["PS1", "PS2", "PS3", "PS4", "PS5", "PSP", "PSVita"].includes(canonicalPlatform(platform));
}

function isPcGame(game) {
  return canonicalPlatform(game?.platform) === "Steam";
}

function isMicrosoftAchievementGame(game) {
  return ["Xbox PC", "Xbox Series", "X360", "XOne"].includes(canonicalPlatform(game?.platform));
}

function isXboxStoreGame(game) {
  return ["Xbox PC", "Xbox Series", "X360", "XOne"].includes(canonicalPlatform(game?.platform));
}

function psnTitleMatchScore(localTitle, psnTitle) {
  const local = titleMatchParts(localTitle);
  const psn = titleMatchParts(psnTitle);
  if (!local.compact || !psn.compact) return 0;
  if (local.compact === psn.compact) return 100;
  if (local.phrase === psn.phrase) return 100;
  if (local.compacts.some((compact) => psn.acronyms.includes(compact))
    || psn.compacts.some((compact) => local.acronyms.includes(compact))) return 96;
  if (sameTitleTokens(local.tokens, psn.tokens)) return 92;
  if (local.tokens.length >= 2 && containsAllTitleTokens(psn.tokens, local.tokens) && psnExtraTitleTokens(local.tokens, psn.tokens).length === 0) return 82;
  if (psn.tokens.length >= 2 && containsAllTitleTokens(local.tokens, psn.tokens) && psnExtraTitleTokens(psn.tokens, local.tokens).length === 0) return 80;
  return 0;
}

function psnPlatformMatchScore(localPlatform, psnPlatform) {
  const local = canonicalPlatform(localPlatform);
  const psn = String(psnPlatform || "").toUpperCase();
  if (!["PS3", "PS4", "PS5"].includes(local)) return 0;
  if (!/\bPS[345]\b/.test(psn)) return 0;
  if (psn.includes(local)) return 18;
  return null;
}

function titleMatchParts(value) {
  const rawPhrase = normalizeTitleRawPhrase(value);
  const phrase = normalizeTitlePhrase(rawPhrase);
  const rawTokens = rawPhrase ? rawPhrase.split(" ").filter(Boolean) : [];
  const tokens = phrase ? phrase.split(" ").filter(Boolean) : [];
  const compact = tokens.join("");
  const rawCompact = rawTokens.join("");
  const acronym = tokens.map((token) => token[0]).join("");
  const rawAcronym = rawTokens.map((token) => token[0]).join("");
  return {
    phrase,
    tokens,
    compact,
    compacts: uniqueTitleValues([compact, rawCompact, mortalKombatCompactAlias(rawCompact)]),
    acronym,
    acronyms: uniqueTitleValues([acronym, rawAcronym]),
  };
}

function normalizeTitleRawPhrase(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeTitlePhrase(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\btrophies\b/g, " ")
    .replace(/\bVIII\b/gi, "8")
    .replace(/\bVII\b/gi, "7")
    .replace(/\bVI\b/gi, "6")
    .replace(/\bXII\b/gi, "12")
    .replace(/\bXI\b/gi, "11")
    .replace(/\bX\b/gi, "10")
    .replace(/\bIV\b/gi, "4")
    .replace(/\bIX\b/gi, "9")
    .replace(/\bIII\b/gi, "3")
    .replace(/\bII\b/gi, "2")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function mortalKombatCompactAlias(value) {
  if (value === "mkx") return "mk10";
  if (value === "mortalkombatx") return "mortalkombat10";
  return "";
}

function normalizeTitleCompact(value) {
  return normalizeTitlePhrase(normalizeTitleRawPhrase(value)).replace(/\s+/g, "");
}

function uniqueTitleValues(values) {
  return [...new Set(values.filter(Boolean))];
}

function sameTitleTokens(a, b) {
  return a.length === b.length && a.every((token, index) => token === b[index]);
}

function containsAllTitleTokens(haystack, needles) {
  return needles.every((token) => haystack.includes(token));
}

function psnExtraTitleTokens(localTokens, psnTokens) {
  const allowedExtras = new Set(["ps3", "ps4", "ps5", "version", "edition", "trophies", "remastered", "remaster", "complete", "ultimate", "definitive", "premium", "xl"]);
  return psnTokens.filter((token) => !localTokens.includes(token) && !allowedExtras.has(token));
}

function compareEarnedTrophies(a, b) {
  return earnedTrophyTime(b) - earnedTrophyTime(a)
    || String(b.rawEarnedAt || b.earnedAt || "").localeCompare(String(a.rawEarnedAt || a.earnedAt || ""))
    || stringCompare(a.title, b.title);
}

function earnedTrophyTime(trophy) {
  const value = trophy?.rawEarnedAt || trophy?.earnedAt || "";
  const time = Date.parse(value);
  return Number.isNaN(time) ? 0 : time;
}

function cardTrophiesFor(game) {
  if (isPcGame(game)) return cardSteamAchievementsFor(game);
  if (isMicrosoftAchievementGame(game)) return cardXboxAchievementsFor(game);
  const psn = matchedPsnGame(game);
  const cacheKey = psn?.npCommunicationId || "";
  const cached = cacheKey ? state.cardTrophies[cacheKey] : null;
  if (psn && !cached) loadCardTrophies(game, psn);
  const guideLinks = guideLinksFor(game);
  const trophies = cached?.trophies?.length ? cached.trophies : latestTrophiesForGame(game, 3);
  if (!trophies.length && cached?.loading) {
    return `<div class="card-trophy-head">${trophyIcon()}<span>Loading trophies...</span></div>${guideLinks.length ? `<div class="guide-links card-guide-row">${guideLinks.join("")}</div>` : ""}`;
  }
  if (!trophies.length) return guideLinks.length ? `<div class="guide-links card-guide-row">${guideLinks.join("")}</div>` : "";
  return `
    <div class="card-trophy-head">${trophyIcon()}<span>Latest trophies</span>${psn ? psnProgressBadge(psn, { includeIcon: false, className: "card-trophy-progress" }) : ""}</div>
    ${guideLinks.length ? `<div class="guide-links card-guide-row">${guideLinks.join("")}</div>` : ""}
    <div class="card-trophy-list">
      ${trophies.map((trophy) => `
        <a class="card-trophy trophy-${escapeHtml(trophyTone(trophy.type || trophy.rarity))}" href="${escapeHtml(trophy.url || state.psnActivity.sourceUrl || "#")}" target="_blank" rel="noreferrer" title="${escapeHtml([trophy.title, trophy.earnedAt].filter(Boolean).join(" · "))}">
          <img src="${escapeHtml(trophy.icon || platformLogo("PS5"))}" alt="">
          <span>${escapeHtml(trophy.title || "Trophy")}</span>
          ${cardTrophyMeta(trophy)}
        </a>
      `).join("")}
    </div>
  `;
}

function cardSteamAchievementsFor(game) {
  const cacheKey = steamAchievementCacheKey(game);
  const cached = cacheKey ? state.cardTrophies[cacheKey] : null;
  if (cacheKey && !cached && steamGameIsOwned(game)) loadCardSteamAchievements(game);
  const guideLinks = guideLinksFor(game);
  if (cached?.loading) {
    return `<div class="card-trophy-head">${trophyIcon()}<span>Loading achievements...</span></div>${guideLinks.length ? `<div class="guide-links card-guide-row">${guideLinks.join("")}</div>` : ""}`;
  }
  const achievements = (cached?.achievements || [])
    .filter((achievement) => achievement.earned && achievement.earnedAt)
    .sort(compareEarnedTrophies)
    .slice(0, 3);
  const progress = steamProgressForGame(game);
  if (!achievements.length) {
    const heading = progress ? `<div class="card-trophy-head">${trophyIcon()}<span>Latest achievements</span>${psnProgressBadge(progress, { includeIcon: false, className: "card-trophy-progress" })}</div>` : "";
    return `${heading}${guideLinks.length ? `<div class="guide-links card-guide-row">${guideLinks.join("")}</div>` : ""}`;
  }
  return `
    <div class="card-trophy-head">${trophyIcon()}<span>Latest achievements</span>${progress ? psnProgressBadge(progress, { includeIcon: false, className: "card-trophy-progress" }) : ""}</div>
    ${guideLinks.length ? `<div class="guide-links card-guide-row">${guideLinks.join("")}</div>` : ""}
    <div class="card-trophy-list">
      ${achievements.map((achievement) => `
        <a class="card-trophy trophy-${escapeHtml(trophyTone(achievement.type || achievement.rarity))}" href="${escapeHtml(game.storeLinks?.steam || hltbUrlFor(game) || "#")}" target="_blank" rel="noreferrer" title="${escapeHtml([achievement.title, achievement.earnedAt].filter(Boolean).join(" · "))}">
          <img src="${escapeHtml(achievement.icon || platformLogo("Steam"))}" alt="">
          <span>${escapeHtml(achievement.title || "Achievement")}</span>
          ${cardTrophyMeta(achievement)}
        </a>
      `).join("")}
    </div>
  `;
}

function cardXboxAchievementsFor(game) {
  const xboxGame = matchedXboxGame(game);
  const guideLinks = guideLinksFor(game);
  if (!xboxGame) return guideLinks.length ? `<div class="guide-links card-guide-row">${guideLinks.join("")}</div>` : "";
  const cacheKey = xboxAchievementCacheKey(xboxGame);
  const cached = cacheKey ? state.cardTrophies[cacheKey] : null;
  if (cacheKey && !cached) loadCardXboxAchievements(game, xboxGame);
  const achievements = (cached?.achievements || xboxGame.achievements || [])
    .filter((achievement) => achievement.earned && achievement.earnedAt)
    .sort(compareEarnedTrophies)
    .slice(0, 3);
  const progress = xboxProgressForGame(game);
  const heading = progress
    ? `<div class="card-trophy-head">${trophyIcon()}<span>Latest achievements</span>${psnProgressBadge(progress, { includeIcon: false, className: "card-trophy-progress" })}</div>`
    : "";
  if (!achievements.length) return `${heading}${guideLinks.length ? `<div class="guide-links card-guide-row">${guideLinks.join("")}</div>` : ""}`;
  return `
    ${heading}
    ${guideLinks.length ? `<div class="guide-links card-guide-row">${guideLinks.join("")}</div>` : ""}
    <div class="card-trophy-list">
      ${achievements.map((achievement) => `
        <a class="card-trophy trophy-${escapeHtml(trophyTone(achievement.type || achievement.rarity))}" href="${escapeHtml(state.xboxActivity.sourceUrl || "https://www.xbox.com/")}" target="_blank" rel="noreferrer" title="${escapeHtml([achievement.title, achievement.earnedAt].filter(Boolean).join(" · "))}">
          <img src="${escapeHtml(achievement.icon || platformLogo("Xbox"))}" alt="">
          <span>${escapeHtml(achievement.title || "Achievement")}</span>
          ${cardTrophyMeta(achievement)}
        </a>
      `).join("")}
    </div>
  `;
}

async function loadCardXboxAchievements(game, xboxGame) {
  const cacheKey = xboxAchievementCacheKey(xboxGame);
  if (!cacheKey || state.cardTrophies[cacheKey]) return;
  state.cardTrophies[cacheKey] = { loading: true, achievements: [], trophies: [] };
  try {
    const data = await fetchXboxTitleAchievements(xboxGame);
    const achievements = Array.isArray(data.achievements) ? data.achievements : [];
    state.cardTrophies[cacheKey] = xboxAchievementCache(data, achievements);
  } catch (error) {
    console.warn("[trophies] Xbox card achievements unavailable", { game: game.title, titleId: xboxGame.titleId, error: error.message });
    state.cardTrophies[cacheKey] = { loading: false, achievements: [], trophies: [], earned: 0, total: 0 };
  }
  updateCardAchievementUi(game.id);
}

function cardTrophyMeta(trophy) {
  const meta = [trophy.rarity || trophy.type, trophy.earnedAt].filter(Boolean).join(" · ");
  return meta ? `<small class="card-trophy-meta">${escapeHtml(meta)}</small>` : "";
}

async function loadCardTrophies(game, psn) {
  const cacheKey = psn?.npCommunicationId;
  if (!cacheKey || state.cardTrophies[cacheKey]) return;
  state.cardTrophies[cacheKey] = { loading: true, trophies: [] };
  try {
    const params = new URLSearchParams({
      id: cacheKey,
      service: psn.npServiceName || "trophy",
      user: state.settings.psnUser || "",
      debug: "1",
    });
    const response = await fetch(`/api/trophies?${params}`);
    const data = await response.json().catch(() => ({ error: "Invalid trophy API JSON response" }));
    logTrophyLoadIssue("card", game, psn, response, data);
    if (!response.ok) throw new Error(`Card trophies failed (${response.status})`);
    const trophies = (Array.isArray(data.trophies) ? data.trophies : [])
      .filter((trophy) => trophy.earned && trophy.earnedAt)
      .sort(compareEarnedTrophies)
      .slice(0, 3);
    state.cardTrophies[cacheKey] = { loading: false, trophies };
  } catch (error) {
    logTrophyLoadIssue("card", game, psn, null, null, error);
    state.cardTrophies[cacheKey] = { loading: false, trophies: [] };
  }
  updateCardTrophyStrips(game.id);
}

async function loadCardSteamAchievements(game) {
  const cacheKey = steamAchievementCacheKey(game);
  const appId = steamAppIdFor(game);
  const steamUser = state.settings.steamUser || "";
  if (!cacheKey || !appId || state.cardTrophies[cacheKey] || !steamGameIsOwned(game)) return;
  state.cardTrophies[cacheKey] = { loading: true, achievements: [], trophies: [] };
  try {
    const params = steamAchievementParams(appId, steamUser);
    const response = await fetch(`/api/steam-achievements?${params}`);
    const data = await response.json().catch(() => ({ error: "Invalid Steam achievements API JSON response" }));
    logTrophyLoadIssue("steam-card", game, { npCommunicationId: appId, npServiceName: "steam" }, response, { trophies: data.achievements, ...data });
    if (!response.ok) throw new Error(`Steam card achievements failed (${response.status})`);
    const achievements = Array.isArray(data.achievements) ? data.achievements : [];
    const earned = Number.isFinite(Number(data.earnedCount))
      ? Number(data.earnedCount)
      : achievements.filter((achievement) => achievement.earned).length;
    const total = Number.isFinite(Number(data.count)) ? Number(data.count) : achievements.length;
    state.cardTrophies[cacheKey] = { loading: false, achievements, trophies: achievements, earned, total };
  } catch (error) {
    logTrophyLoadIssue("steam-card", game, { npCommunicationId: appId, npServiceName: "steam" }, null, null, error);
    state.cardTrophies[cacheKey] = { loading: false, achievements: [], trophies: [], earned: 0, total: 0 };
  }
  updateCardAchievementUi(game.id);
}

function logTrophyLoadIssue(scope, game, psn, response, data, error = null) {
  const trophyCount = Array.isArray(data?.trophies) ? data.trophies.length : 0;
  const hasIssue = error
    || !response?.ok
    || data?.needsSetup
    || data?.authError
    || data?.error
    || !Array.isArray(data?.trophies);
  if (!hasIssue) return;
  console.warn("[trophies] load issue", {
    scope,
    game: game?.title || "",
    trophyId: psn?.npCommunicationId || "",
    service: psn?.npServiceName || "trophy",
    status: response?.status || 0,
    ok: Boolean(response?.ok),
    trophyCount,
    needsSetup: Boolean(data?.needsSetup),
    authError: Boolean(data?.authError),
    error: error?.message || data?.error || "",
    debug: data?.debug || "",
    data,
  });
}

function updateCardTrophyStrips(gameId) {
  const game = getGame(gameId);
  if (!game) return;
  document.querySelectorAll(`.game-card[data-id="${CSS.escape(gameId)}"] .card-trophies`).forEach((node) => {
    node.innerHTML = game.playing ? cardTrophiesFor(game) : "";
    node.hidden = !node.innerHTML;
  });
  if (game.playing) schedulePlayingCardHeightSync();
}

function updateCardAchievementUi(gameId) {
  const game = getGame(gameId);
  if (!game) return;
  document.querySelectorAll(`.game-card[data-id="${CSS.escape(gameId)}"]`).forEach((card) => {
    const meta = card.querySelector(".meta");
    if (meta) meta.innerHTML = metaFor(game, { includePsn: !game.playing }).join("");
    const trophyStrip = card.querySelector(".card-trophies");
    if (trophyStrip) {
      trophyStrip.innerHTML = game.playing ? cardTrophiesFor(game) : "";
      trophyStrip.hidden = !trophyStrip.innerHTML;
    }
  });
  document.querySelectorAll(`.completed-row[data-id="${CSS.escape(gameId)}"] .completed-platform, .history-row[data-id="${CSS.escape(gameId)}"] .completed-platform`).forEach((node) => {
    node.innerHTML = completedBadges(game);
  });
  renderPlayingFinished();
  if (game.playing) schedulePlayingCardHeightSync();
}

function normalizeTitleForMatch(value) {
  return normalizeTag(String(value || "")
    .replace(/\bVIII\b/gi, "8")
    .replace(/\bVII\b/gi, "7")
    .replace(/\bVI\b/gi, "6")
    .replace(/\bIV\b/gi, "4")
    .replace(/\bIX\b/gi, "9")
    .replace(/\bIII\b/gi, "3")
    .replace(/\bII\b/gi, "2"));
}

function psnProgressBadge(game, options = {}) {
  const explicitProgress = Number(game?.progress ?? options.progress);
  const progress = Number.isFinite(explicitProgress) ? Math.max(0, Math.min(100, Math.round(explicitProgress))) : progressValue(game.game);
  const label = options.label ?? "";
  const className = ["psn-progress-pill", options.className || ""].filter(Boolean).join(" ");
  return `
    <span class="${escapeHtml(className)}" title="${escapeHtml([game.title, game.game].filter(Boolean).join(" · "))}">
      ${options.includeIcon === false ? "" : trophyIcon()}
      <em style="--progress:${progress}%"></em>
      <strong>${progress}%</strong>
      ${label ? `<span>${options.separator ? "<b>·</b>" : ""}${escapeHtml(label)}</span>` : ""}
    </span>
  `;
}

function completedBadges(game, options = {}) {
  const progress = achievementProgressForGame(game);
  return [
    game.platform ? platformBadge(game.platform) : "",
    game.digital ? `<span class="digital-pill">Digital</span>` : "",
    game.emulator ? `<span class="emulator-pill">Emulator</span>` : "",
    game.coop ? `<span class="coop-pill">Coop</span>` : "",
    game.stream ? `<span class="stream-pill">Stream</span>` : "",
    game.replayCount ? replayBadge(game.replayCount) : "",
    options.includePsn === false ? "" : (progress ? psnProgressBadge(progress) : ""),
  ].filter(Boolean).join("");
}

function playDatesFor(game) {
  const values = [];
  const formatDate = game.completedAt ? formatLongDate : formatShortDate;
  if (game.startedAt) values.push(`<span class="history-pill history-date-pill"><small>Started</small><strong>${escapeHtml(formatDate(game.startedAt))}</strong></span>`);
  if (game.completedAt) values.push(`<span class="history-pill history-date-pill"><small>Finished</small><strong>${escapeHtml(formatDate(game.completedAt))}</strong></span>`);
  const duration = finishedDurationText(game.startedAt, game.completedAt);
  if (duration) values.push(`<span class="history-pill history-date-pill"><small>Time</small><strong>${escapeHtml(duration)}</strong></span>`);
  return values;
}

function studioText(game) {
  return [game.developer, game.publisher].filter(Boolean).join(" / ");
}

function compareGames(a, b, section) {
  const direction = state.filters.direction === "desc" ? -1 : 1;
  const streamSort = compareStreamFirst(a, b);
  if (streamSort) return streamSort;
  if (Boolean(a.playing) !== Boolean(b.playing)) return a.playing ? -1 : 1;
  if (section === "upcoming") {
    return compareReleaseDates(a, b) || stringCompare(a.title, b.title);
  }
  if (state.filters.sort === "custom" && section === "backlog") {
    return (a.order ?? 0) - (b.order ?? 0);
  }
  if (state.filters.sort === "platform") {
    return direction * (stringCompare(canonicalPlatform(a.platform), canonicalPlatform(b.platform)) || stringCompare(a.title, b.title));
  }
  if (state.filters.sort === "added") {
    return direction * (addedTimeValue(a) - addedTimeValue(b) || stringCompare(a.title, b.title));
  }
  if (state.filters.sort === "time" || state.filters.sort === "playtime") {
    return direction * (((a.lengthHours ?? Number.POSITIVE_INFINITY) - (b.lengthHours ?? Number.POSITIVE_INFINITY))
      || stringCompare(a.title, b.title));
  }
  return direction * stringCompare(a.title, b.title);
}

function comparePlayingGames(a, b) {
  return compareStreamFirst(a, b)
    || Number(Boolean(a.coop)) - Number(Boolean(b.coop))
    || playingStartSortValue(a) - playingStartSortValue(b)
    || stringCompare(a.title, b.title);
}

function compareStreamFirst(a, b) {
  return Number(Boolean(b.stream)) - Number(Boolean(a.stream));
}

function playingStartSortValue(game) {
  return game.startedAt ? new Date(`${game.startedAt}T00:00:00`).getTime() : Number.POSITIVE_INFINITY;
}

function compareReleaseDates(a, b) {
  return releaseSortValue(a) - releaseSortValue(b);
}

function releaseSortValue(game) {
  return game.releaseDate ? new Date(`${game.releaseDate}T00:00:00`).getTime() : Number.POSITIVE_INFINITY;
}

function stringCompare(a = "", b = "") {
  return a.localeCompare(b, undefined, { sensitivity: "base" });
}

function platformBadge(platform, count = null) {
  const cls = platformClass(platform);
  const logo = platformLogo(platform);
  const label = canonicalPlatform(platform) || platform;
  return `
    <span class="platform-badge ${cls}" title="${escapeHtml(platformDisplayName(label))}">
      <span class="platform-icon">
        <img src="${escapeHtml(logo)}" alt="" width="18" height="18" decoding="async">
      </span>
      <span class="platform-label">${escapeHtml(label)}</span>
      ${count == null ? "" : `<span class="platform-count">${count}</span>`}
    </span>
  `;
}

function ownerBadge(owner) {
  return `<span class="owner-pill owner-${escapeHtml(normalizeTag(owner))}">${escapeHtml(owner)}</span>`;
}

function statusBadge(status) {
  return `<span class="status-pill ${escapeHtml(statusType(status))}">${escapeHtml(status)}</span>`;
}

function replayBadge(count) {
  return `<span class="replay-pill">Replay ${escapeHtml(count)}</span>`;
}

function achievementProviderForGame(game) {
  const platform = String(game?.platform || "").toLowerCase();
  if (platform.includes("pc") || platform.includes("steam")) {
    return { key: "playstation", label: "Completed", icon: "" };
  }
  if (platform.includes("xbox")) {
    return { key: "playstation", label: "Completed", icon: "" };
  }
  return { key: "playstation", label: "Completed", icon: "" };
}

function completionPill(game) {
  if (game?.emulator) return "";
  const provider = achievementProviderForGame(game);
  if (!provider) return "";
  const icon = provider.icon
    ? `<img class="achievement-platform-icon" src="${escapeHtml(provider.icon)}" alt="" width="16" height="16" decoding="async">`
    : trophyIcon();
  return `<span class="platinum-pill achievement-${escapeHtml(provider.key)}">${icon}${escapeHtml(provider.label)}</span>`;
}

function pencilIcon() {
  return `
    <svg class="pencil-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 20h4l11-11a2.8 2.8 0 0 0-4-4L4 16v4Z"></path>
      <path d="M13.5 6.5l4 4"></path>
    </svg>
  `;
}

function plusIcon() {
  return `
    <svg class="plus-icon" viewBox="0 0 24 24">
      <path d="M12 5v14"></path>
      <path d="M5 12h14"></path>
    </svg>
  `;
}

function linesIcon() {
  return `
    <svg class="view-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 7h14"></path>
      <path d="M5 12h14"></path>
      <path d="M5 17h14"></path>
    </svg>
  `;
}

function gridIcon() {
  return `
    <svg class="view-icon" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4.5" y="4.5" width="5.5" height="5.5"></rect>
      <rect x="14" y="4.5" width="5.5" height="5.5"></rect>
      <rect x="4.5" y="14" width="5.5" height="5.5"></rect>
      <rect x="14" y="14" width="5.5" height="5.5"></rect>
    </svg>
  `;
}

function sortArrowIcon(desc = false) {
  return `
    <svg class="sort-arrow-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="${desc ? "M12 3.5v17" : "M12 20.5v-17"}"></path>
      <path d="${desc ? "M6.5 15l5.5 5.5 5.5-5.5" : "M6.5 9l5.5-5.5L17.5 9"}"></path>
    </svg>
  `;
}

function pauseIcon() {
  return `
    <svg class="pause-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 4.5v15"></path>
      <path d="M16 4.5v15"></path>
    </svg>
  `;
}

function playIcon() {
  return `
    <svg class="play-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 5.5v13l11-6.5-11-6.5Z"></path>
    </svg>
  `;
}

function euroIcon() {
  return `
    <svg class="euro-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M19 5.5A7 7 0 0 0 8.2 7.1 7.4 7.4 0 0 0 7 12a7.4 7.4 0 0 0 1.2 4.9A7 7 0 0 0 19 18.5"></path>
      <path d="M4 10h10"></path>
      <path d="M4 14h10"></path>
    </svg>
  `;
}

function dollarIcon() {
  return `
    <svg class="dollar-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 4.5v15"></path>
      <path d="M16.4 7.4c-.9-.8-2.2-1.2-3.8-1.2h-1.1c-2.2 0-3.7 1.2-3.7 2.9 0 1.8 1.4 2.6 3.7 3.1l1.4.3c2.2.5 3.5 1.3 3.5 3.1 0 1.7-1.5 2.9-3.8 2.9h-1.1c-1.7 0-3-.4-4-1.3"></path>
    </svg>
  `;
}

function currencyIcon() {
  return state.settings.currency === "USD" ? dollarIcon() : euroIcon();
}

function checkIcon() {
  return `
    <svg class="check-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12.5l4.2 4.2L19 7"></path>
    </svg>
  `;
}

function trophyIcon() {
  return `
    <svg class="trophy-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 4h8v4a4 4 0 0 1-8 0V4Z"></path>
      <path d="M8 6H5a3 3 0 0 0 3 3"></path>
      <path d="M16 6h3a3 3 0 0 1-3 3"></path>
      <path d="M12 12v4"></path>
      <path d="M9 20h6"></path>
      <path d="M10 16h4v4h-4z"></path>
    </svg>
  `;
}

function platformLogo(platform) {
  const value = platform.toLowerCase();
  if (value === "wii") return "assets/platforms/wii.png";
  if (value === "wii u" || value === "wiiu") return "assets/platforms/wiiu.png";
  if (value === "n64") return "assets/platforms/n64.png";
  if (value === "gc" || value.includes("gamecube")) return "assets/platforms/gc.png";
  if (value === "nes") return "assets/platforms/nes.png";
  if (value === "snes") return "assets/platforms/snes.png";
  if (value === "ds") return "assets/platforms/nds.png";
  if (value === "3ds") return "assets/platforms/3ds.png";
  if (value === "gba") return "assets/platforms/gba.png";
  if (value === "gbc") return "assets/platforms/gbc.png";
  if (value === "gb") return "assets/platforms/gb";
  if (value === "dc" || value.includes("dreamcast")) return "assets/platforms/dreamcast.png";
  if (isSegaPlatform(value)) return "assets/platforms/sega.png";
  if (value.includes("switch")) return "assets/platforms/switch.png";
  if (/\bps\d*\b/.test(value) || value.includes("playstation") || value.includes("psp") || value.includes("vita")) return "assets/platforms/playstation.png";
  if (value.includes("xbox") || value.includes("microsoft") || value === "x360" || value === "xone") return "assets/platforms/xbox.png";
  if (value.includes("steam") || value.includes("pc")) return "assets/platforms/steam.png";
  return "assets/Icon.png";
}

function platformClass(platform) {
  const value = platform.toLowerCase();
  if (value === "wii") return "platform-wii";
  if (value === "wii u" || value === "wiiu") return "platform-wiiu";
  if (value === "n64") return "platform-n64";
  if (value === "gc" || value.includes("gamecube")) return "platform-gamecube";
  if (value === "nes") return "platform-nes";
  if (value === "snes") return "platform-snes";
  if (value === "ds") return "platform-ds";
  if (value === "3ds") return "platform-3ds";
  if (value === "gba") return "platform-gba";
  if (value === "gbc") return "platform-gbc";
  if (value === "gb") return "platform-gb";
  if (value === "dc" || value.includes("dreamcast")) return "platform-dreamcast";
  if (isSegaPlatform(value)) return "platform-sega";
  if (value.includes("switch")) return "platform-nintendo";
  if (/\bps\d*\b/.test(value) || value.includes("playstation") || value.includes("psp") || value.includes("vita")) return "platform-playstation";
  if (value.includes("xbox") || value.includes("microsoft") || value === "x360" || value === "xone") return "platform-xbox";
  if (value.includes("steam") || value.includes("pc")) return "platform-pc";
  return "platform-generic";
}

function isSegaPlatform(value) {
  return /\b(gen|genesis|mega drive|megadrive|sega|saturn|cd|32x|master system|game gear)\b/i.test(value);
}

function timeBadge(hours, url = "") {
  const content = `<strong>${escapeHtml(hours)}</strong><span>hrs</span>`;
  const style = timeStyle(hours);
  if (url) {
    return `<a class="time-pill" style="${style}" href="${escapeHtml(url)}" target="_blank" rel="noreferrer" title="HowLongToBeat">${content}</a>`;
  }
  return `<span class="time-pill" style="${style}">${content}</span>`;
}

function timeStyle(hours) {
  const clamped = Math.max(0, Math.min(1, (Number(hours) - 7) / 53));
  const hue = Math.round(132 - (132 * clamped));
  const base = `hsl(${hue}, 88%, 56%)`;
  const light = `hsl(${Math.min(140, hue + 10)}, 94%, 72%)`;
  const dark = `hsl(${Math.max(0, hue - 8)}, 82%, 39%)`;
  return `--time-color:${base};--time-light:${light};--time-dark:${dark};--time-glow:hsla(${hue}, 88%, 56%, 0.34)`;
}

function chipsFor(game) {
  const chips = [];
  if (game.preorderStore) chips.push(chip(`Preordered: ${game.preorderStore}`, "accent"));
  if (game.preferredStore) chips.push(chip(`Buy: ${game.preferredStore}`));
  (game.genres || []).slice(0, 4).forEach((genre) => chips.push(chip(genre, "genre")));
  return chips;
}

function chip(label, type = "") {
  return `<span class="chip ${escapeHtml(type)}">${escapeHtml(label)}</span>`;
}

function gameStatuses(game) {
  return unique([...(game.statuses || []), ...(game.tags || [])].map(canonicalStatus).filter(Boolean));
}

function ownerTags(game) {
  const owners = unique((game.owners || []).map(canonicalOwner).filter(Boolean));
  return owners.length ? owners : [state.settings.defaultOwner || DEFAULT_SETTINGS.defaultOwner];
}

function canonicalStatus(status) {
  const normalized = normalizeTag(status);
  if (!normalized) return "";
  const aliases = {
    tocollect: "To Collect",
    collect: "To Collect",
    scarce: "Scarce",
    waitingphysical: "Waiting for Physical",
    waitingforphysical: "Waiting for Physical",
  };
  return aliases[normalized] || "";
}

function canonicalOwner(owner) {
  const cleaned = cleanOwnerLabel(owner);
  const normalized = normalizeTag(owner);
  if (normalized === "xavi") return "Xavi";
  if (normalized === "judy") return "Judy";
  if (normalized === "jordi") return "Jordi";
  return cleaned;
}

function ownerInputValues(value) {
  const owners = listFrom(value).map(canonicalOwner).filter(Boolean);
  return owners.length ? owners : [state.settings.defaultOwner || DEFAULT_SETTINGS.defaultOwner];
}

function canonicalPlatform(value) {
  const text = String(value || "").trim();
  const normalized = normalizeTag(text);
  const aliases = {
    playstation: "PS1",
    playstation1: "PS1",
    psone: "PS1",
    psx: "PS1",
    ps1: "PS1",
    playstation2: "PS2",
    ps2: "PS2",
    playstation3: "PS3",
    ps3: "PS3",
    playstationportable: "PSP",
    psp: "PSP",
    playstationvita: "PSVita",
    psvita: "PSVita",
    vita: "PSVita",
    playstation4: "PS4",
    ps4: "PS4",
    playstation5: "PS5",
    ps5: "PS5",
    nintendoswitch: "Switch",
    switch: "Switch",
    nintendoswitch2: "Switch 2",
    switch2: "Switch 2",
    steam: "Steam",
    pc: "Steam",
    microsoft: "Xbox PC",
    microsoftpc: "Xbox PC",
    xboxpc: "Xbox PC",
    windowsstore: "Xbox PC",
    microsoftstore: "Xbox PC",
    xbox360: "X360",
    x360: "X360",
    xboxone: "XOne",
    xone: "XOne",
    xboxseries: "Xbox Series",
    xboxseriesx: "Xbox Series",
    xboxseriess: "Xbox Series",
    xboxseriesxs: "Xbox Series",
    xbox: "Xbox",
    wii: "Wii",
    nintendowii: "Wii",
    wiiu: "Wii U",
    nintendowiiu: "Wii U",
    nintendo64: "N64",
    n64: "N64",
    gamecube: "GC",
    nintendogamecube: "GC",
    gc: "GC",
    nintendoentertainmentsystem: "NES",
    nes: "NES",
    supernintendo: "SNES",
    supernintendoentertainmentsystem: "SNES",
    snes: "SNES",
    nintendods: "DS",
    nds: "DS",
    ds: "DS",
    nintendo3ds: "3DS",
    n3ds: "3DS",
    threeds: "3DS",
    "3ds": "3DS",
    gameboyadvance: "GBA",
    gba: "GBA",
    gameboycolor: "GBC",
    gbc: "GBC",
    gameboy: "GB",
    gb: "GB",
    genesis: "Gen",
    megadrive: "Gen",
    segamegadrive: "Gen",
    segagenesis: "Gen",
    sega: "Sega",
    dreamcast: "DC",
    segadreamcast: "DC",
    dc: "DC",
    segacd: "Sega CD",
    cd: "Sega CD",
    saturn: "Saturn",
    segasaturn: "Saturn",
    mastersystem: "Master System",
    segamastersystem: "Master System",
    gamegear: "Game Gear",
    segagamegear: "Game Gear",
    sega32x: "32X",
    "32x": "32X",
  };
  return aliases[normalized] || text;
}

function platformFilterGroup(platform) {
  const value = canonicalPlatform(platform);
  return ["Steam", "Xbox PC"].includes(value) ? "PC" : value;
}

function platformDisplayName(platform) {
  const labels = {
    X360: "Xbox 360",
    XOne: "Xbox One",
    GBC: "GameBoy Color",
    GB: "GameBoy",
    GC: "GameCube",
    Gen: "Sega Genesis",
  };
  return labels[canonicalPlatform(platform) || platform] || platform;
}

function normalizeGameRecords(games) {
  return Array.isArray(games) ? games.map(normalizeGameRecord) : [];
}

function normalizeGameRecord(game) {
  const normalized = { ...game };
  normalized.editedAt = String(normalized.editedAt || normalized.updatedAt || normalized.createdAt || "");
  normalized.cover = MANUAL_GAME_COVER_OVERRIDES[normalizeTag(normalized.title)] || normalized.cover || "";
  normalized.digital = Boolean(normalized.digital);
  normalized.emulator = Boolean(normalized.emulator);
  normalized.coop = Boolean(normalized.coop);
  normalized.stream = Boolean(normalized.stream);
  normalized.platinum = Boolean(normalized.platinum);
  normalized.playing = Boolean(normalized.playing);
  normalized.replayCount = replayCountValue(normalized.replayCount);
  normalized.startedAt = dateOnly(normalized.startedAt);
  normalized.completedAt = dateOnly(normalized.completedAt);
  normalized.platform = canonicalPlatform(normalized.platform);
  normalized.description = String(normalized.description || "");
  normalized.igdbUrl = String(normalized.igdbUrl || "");
  normalized.trailerUrl = String(normalized.trailerUrl || "");
  normalized.trailerUrlRemoved = Boolean(normalized.trailerUrlRemoved);
  normalized.storeLinks = normalizeStoreLinks(normalized.storeLinks);
  normalized.steamAppId = cleanSteamAppId(normalized.steamAppId) || steamAppIdFromUrl(normalized.storeLinks.steam);
  normalized.owners = ownerTags(normalized);
  normalized.statuses = gameStatuses(normalized);
  normalized.genres = unique((Array.isArray(normalized.genres) ? normalized.genres : []).map((genre) => String(genre || "").trim()).filter(Boolean));
  normalized.prices = Array.isArray(normalized.prices) ? normalized.prices : [];
  return normalized;
}

function statusType(status) {
  if (status === "Scarce") return "scarce";
  if (status === "Waiting for Physical") return "waiting";
  if (status === "To Collect") return "collect";
  return "";
}

function shortDescription(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function previewDescription(value, maxLength = 180) {
  const text = shortDescription(value);
  return text.length <= maxLength ? text : `${text.slice(0, maxLength - 3).trim()}...`;
}

function cssUrl(value) {
  return String(value || "").replace(/["\\\n\r]/g, "");
}

function backgroundCoverUrl(value) {
  const url = coverDisplayUrl(value);
  return url || String(value || "");
}

function coverDisplayUrl(value, size = "card") {
  const sizes = {
    tiny: "t_thumb",
    card: "t_cover_big",
    playing: "t_1080p",
    detail: "t_1080p",
  };
  const replacement = sizes[size] || sizes.card;
  return String(value || "").replace(
    /images\.igdb\.com\/igdb\/image\/upload\/[^/]+\//,
    `images.igdb.com/igdb/image/upload/${replacement}/`
  );
}

function upgradeCoverIfFast(target, value, size, timeoutMs = 900) {
  const highResUrl = coverDisplayUrl(value, size);
  const currentUrl = coverDisplayUrl(value);
  if (!target || !highResUrl || highResUrl === currentUrl) return;
  const requestKey = `${size}:${highResUrl}`;
  target.dataset.coverUpgrade = requestKey;
  const preload = new Image();
  let expired = false;
  const timer = setTimeout(() => {
    expired = true;
  }, timeoutMs);
  preload.onload = () => {
    clearTimeout(timer);
    if (expired || target.dataset.coverUpgrade !== requestKey) return;
    target.src = highResUrl;
  };
  preload.onerror = () => clearTimeout(timer);
  preload.decoding = "async";
  preload.src = highResUrl;
}

function normalizeStoreLinks(links) {
  const value = links && typeof links === "object" ? links : {};
  return {
    playstation: String(value.playstation || ""),
    nintendo: String(value.nintendo || ""),
    steam: String(value.steam || ""),
  };
}

function cleanSteamAppId(value) {
  return String(value || "").replace(/\D/g, "").slice(0, 12);
}

function steamAppIdFor(game) {
  return cleanSteamAppId(game?.steamAppId) || steamAppIdFromUrl(game?.storeLinks?.steam || "");
}

function steamAppIdFromUrl(value) {
  const text = String(value || "").trim();
  const direct = text.match(/(?:^|[^\d])(\d{2,12})(?:[^\d]|$)/);
  try {
    const url = new URL(text);
    const appIndex = url.pathname.split("/").filter(Boolean).indexOf("app");
    if (appIndex >= 0) return cleanSteamAppId(url.pathname.split("/").filter(Boolean)[appIndex + 1] || "");
  } catch {}
  return direct ? cleanSteamAppId(direct[1]) : "";
}

function storeLinksFor(game) {
  const links = storeLinksWithFallbacks(game);
  const hltbUrl = hltbUrlFor(game);
  const stores = [
    { key: "playstation", label: "PlayStation", cls: "store-playstation", icon: "assets/sites/playstation.png", provider: playStationStoreName() },
    { key: "nintendo", label: "Nintendo", cls: "store-nintendo", icon: "assets/sites/nintendo.png", provider: nintendoStoreName() },
    { key: "steam", label: "Steam", cls: "store-steam", icon: "assets/sites/steam.png", provider: "Steam" },
    { key: "xbox", label: "Xbox", cls: "store-xbox", icon: "assets/platforms/xbox.png", provider: "Xbox" },
  ];
  const providers = platformStoreProvidersForGame(game);
  return [
    ...stores
    .filter((store) => providers.includes(store.provider))
    .map((store) => storeButton(store.label, links[store.key], store.cls, store.icon)),
    providers.length ? "" : storeButton("Wikipedia", wikipediaUrlFor(game), "store-wikipedia", "assets/sites/wikipedia.ico"),
    hltbUrl ? storeButton("HowLongToBeat", hltbUrl, "store-hltb", "assets/sites/howlongtobeat.png") : "",
  ].filter(Boolean).join("");
}

function storeButton(label, url, cls, icon) {
  return `
    <a class="store-button ${cls}" href="${escapeHtml(url)}" target="_blank" rel="noreferrer">
      ${icon ? `<img src="${escapeHtml(icon)}" alt="" width="18" height="18" decoding="async">` : ""}
      ${escapeHtml(label)}
    </a>
  `;
}

function storeLinksWithFallbacks(game) {
  const links = normalizeStoreLinks(game.storeLinks);
  const q = encodeURIComponent(retailTitle(game.title));
  const region = state.settings.region;
  return {
    playstation: regionalStoreLink(links.playstation, "playstation", q, region),
    nintendo: regionalStoreLink(links.nintendo, "nintendo", q, region),
    steam: links.steam || `https://store.steampowered.com/search/?term=${q}`,
    xbox: `https://www.xbox.com/search?q=${q}`,
  };
}

function wikipediaUrlFor(game) {
  return `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(retailTitle(game.title))}`;
}

function regionalStoreLink(url, store, query, region = state.settings.region) {
  const fallback = store === "playstation"
    ? playStationSearchUrl(query, region)
    : nintendoSearchUrl(query, region);
  if (!url) return fallback;
  if (store === "playstation" && /playstation\.com\/(?:en-us|en-gb|es-es)\/search\?/i.test(url)) return fallback;
  if (store === "nintendo" && /nintendo\.com\/(?:us\/search|en-gb\/Search|es-es\/Buscar)\//i.test(url)) return fallback;
  return url;
}

function hltbUrlFor(game) {
  const direct = normalizeGuideUrl(game.hltbUrl || game.howLongToBeatUrl);
  if (direct) return direct;
  const id = String(game.hltbId || game.howLongToBeatId || "").trim();
  if (/^\d+$/.test(id)) return `https://howlongtobeat.com/game/${encodeURIComponent(id)}`;
  const query = retailTitle(game.title);
  return query ? `https://howlongtobeat.com/?q=${encodeURIComponent(query)}` : "";
}

function renderDetailGuides(game) {
  const links = guideLinksFor(game);
  el.detailGuides.hidden = !links.length;
  el.detailGuideLinks.innerHTML = links.join("");
}

function guideLinksFor(game) {
  const title = retailTitle(game.title);
  if (!title) return [];
  const links = [];
  if (["PS4", "PS5"].includes(canonicalPlatform(game.platform))) {
    links.push(guideButton(
      "PSNProfiles",
      psnProfilesGuideUrl(game, title),
      "guide-psnprofiles",
      "assets/sites/psnprofiles.png"
    ));
  }
  links.push(
    guideButton("Neoseeker", neoseekerGuideUrl(game, title), "guide-neoseeker", "assets/sites/neoseeker.png"),
    guideButton("RPG Site", rpgSiteGuideUrl(game, title), "guide-rpgsite", "assets/sites/rpgsite.png")
  );
  return links;
}

function guideButton(label, url, cls, icon) {
  return `
    <a class="guide-button ${cls}" href="${escapeHtml(url)}" target="_blank" rel="noreferrer">
      <img src="${escapeHtml(icon)}" alt="" width="18" height="18" decoding="async">
      <span>${escapeHtml(label)}</span>
    </a>
  `;
}

function psnProfilesGuideUrl(game, title) {
  const known = knownGuideLinksFor(title).psnprofiles;
  if (known) return known;
  const direct = normalizeGuideUrl(game.guideLinks?.psnprofiles);
  if (direct) return direct;
  const exact = normalizeGuideUrl(game.psnprofilesGuideUrl || game.psnGuideUrl);
  if (exact) return exact;
  const guideId = String(game.psnprofilesGuideId || game.psnGuideId || "").trim();
  if (/^\d+$/.test(guideId)) return `https://psnprofiles.com/guide/${encodeURIComponent(guideId)}`;
  return siteSearchUrl("psnprofiles.com/guide", `${title} trophy guide`);
}

function neoseekerGuideUrl(game, title) {
  const known = knownGuideLinksFor(title).neoseeker;
  if (known) return known;
  const direct = normalizeGuideUrl(game.guideLinks?.neoseeker);
  return direct || `https://www.neoseeker.com/${guideSlug(title)}/walkthrough`;
}

function rpgSiteGuideUrl(game, title) {
  const known = knownGuideLinksFor(title).rpgsite;
  if (known) return known;
  const direct = normalizeGuideUrl(game.guideLinks?.rpgsite);
  if (direct) return direct;
  const gameId = String(game.rpgsiteGameId || "").trim();
  if (gameId) return `https://www.rpgsite.net/games/${encodeURIComponent(gameId)}-${guideSlug(title)}/guides`;
  return `https://www.rpgsite.net/search?terms=${encodeURIComponent(`${title} guide`)}`;
}

function siteSearchUrl(site, query) {
  return `https://www.google.com/search?q=${encodeURIComponent(`site:${site} ${query}`)}`;
}

function normalizeGuideUrl(value) {
  const url = String(value || "").trim();
  return /^https?:\/\//i.test(url) ? url : "";
}

function knownGuideLinksFor(title) {
  const guides = {
    control: {
      psnprofiles: "https://psnprofiles.com/guide/9040-control-trophy-guide",
    },
    pragmata: {
      neoseeker: "https://www.neoseeker.com/pragmata/walkthrough",
      psnprofiles: "https://psnprofiles.com/guide/24998-pragmata-trophy-guide",
      rpgsite: "https://www.rpgsite.net/games/2464-pragmata/guides",
    },
  };
  return guides[guideSlug(title)] || {};
}

function guideSlug(title) {
  return retailTitle(title).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "");
}

function pricesFor(game) {
  const prices = normalizedPrices(game);
  const best = prices.filter((price) => price.numericPrice).sort((a, b) => a.numericPrice - b.numericPrice)[0];
  return prices.map((price) => {
    const hasPrice = Boolean(price.price);
    const label = hasPrice ? price.price : `- ${currencySymbol()}`;
    const cls = ["price-link", best?.store === price.store && hasPrice ? "best" : "", hasPrice ? "has-price" : "missing-price"].filter(Boolean).join(" ");
    return `
      <a class="${cls}" href="${escapeHtml(price.url)}" target="_blank" rel="noreferrer" title="${escapeHtml(price.store)}" aria-label="${escapeHtml(`${price.store}: ${label}`)}">
        <img class="store-icon" src="${escapeHtml(storeIcon(price.store))}" alt="" width="16" height="16" decoding="async">
        <strong>${escapeHtml(label)}</strong>
      </a>
    `;
  }).join("");
}

function fallbackPriceLinks(game) {
  const q = retailQuery(game.title, game.platform);
  if (game.digital || isXboxStoreGame(game)) {
    const region = state.settings.region;
    const links = [
      { store: nintendoStoreName(), url: nintendoSearchUrl(q, region) },
      { store: playStationStoreName(), url: playStationSearchUrl(q, region) },
      { store: "Steam", url: `https://store.steampowered.com/search/?term=${q}` },
      { store: "Xbox", url: xboxSearchUrl(q, region) },
    ];
    const providers = platformStoreProvidersForGame(game);
    return links.filter((link) => providers.includes(link.store));
  }
  return [
    { store: amazonStoreName(), url: amazonSearchUrl(q, state.settings.region) },
    { store: "Xtralife", url: `https://www.xtralife.com/buscar/${q}` },
    { store: "GAME.es", url: `https://www.game.es/buscar/${q}` },
    { store: "Retro Island NY", url: `https://retroislandny.com/search?q=${q}&country=${state.settings.region}&currency=${state.settings.currency}` },
    { store: "GameStop", url: `https://www.gamestop.com/search/?q=${q}` },
    { store: "Walmart", url: `https://www.walmart.com/search?q=${q}` },
  ];
}

function retailQuery(title, platform) {
  return encodeURIComponent(`${retailTitle(title)} ${platform}`.trim());
}

function retailTitle(title) {
  return String(title || "")
    .replace(/\.hack\/{2}\s*/i, "hack gu ")
    .replace(/007:\s*First\s*Light/i, "007 First Light")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[™®]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizedPrices(game) {
  const existing = new Map((game.prices || []).map((price) => [price.store, price]));
  return priceProvidersForGame(game).map((store) => {
    const price = existing.get(store);
    return price || fallbackPriceLinks(game).find((item) => item.store === store);
  });
}

function priceProvidersForGame(game) {
  return game.digital || isXboxStoreGame(game) ? platformStoreProvidersForGame(game) : physicalStoreProviders();
}

function physicalStoreProviders() {
  return (state.settings.stores || []).slice(0, 4).map((store) => {
    if (store === "Amazon") return amazonStoreName();
    return store;
  });
}

function platformStoreProvidersForGame(game) {
  const platform = canonicalPlatform(game.platform);
  if (platform === "Switch" || platform === "Switch 2") return [nintendoStoreName()];
  if (platform === "PS4" || platform === "PS5") return [playStationStoreName()];
  if (platform === "Steam") return ["Steam"];
  if (["Xbox PC", "Xbox Series", "X360", "XOne"].includes(platform)) return ["Xbox"];
  return [];
}

function currencySymbol() {
  return state.settings.currency === "USD" ? "$" : "€";
}

function amazonStoreName(region = state.settings.region) {
  if (region === "US") return "Amazon.com";
  if (region === "UK") return "Amazon.co.uk";
  return "Amazon.es";
}

function nintendoStoreName(region = state.settings.region) {
  if (region === "US") return "Nintendo US";
  if (region === "UK") return "Nintendo UK";
  return "Nintendo España";
}

function playStationStoreName(region = state.settings.region) {
  if (region === "US") return "PlayStation US";
  if (region === "UK") return "PlayStation UK";
  return "PlayStation España";
}

function amazonSearchUrl(query, region = state.settings.region) {
  if (region === "US") return `https://www.amazon.com/s?k=${query}`;
  if (region === "UK") return `https://www.amazon.co.uk/s?k=${query}`;
  return `https://www.amazon.es/s?k=${query}`;
}

function nintendoSearchUrl(query, region = state.settings.region) {
  if (region === "US") return `https://www.nintendo.com/us/search/?q=${query}`;
  if (region === "UK") return `https://www.nintendo.com/en-gb/Search/Search-299117.html?q=${query}`;
  return `https://www.nintendo.com/es-es/Buscar/Buscar-299117.html?q=${query}&f=147394-86`;
}

function playStationSearchUrl(query, region = state.settings.region) {
  if (region === "US") return `https://www.playstation.com/en-us/search/?q=${query}`;
  if (region === "UK") return `https://www.playstation.com/en-gb/search/?q=${query}`;
  return `https://www.playstation.com/es-es/search/?q=${query}`;
}

function xboxSearchUrl(query, region = state.settings.region) {
  const locale = region === "US" ? "en-US" : region === "UK" ? "en-GB" : "es-ES";
  return `https://www.xbox.com/${locale}/search?q=${query}`;
}

function storeIcon(store) {
  if (store.startsWith("Amazon")) return "assets/stores/amazon.ico";
  if (store === "Xtralife") return "assets/stores/xtralife.ico";
  if (store === "GAME.es") return "assets/stores/game.ico";
  if (store === "Retro Island NY") return "assets/stores/retroisland.png";
  if (store === "GameStop") return "https://www.gamestop.com/favicon.ico";
  if (store === "Walmart") return "https://www.walmart.com/favicon.ico";
  if (store.startsWith("Nintendo")) return "assets/sites/nintendo.png";
  if (store.startsWith("PlayStation")) return "assets/sites/playstation.png";
  if (store === "Steam") return "assets/sites/steam.png";
  if (store === "Xbox") return "assets/platforms/xbox.png";
  return "";
}

function releaseStatus(game, options = {}) {
  const includePast = Boolean(options.includePast);
  if (game.releaseDate) {
    const release = new Date(`${game.releaseDate}T00:00:00`);
    if (Number.isNaN(release.getTime()) || release.getFullYear() < 1990) {
      if (game.releaseText && (includePast || game.section === "upcoming")) return game.releaseText;
      return game.section === "upcoming" ? "???" : "";
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (release <= today && !includePast) return "";
    return `${release <= today ? "Released" : "Releases"} ${game.releaseDate}`;
  }
  if (game.releaseText && (includePast || game.section === "upcoming")) return game.releaseText;
  return game.section === "upcoming" ? "???" : "";
}

function dateOnly(value) {
  if (!value) return "";
  if (typeof value === "string") {
    const iso = value.match(/\d{4}-\d{2}-\d{2}/);
    if (iso) return iso[0];
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function shouldCreatePreorderCalendarEvent(existing, game) {
  return Boolean(game?.preorderStore)
    && !existing?.preorderStore
    && validReleaseDate(game.releaseDate);
}

async function createPreorderCalendarEvent(game) {
  const password = sessionStorage.getItem(`${SESSION_KEY}:password`) || "";
  try {
    await fetch("/api/calendar", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-edit-password": password,
      },
      body: JSON.stringify({ game }),
    });
  } catch {
    // Calendar sync is best-effort; the game save should never be blocked by it.
  }
}

function formatShortDate(value) {
  const date = dateOnly(value);
  if (!date) return "";
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}

function formatLongDate(value) {
  const date = dateOnly(value);
  if (!date) return "";
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(parsed);
}

async function openEditor(id = "") {
  if (!await ensureEditMode()) return;
  state.editingId = id;
  state.pendingDescription = "";
  const game = state.games.find((item) => item.id === id) || blankGame();
  el.dialogTitle.textContent = id ? "Edit Game" : "Add Game";
  el.deleteButton.hidden = !id;
  el.lookupResults.innerHTML = "";
  el.lookupInput.value = game.title || "";
  el.fields.id.value = game.id || "";
  el.fields.title.value = game.title || "";
  el.fields.platform.value = game.platform || "";
  el.fields.section.value = game.section || "wanted";
  el.fields.releaseDate.value = game.releaseDate || "";
  el.fields.releaseText.value = game.releaseText || "";
  el.fields.length.value = game.lengthHours || "";
  el.fields.startedAt.value = dateOnly(game.startedAt);
  el.fields.completedAt.value = dateOnly(game.completedAt);
  el.fields.replayCount.value = game.replayCount || "";
  el.fields.platinum.checked = Boolean(game.platinum);
  el.fields.preorderStore.value = game.preorderStore || "";
  el.fields.preferredStore.value = game.preferredStore || "";
  el.fields.owners.value = ownerTags(game).join(", ");
  el.fields.statuses.value = gameStatuses(game).join(", ");
  el.fields.digital.checked = Boolean(game.digital);
  if (el.fields.emulator) el.fields.emulator.checked = Boolean(game.emulator);
  el.fields.coop.checked = Boolean(game.coop);
  if (el.fields.stream) el.fields.stream.checked = Boolean(game.stream);
  el.fields.playing.checked = Boolean(game.playing);
  el.fields.genres.value = (game.genres || []).join(", ");
  el.fields.developer.value = game.developer || "";
  el.fields.publisher.value = game.publisher || "";
  el.fields.description.value = game.description || "";
  el.fields.igdbUrl.value = game.igdbUrl || "";
  el.fields.trailerUrl.value = game.trailerUrl || "";
  el.fields.playstationUrl.value = game.storeLinks?.playstation || "";
  el.fields.nintendoUrl.value = game.storeLinks?.nintendo || "";
  el.fields.steamUrl.value = game.storeLinks?.steam || "";
  el.fields.steamAppId.value = game.steamAppId || steamAppIdFromUrl(game.storeLinks?.steam || "");
  el.fields.cover.value = game.cover || "";
  el.fields.notes.value = game.notes || "";
  syncDialogPriceVisibility();
  pauseAllPlayingTrailers();
  el.dialog.showModal();
  syncScrollLock();
}

async function addGameFromSearch(query, section = "wanted") {
  const title = String(query || "").trim();
  if (!title) return openEditor("");
  await openEditor("");
  el.lookupInput.value = title;
  el.fields.title.value = title;
  if (["wanted", "released", "backlog"].includes(section)) el.fields.section.value = section;
  syncDialogPriceVisibility();
  queueTitleLookup();
}

function blankGame() {
  const createdAt = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    title: "",
    platform: "",
    section: "wanted",
    releaseDate: "",
    releaseText: "",
    lengthHours: null,
    notes: "",
    description: "",
    statuses: [],
    digital: false,
    emulator: false,
    coop: false,
    stream: false,
    platinum: false,
    playing: false,
    replayCount: 0,
    startedAt: "",
    genres: [],
    developer: "",
    publisher: "",
    igdbUrl: "",
    trailerUrl: "",
    steamAppId: "",
    storeLinks: { playstation: "", nintendo: "", steam: "" },
    owners: [state.settings.defaultOwner || DEFAULT_SETTINGS.defaultOwner],
    preorderStore: "",
    preferredStore: "",
    cover: "",
    prices: [],
    order: nextOrder("wanted"),
    completedAt: "",
    createdAt,
    editedAt: createdAt,
    updatedAt: createdAt,
  };
}

async function saveFromForm(event) {
  event.preventDefault();
  const existing = state.games.find((game) => game.id === el.fields.id.value);
  const game = await saveCurrentFormGame();
  if (shouldCreatePreorderCalendarEvent(existing, game)) {
    createPreorderCalendarEvent(game);
  }
  el.dialog.close();
  refreshPricesForGame(game.id, { silent: true });
}

async function saveCurrentFormGame() {
  const id = el.fields.id.value || crypto.randomUUID();
  const existing = state.games.find((game) => game.id === id);
  const completedAt = el.fields.completedAt.value || "";
  const replayInput = el.fields.replayCount.value.trim();
  const replayCount = replayInput ? replayCountValue(replayInput) : (!existing ? nextReplayCountForTitle(el.fields.title.value.trim(), id) : 0);
  const platinum = el.fields.platinum.checked;
  const effectiveCompletedAt = completedAt || (platinum ? todayDate() : "");
  const playing = el.fields.playing.checked && !effectiveCompletedAt;
  const section = playing || replayCount ? "backlog" : el.fields.section.value;
  const startedAt = el.fields.startedAt.value || (playing && !existing?.playing && !existing?.startedAt ? todayDate() : "");
  const trailerUrl = el.fields.trailerUrl.value.trim();
  const trailerUrlRemoved = !trailerUrl && Boolean(existing?.trailerUrl || existing?.trailerUrlRemoved);
  const editedAt = new Date().toISOString();
  const game = {
    ...(existing || blankGame()),
    id,
    title: el.fields.title.value.trim(),
    platform: canonicalPlatform(el.fields.platform.value),
    section,
    releaseDate: el.fields.releaseDate.value,
    releaseText: el.fields.releaseText.value.trim(),
    lengthHours: el.fields.length.value ? Number(el.fields.length.value) : null,
    startedAt,
    completedAt: effectiveCompletedAt,
    preorderStore: el.fields.preorderStore.value.trim(),
    preferredStore: el.fields.preferredStore.value.trim(),
    owners: ownerInputValues(el.fields.owners.value),
    statuses: listFrom(el.fields.statuses.value).map(canonicalStatus).filter(Boolean),
    digital: el.fields.digital.checked,
    emulator: Boolean(el.fields.emulator?.checked),
    coop: el.fields.coop.checked,
    stream: Boolean(el.fields.stream?.checked),
    platinum,
    playing,
    replayCount,
    genres: listFrom(el.fields.genres.value),
    developer: el.fields.developer.value.trim(),
    publisher: el.fields.publisher.value.trim(),
    description: el.fields.description.value.trim() || state.pendingDescription || existing?.description || "",
    igdbUrl: el.fields.igdbUrl.value.trim(),
    trailerUrl,
    trailerUrlRemoved,
    steamAppId: cleanSteamAppId(el.fields.steamAppId.value) || steamAppIdFromUrl(el.fields.steamUrl.value),
    storeLinks: {
      playstation: el.fields.playstationUrl.value.trim(),
      nintendo: el.fields.nintendoUrl.value.trim(),
      steam: el.fields.steamUrl.value.trim(),
    },
    cover: el.fields.cover.value.trim(),
    notes: el.fields.notes.value.trim(),
    order: existing?.section === section ? existing.order : nextOrder(section),
    editedAt,
    updatedAt: editedAt,
  };
  if (game.section === "backlog") game.prices = [];
  await normalizeGameBeforeSave(game);
  upsertGame(game);
  el.fields.id.value = game.id;
  el.fields.section.value = game.section;
  syncDialogPriceVisibility();
  return game;
}

function syncDialogPriceVisibility() {
  const draft = {
    section: el.fields.section.value,
    platform: el.fields.platform.value,
    digital: el.fields.digital.checked,
  };
  el.pricesButton.hidden = draft.section === "backlog" || !priceProvidersForGame(draft).length;
}

function syncReplaySection() {
  if (!replayCountValue(el.fields.replayCount.value)) return;
  el.fields.section.value = "backlog";
  syncDialogPriceVisibility();
}

function upsertGame(game) {
  game = normalizeGameRecord(game);
  const index = state.games.findIndex((item) => item.id === game.id);
  if (index >= 0) state.games[index] = game;
  else state.games.push(game);
  persistLocal();
  persistCloud();
}

function markGameEdited(game, timestamp = new Date().toISOString()) {
  game.editedAt = timestamp;
  game.updatedAt = timestamp;
  return game;
}

function moveToBacklog(id) {
  const game = getGame(id);
  game.section = "backlog";
  game.preorderStore = "";
  game.prices = [];
  game.order = nextOrder("backlog");
  markGameEdited(game);
  upsertGame(game);
}

function returnPlayingToBacklog(id) {
  const game = getGame(id);
  if (!game?.playing) return;
  game.playing = false;
  moveToBacklog(id);
}

function startPlaying(id) {
  const game = getGame(id);
  if (!game || game.completedAt) return;
  game.section = "backlog";
  game.playing = true;
  game.startedAt = game.startedAt || todayDate();
  markGameEdited(game);
  upsertGame(game);
}

function completeGame(id) {
  const game = getGame(id);
  if (!game?.playing) return;
  game.startedAt = game.startedAt || todayDate();
  game.completedAt = todayDate();
  game.playing = false;
  markGameEdited(game);
  upsertGame(game);
}

function completeGameWithTrophy(id) {
  const game = getGame(id);
  if (!game?.playing) return;
  game.startedAt = game.startedAt || todayDate();
  game.completedAt = game.completedAt || todayDate();
  game.playing = false;
  game.platinum = true;
  markGameEdited(game);
  upsertGame(game);
}

function restoreCompletedToBacklog(id) {
  const game = getGame(id);
  if (!game) return;
  game.completedAt = "";
  game.platinum = false;
  game.section = "backlog";
  game.prices = [];
  game.order = nextOrder("backlog");
  markGameEdited(game);
  upsertGame(game);
}

function deleteCurrentGame() {
  if (state.editingId) deleteGame(state.editingId);
  el.dialog.close();
}

function deleteGame(id) {
  const game = getGame(id);
  const deletedAt = new Date().toISOString();
  game.deletedAt = deletedAt;
  markGameEdited(game, deletedAt);
  upsertGame(game);
}

function getGame(id) {
  return state.games.find((game) => game.id === id);
}

function nextOrder(section) {
  return Math.max(-1, ...state.games.filter((game) => game.section === section).map((game) => game.order ?? 0)) + 1;
}

function setupDrag(list) {
  list.querySelectorAll(".game-card").forEach((card) => {
    card.addEventListener("dragstart", () => {
      state.draggingId = card.dataset.id;
      card.classList.add("dragging");
    });
    card.addEventListener("dragend", () => {
      card.classList.remove("dragging");
      saveBacklogOrder(list);
      state.draggingId = "";
    });
    card.addEventListener("dragover", (event) => {
      event.preventDefault();
      const dragging = list.querySelector(".dragging");
      const after = getDragAfterElement(list, event.clientY);
      if (!dragging) return;
      if (after == null) list.appendChild(dragging);
      else list.insertBefore(dragging, after);
    });
  });
}

function getDragAfterElement(container, y) {
  const cards = [...container.querySelectorAll(".game-card:not(.dragging)")];
  return cards.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) return { offset, element: child };
    return closest;
  }, { offset: Number.NEGATIVE_INFINITY, element: null }).element;
}

function saveBacklogOrder(list) {
  const editedAt = new Date().toISOString();
  let changed = false;
  [...list.querySelectorAll(".game-card")].forEach((card, index) => {
    const game = getGame(card.dataset.id);
    if (!game || game.order === index) return;
    game.order = index;
    markGameEdited(game, editedAt);
    changed = true;
  });
  if (!changed) return;
  persistLocal();
  persistCloud();
}

async function toggleEditMode() {
  if (state.canEdit) {
    state.canEdit = false;
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(`${SESSION_KEY}:password`);
    render();
    return;
  }
  await ensureEditMode();
}

async function ensureEditMode() {
  if (state.canEdit) return true;
  let showError = false;
  while (!state.canEdit) {
    const password = await requestEditorPassword({ error: showError });
    if (!password) return false;
    const ok = await verifyPassword(password);
    if (!ok) {
      showError = true;
      continue;
    }
    state.canEdit = true;
    sessionStorage.setItem(SESSION_KEY, "true");
    sessionStorage.setItem(`${SESSION_KEY}:password`, password);
    render();
    return true;
  }
  return false;
}

function requestEditorPassword(options = {}) {
  if (!el.authDialog || !el.authForm || !el.authPasswordInput) return Promise.resolve("");
  el.authPasswordInput.value = "";
  if (el.authError) el.authError.hidden = !options.error;
  return new Promise((resolve) => {
    const cleanup = () => {
      el.authForm.removeEventListener("submit", handleSubmit);
      el.authDialog.removeEventListener("close", handleClose);
    };
    const handleSubmit = (event) => {
      event.preventDefault();
      const password = el.authPasswordInput.value;
      cleanup();
      el.authDialog.close("submit");
      resolve(password);
    };
    const handleClose = () => {
      cleanup();
      resolve("");
    };
    el.authForm.addEventListener("submit", handleSubmit);
    el.authDialog.addEventListener("close", handleClose, { once: true });
    el.authDialog.showModal();
    syncScrollLock();
    requestAnimationFrame(() => el.authPasswordInput.focus());
  });
}

async function verifyPassword(password) {
  try {
    const response = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (response.ok) return true;
  } catch {
    // Local static preview cannot authenticate without the API server.
  }
  return false;
}

async function lookupGame() {
  const query = el.lookupInput.value.trim() || el.fields.title.value.trim();
  if (!query) return;
  el.lookupResults.classList.remove("loaded");
  el.lookupResults.innerHTML = `<div class="empty">Searching...</div>`;
  el.lookupResults.classList.add("loaded");
  try {
    const results = await fetchSearchResults(query);
    renderLookupResults(results);
  } catch {
    renderLookupResults([]);
  }
}

function renderLookupResults(results) {
  el.lookupResults.classList.remove("loaded");
  if (!results.length) {
    el.lookupResults.innerHTML = `<div class="empty">No API results yet. You can still fill the game manually.</div>`;
    requestAnimationFrame(() => el.lookupResults.classList.add("loaded"));
    return;
  }
  el.lookupResults.innerHTML = "";
  results.slice(0, 10).forEach((result) => {
    const row = document.createElement("div");
    row.className = "lookup-result";
    row.innerHTML = `
      <img src="${escapeHtml(result.cover ? coverDisplayUrl(result.cover) : "")}" alt="" loading="lazy" decoding="async" ${result.cover ? "" : "hidden"}>
      <div>
        <strong>${escapeHtml(result.title)}</strong>
        <p>${escapeHtml([result.releaseDate || result.releaseText, result.lengthHours ? `${result.lengthHours} hrs` : ""].filter(Boolean).join(" · "))}</p>
        <p>${escapeHtml([...(result.genres || []), result.developer, result.publisher].filter(Boolean).join(" · "))}</p>
        <p>${escapeHtml(previewDescription(result.description || ""))}</p>
      </div>
      <button class="ghost-button" type="button">Use</button>
    `;
    row.querySelector("button").addEventListener("click", () => applyLookup(result));
    el.lookupResults.appendChild(row);
  });
  requestAnimationFrame(() => el.lookupResults.classList.add("loaded"));
}

function applyLookup(result) {
  el.fields.title.value = result.title || el.fields.title.value;
  el.fields.releaseDate.value = result.releaseDate || el.fields.releaseDate.value;
  el.fields.releaseText.value = result.releaseDate ? "" : (result.releaseText || el.fields.releaseText.value);
  el.fields.length.value = result.lengthHours || el.fields.length.value;
  el.fields.cover.value = result.cover || el.fields.cover.value;
  el.fields.description.value = result.description || el.fields.description.value;
  el.fields.igdbUrl.value = result.igdbUrl || el.fields.igdbUrl.value;
  el.fields.trailerUrl.value = result.trailerUrl || el.fields.trailerUrl.value;
  const links = normalizeStoreLinks(result.storeLinks);
  el.fields.playstationUrl.value = links.playstation || el.fields.playstationUrl.value;
  el.fields.nintendoUrl.value = links.nintendo || el.fields.nintendoUrl.value;
  el.fields.steamUrl.value = links.steam || el.fields.steamUrl.value;
  el.fields.steamAppId.value = steamAppIdFromUrl(el.fields.steamUrl.value) || el.fields.steamAppId.value;
  const current = state.games.find((game) => game.id === el.fields.id.value);
  if (current && !current.description && result.description) current.description = result.description;
  if (!current) state.pendingDescription = result.description || "";
  if (result.genres?.length) el.fields.genres.value = result.genres.join(", ");
  if (result.developer) el.fields.developer.value = result.developer;
  if (result.publisher) el.fields.publisher.value = result.publisher;
  if (result.platform && !el.fields.platform.value) el.fields.platform.value = result.platform;
  if (!el.fields.id.value && !el.fields.replayCount.value) {
    const replayCount = nextReplayCountForTitle(el.fields.title.value);
    if (replayCount) {
      el.fields.replayCount.value = replayCount;
      syncReplaySection();
    }
  }
}

function queueTitleLookup() {
  clearTimeout(titleLookupTimer);
  const query = el.lookupInput.value.trim();
  if (query.length < 3) return;
  titleLookupTimer = setTimeout(async () => {
    await lookupGame();
  }, 450);
}

async function normalizeGameBeforeSave(game) {
  try {
    const result = await lookupFirstResult(game.igdbUrl || game.title);
    if (!result) return;
    if (!game.releaseDate && !game.releaseText) {
      game.releaseDate = result.releaseDate || "";
      game.releaseText = result.releaseDate ? "" : (result.releaseText || "");
    }
    game.cover = game.cover || result.cover || "";
    game.description = game.description || result.description || "";
    game.igdbUrl = game.igdbUrl || result.igdbUrl || "";
    if (!game.trailerUrlRemoved) game.trailerUrl = game.trailerUrl || result.trailerUrl || "";
    mergeStoreLinks(game, result.storeLinks);
    game.lengthHours = game.lengthHours || result.lengthHours || null;
    if (!game.genres?.length || game.genres.some((genre) => genre.toLowerCase().includes("video game"))) {
      game.genres = result.genres || game.genres || [];
    }
    game.developer = game.developer || result.developer || "";
    game.publisher = game.publisher || result.publisher || "";
  } catch {
    // Manual entries still save when lookup is unavailable.
  }
}

async function refreshUnreleasedGamesOnOpen() {
  const games = state.games.filter((game) => !game.deletedAt && !game.completedAt && (
    shouldRefreshRelease(game)
    || shouldMoveReleasedToAvailable(game)
    || shouldMoveUnreleasedToUpcoming(game)
  ));
  if (!games.length) return;
  let changed = false;
  for (const game of games.slice(0, 25)) {
    try {
      let localChanged = false;
      if (shouldMoveReleasedToAvailable(game)) {
        game.section = "wanted";
        game.prices = game.prices || [];
        localChanged = true;
      }
      if (shouldMoveUnreleasedToUpcoming(game)) {
        game.section = "upcoming";
        localChanged = true;
      }
      if (!shouldRefreshRelease(game)) {
        if (localChanged) {
          game.updatedAt = new Date().toISOString();
          changed = true;
        }
        continue;
      }
      const result = await lookupFirstResult(game.igdbUrl || game.title);
      if (!result) continue;
      if (!game.releaseDate && result.releaseDate) {
        game.releaseDate = result.releaseDate;
        game.releaseText = "";
        localChanged = true;
      } else if (!game.releaseDate && result.releaseText && result.releaseText !== game.releaseText) {
        game.releaseText = result.releaseText;
        localChanged = true;
      }
      localChanged = applyFetchedGameData(game, result) || localChanged;
      if (shouldMoveReleasedToAvailable(game)) {
        game.section = "wanted";
        game.prices = game.prices || [];
        localChanged = true;
      }
      if (shouldMoveUnreleasedToUpcoming(game)) {
        game.section = "upcoming";
        localChanged = true;
      }
      if (localChanged) {
        game.updatedAt = new Date().toISOString();
        changed = true;
      }
    } catch {
      return;
    }
  }
  if (changed) {
    persistLocal();
    persistCloud();
  }
}

function shouldMoveReleasedToAvailable(game) {
  if (game.section !== "upcoming" || game.preorderStore) return false;
  if (!game.releaseDate) return false;
  const releaseTime = new Date(`${game.releaseDate}T00:00:00`).getTime();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Number.isFinite(releaseTime) && releaseTime <= today.getTime();
}

function shouldMoveUnreleasedToUpcoming(game) {
  if (game.section !== "wanted" || game.preorderStore) return false;
  if (!game.releaseDate) return false;
  const releaseTime = new Date(`${game.releaseDate}T00:00:00`).getTime();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Number.isFinite(releaseTime) && releaseTime > today.getTime();
}

async function refreshMissingDescriptionsOnOpen() {
  const games = activeGames().filter((game) => !game.description && game.title).slice(0, 20);
  if (!games.length) return;
  let changed = false;
  for (const game of games) {
    try {
      const result = await lookupFirstResult(game.igdbUrl || game.title);
      if (!result?.description) continue;
      changed = applyFetchedGameData(game, result) || changed;
    } catch {
      return;
    }
  }
  if (changed) {
    persistLocal();
    persistCloud();
  }
}

async function refreshAllGameData() {
  if (!state.canEdit) return;
  if (!el.fetchDataButton) return;
  const games = state.games.filter((game) => !game.deletedAt && game.title);
  if (!games.length) {
    alert("No games to refresh.");
    return;
  }

  const originalText = el.fetchDataButton.textContent;
  el.fetchDataButton.disabled = true;
  let updated = 0;
  let failed = 0;

  for (const [index, game] of games.entries()) {
    el.fetchDataButton.textContent = `Data ${index + 1}/${games.length}`;
    try {
      const result = await lookupFirstResult(game.igdbUrl || game.title);
      if (result && applyFetchedGameData(game, result, { refreshTextAndTags: true })) updated += 1;
    } catch {
      failed += 1;
    }
  }

  if (updated) {
    persistLocal();
    persistCloud();
  } else {
    render();
  }
  el.fetchDataButton.disabled = false;
  el.fetchDataButton.textContent = originalText;
  alert(`Updated data for ${updated} games${failed ? `, ${failed} failed` : ""}.`);
}

function applyFetchedGameData(game, result, options = {}) {
  let changed = false;
  const refreshTextAndTags = Boolean(options.refreshTextAndTags);
  const setIfEmpty = (key, value) => {
    if (!game[key] && value) {
      game[key] = value;
      changed = true;
    }
  };
  setIfEmpty("cover", result.cover);
  setIfEmpty("lengthHours", result.lengthHours);
  setIfEmpty("developer", result.developer);
  setIfEmpty("publisher", result.publisher);
  setIfEmpty("igdbUrl", result.igdbUrl);
  if (!game.trailerUrlRemoved) setIfEmpty("trailerUrl", result.trailerUrl);
  changed = mergeStoreLinks(game, result.storeLinks) || changed;
  if (refreshTextAndTags && result.description) {
    const nextDescription = shortDescription(result.description);
    if (nextDescription && game.description !== nextDescription) {
      game.description = nextDescription;
      changed = true;
    }
  } else {
    setIfEmpty("description", result.description);
  }
  if (!game.releaseDate && !game.releaseText) {
    game.releaseDate = result.releaseDate || "";
    game.releaseText = result.releaseDate ? "" : (result.releaseText || "");
    if (game.releaseDate || game.releaseText) changed = true;
  }
  if (result.genres?.length && (refreshTextAndTags || !game.genres || !game.genres.length)) {
    const nextGenres = [...new Set(result.genres.map((genre) => String(genre || "").trim()).filter(Boolean))];
    if (nextGenres.join("|") !== (game.genres || []).join("|")) {
      game.genres = nextGenres;
      changed = true;
    }
  }
  if (refreshTextAndTags && result.developer && game.developer !== result.developer) {
    game.developer = result.developer;
    changed = true;
  }
  if (refreshTextAndTags && result.publisher && game.publisher !== result.publisher) {
    game.publisher = result.publisher;
    changed = true;
  }
  if (changed) game.updatedAt = new Date().toISOString();
  return changed;
}

function mergeStoreLinks(game, links) {
  const current = normalizeStoreLinks(game.storeLinks);
  const next = normalizeStoreLinks(links);
  let changed = false;
  for (const key of Object.keys(current)) {
    if (!current[key] && next[key]) {
      current[key] = next[key];
      changed = true;
    }
  }
  game.storeLinks = current;
  return changed;
}

function shouldRefreshRelease(game) {
  if (game.section !== "upcoming") return false;
  if (!game.releaseDate) return true;
  return new Date(`${game.releaseDate}T00:00:00`) > new Date();
}

async function lookupFirstResult(title) {
  const results = await fetchSearchResults(title);
  return results[0] || null;
}

async function fetchSearchResults(query) {
  const normalized = String(query || "").trim();
  if (!normalized) return [];
  const cacheKey = normalized.toLocaleLowerCase();
  const now = Date.now();
  const cached = searchCache.get(cacheKey);
  if (cached && (now - cached.timestamp) < SEARCH_CACHE_TTL) return cached.results;
  if (searchInflight.has(cacheKey)) return searchInflight.get(cacheKey);
  const request = fetch(`/api/search?q=${encodeURIComponent(normalized)}`)
    .then(async (response) => {
      if (!response.ok) return [];
      const data = await response.json();
      const results = Array.isArray(data.results) ? data.results : [];
      searchCache.set(cacheKey, { results, timestamp: Date.now() });
      return results;
    })
    .finally(() => {
      searchInflight.delete(cacheKey);
    });
  searchInflight.set(cacheKey, request);
  return request;
}

function shouldFetchPricesForGame(game) {
  return Boolean(game?.title && game.section !== "backlog" && !game.completedAt && !game.platinum && priceProvidersForGame(game).length);
}

async function refreshCurrentPrices() {
  const title = el.fields.title.value.trim();
  if (!title) return;
  const savedGame = await saveCurrentFormGame();
  if (!shouldFetchPricesForGame(savedGame)) return;
  el.pricesButton.textContent = "Refreshing...";
  try {
    const data = await fetchPrices(savedGame.title, savedGame.platform, savedGame.digital);
    const game = getGame(savedGame.id);
    if (game) {
      game.prices = mergeFetchedPrices(game, data.prices);
      upsertGame(game);
    }
    alert(`Found ${game?.prices?.length || data.prices?.length || 0} price links.`);
  } catch {
    alert("Price refresh will work once the Cloudflare function is hosted.");
  } finally {
    el.pricesButton.textContent = "Refresh Prices";
  }
}

async function refreshPricesForGame(id, options = {}) {
  const silent = Boolean(options.silent);
  const game = getGame(id);
  if (!game) return;
  persistLocal();
  if (state.canEdit) await persistCloud();
  if (game.section === "backlog" || game.completedAt || game.platinum) {
    game.prices = [];
    upsertGame(game);
    return;
  }
  if (!priceProvidersForGame(game).length) {
    game.prices = [];
    upsertGame(game);
    return;
  }
  game.prices = priceProvidersForGame(game).map((store) => ({
    ...fallbackPriceLinks(game).find((item) => item.store === store),
    checkedAt: "",
  }));
  persistLocal();
  try {
    const data = await fetchPrices(game.title, game.platform, game.digital);
    game.prices = mergeFetchedPrices(game, data.prices);
    game.updatedAt = new Date().toISOString();
    upsertGame(game);
  } catch {
    if (!silent) alert("Price refresh needs the Cloudflare function or the local fetch script.");
  }
}

async function refreshAllPrices() {
  if (!state.canEdit) return;
  const games = activeGames().filter((game) => game.section !== "backlog" && game.title && priceProvidersForGame(game).length);
  if (!games.length) {
    alert("No Available now or To Release games to refresh.");
    return;
  }

  el.fetchPricesButton.disabled = true;
  let updated = 0;
  let failed = 0;

  for (const [index, game] of games.entries()) {
    el.fetchPricesButton.innerHTML = `${currencyIcon()}<span class="button-label">Prices ${index + 1}/${games.length}</span>`;
    el.fetchPricesButton.title = `Prices ${index + 1}/${games.length}`;
    el.fetchPricesButton.setAttribute("aria-label", el.fetchPricesButton.title);
    game.prices = priceProvidersForGame(game).map((store) => ({
      ...fallbackPriceLinks(game).find((item) => item.store === store),
      checkedAt: "",
    }));
    try {
      const data = await fetchPrices(game.title, game.platform, game.digital);
      game.prices = mergeFetchedPrices(game, data.prices);
      game.updatedAt = new Date().toISOString();
      updated += 1;
    } catch {
      failed += 1;
    }
  }

  persistLocal();
  persistCloud();
  el.fetchPricesButton.disabled = false;
  el.fetchPricesButton.innerHTML = `${currencyIcon()}<span class="button-label">Fetch New Prices</span>`;
  el.fetchPricesButton.title = "Fetch New Prices";
  el.fetchPricesButton.setAttribute("aria-label", "Fetch New Prices");
  alert(`Updated prices for ${updated} games${failed ? `, ${failed} failed` : ""}.`);
}

function mergeFetchedPrices(game, fetchedPrices = []) {
  const fetchedByStore = new Map((Array.isArray(fetchedPrices) ? fetchedPrices : []).map((price) => [price.store, price]));
  return priceProvidersForGame(game).map((store) => {
    const fallback = fallbackPriceLinks(game).find((price) => price.store === store) || { store, url: "" };
    return {
      ...fallback,
      ...(fetchedByStore.get(store) || {}),
      store,
    };
  });
}

async function fetchPrices(title, platform, digital = false) {
  const params = new URLSearchParams({ title, platform });
  if (digital || ["Xbox PC", "Xbox Series", "X360", "XOne"].includes(canonicalPlatform(platform))) params.set("digital", "1");
  params.set("currency", state.settings.currency);
  params.set("region", state.settings.region);
  params.set("stores", state.settings.stores.join(","));
  const response = await fetch(`/api/prices?${params}`);
  if (!response.ok) throw new Error("Price fetch failed");
  return response.json();
}

async function handleCoverUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  el.fields.cover.value = await compressImage(file);
}

function compressImage(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const maxWidth = 720;
      const maxHeight = 960;
      const scale = Math.min(1, maxWidth / image.width);
      const heightScale = Math.min(1, maxHeight / image.height);
      const finalScale = Math.min(scale, heightScale);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(image.width * finalScale);
      canvas.height = Math.round(image.height * finalScale);
      const context = canvas.getContext("2d");
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/webp", 0.72));
    };
    image.onerror = reject;
    image.src = URL.createObjectURL(file);
  });
}

async function syncNow() {
  await pullCloudData();
  if (state.canEdit) await persistCloud();
  render();
}

function listFrom(value) {
  return unique(value.split(",").map((item) => item.trim()).filter(Boolean));
}

function cleanPsnUser(value) {
  return String(value || "").trim().replace(/[^A-Za-z0-9_-]/g, "").slice(0, 32);
}

function cleanMicrosoftUser(value) {
  const text = String(value || "").trim().replace(/[<>]/g, "").slice(0, 128);
  if (!/^https?:\/\//i.test(text)) return text;
  try {
    const parts = new URL(text).pathname.split("/").filter(Boolean);
    const userIndex = parts.findIndex((part) => part.toLowerCase() === "user");
    return decodeURIComponent(userIndex >= 0 ? parts[userIndex + 1] || "" : parts.at(-1) || "").slice(0, 64);
  } catch {
    return "";
  }
}

function cleanSteamUser(value) {
  return String(value || "").trim().replace(/[<>]/g, "").slice(0, 96);
}

function cleanOwnerLabel(value) {
  return String(value || "").trim().replace(/[<>]/g, "").slice(0, 32);
}

function normalizeTag(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function unique(values) {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }[char]));
}
