import { normalizeSearchText, createGameCardShell, bindActivityCardParallax, mountActivitySlider, mountReleaseCalendar, finishedGameMarkup, achievementCardMarkup, achievementDashboardMarkup, achievementPanelMarkup, completedCardMarkup, horizontalCarouselState, syncViewModeButton, slideHorizontalCarousel, comparePlayingGames, finishedDurationText, timeBadgeMarkup, guideLinksMarkup, storeButtonsMarkup, activityTrailerUrl, activityTrailerFrameMarkup, preloadPausedActivityTrailers, activityReleaseStatus, activityCoverOverride, activityAllowsPsnCardTrophies, formatFooterDate, formatFooterDateTime, confirmGameDelete } from "./activity-ui.js";
import { applySiteTheme, normalizeThemeSettings, openThemeEditor, ownerCardColorClass, ownerColorClass, themeSettingsButton } from "./theme-system.js";
import { applyDocumentTranslations, languageOptions, normalizeLanguage, t } from "./i18n.js";

mountActivitySlider(document.querySelector("#playingSection"), { count: "playingCount", previous: "playingPrevButton", next: "playingNextButton", list: "playingList", dataSection: "playing", finished: "playingFinished", finishedList: "playingFinishedList" });

const STORAGE_KEY = "gamelist:v1";
const LEGACY_STORAGE_KEY = "buylist-tracker:v6";
const SESSION_KEY = "gamelist-editor";
const VIEW_MODE_KEY = "gamelist:view-mode";
const PLATINUM_VIEW_MODE_KEY = "gamelist:platinum-view-mode";
const PLATINUM_META_CACHE_KEY = "gamelist:platinum-meta:v1";
const PLATINUM_COVER_CACHE_KEY = "gamelist:platinum-covers:v1";
const SETTINGS_KEY = "gamelist:settings:v1";
const ACHIEVEMENT_CACHE_KEY = "gamelist:achievement-cache:v1";
const KASH_TWITCH_URL = "https://www.twitch.tv/kashhoward";
const DEFAULT_PAGE_ORDER = ["trophies", "calendar", "highlights", "search", "gamelist", "finished"];
const LAYOUT_SECTION_KEYS = ["playing", ...DEFAULT_PAGE_ORDER, "latestFinished"];
const VERSION_STORAGE_KEY = "gamelist:site-version";
const CACHE_HOUR_STORAGE_KEY = "gamelist:cache-hour";
const PULL_NAVIGATION_KEY = "gamelist:pull-navigation";
const STORE_OPTIONS = ["Amazon", "eBay", "GAME.es", "Xtralife", "Retro Island NY", "GameStop", "Walmart"];
const MAX_PRICE_STORES = 5;
const GAME_OF_YEAR_CATEGORIES = [
  ["fun", "MOST FUN"],
  ["singleplayer", "FAVORITE SINGLEPLAYER"],
  ["multiplayer", "FAVORITE MULTIPLAYER"],
  ["soundtrack", "FAVORITE SOUNDTRACK"],
  ["indie", "FAVORITE INDIE"],
  ["surprise", "BIGGEST SURPRISE"],
  ["disappointment", "BIGGEST DISAPPOINTMENT"],
];
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
const siteVersion = { version: "", updatedAt: "" };
const DEFAULT_SETTINGS = {
  pageOrder: DEFAULT_PAGE_ORDER,
  hiddenSections: [],
  theme: "shabii",
  customTheme: {},
  defaultOrder: "custom",
  psnUser: "ShabiiEXE",
  microsoftUser: "",
  steamUser: "",
  currency: "EUR",
  region: "ES",
  stores: ["Amazon", "Xtralife", "GAME.es", "Retro Island NY"],
  storeSettingsVersion: 2,
  defaultOwner: "Xavi",
  shelfSync: true,
  forceCacheOnLoad: false,
  gotyAlwaysShow: false,
  gameOfTheYear: {},
  weekStart: "monday",
  language: "en",
};
const WEEK_START_OPTIONS = [
  ["monday", "Monday"],
  ["tuesday", "Tuesday"],
  ["wednesday", "Wednesday"],
  ["thursday", "Thursday"],
  ["friday", "Friday"],
  ["saturday", "Saturday"],
  ["sunday", "Sunday"],
];
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
  mandagon: "https://cdn2.steamgriddb.com/grid/a0ac3f221e625a1f87857b7d19c4c7d5.png",
};
const MANUAL_PLATINUM_COVER_OVERRIDES = [
  { exact: ["Cartoon Network PTE: XL"], match: [], cover: "https://m.media-amazon.com/images/I/81gYqhi47AL.jpg" },
  { exact: ["DBZ Budokai HD Collection"], match: [], cover: "https://m.media-amazon.com/images/I/81fZrgq67NL._AC_UF1000,1000_QL80_.jpg" },
  { exact: ["Ultimate MK3"], match: [], cover: "https://upload.wikimedia.org/wikipedia/en/f/f9/Ultimate_MK3.png" },
  { exact: ["Turtles in Time RS"], match: [], cover: "https://upload.wikimedia.org/wikipedia/en/c/c7/TMNTreshelled_cover.png" },
  { exact: ["TMNT 1989 Arcade"], match: [], cover: "https://media.vandal.net/m/6852/teenage-mutant-ninja-turtles-1989-arcade-xbla-2016109124838_1.jpg" },
  { exact: ["Sonic's UGC"], match: [], cover: "https://upload.wikimedia.org/wikipedia/en/0/02/Sonic_Ultimate_Genesis_Collection.jpg" },
  { exact: ["tmnt"], match: [], cover: "https://static.fnac-static.com/multimedia/ES/images_produits/ES/Grandes150/8/2/8/3307210253828/tsp20090724110531/Teenage-Mutant-Ninja-Turtles-Xbox-360.gif" },
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
let platformLogoOverlay = null;
let playingTrailerFrame = 0;
const searchCache = new Map();
const searchInflight = new Map();
const platinumMetaCache = loadPlatinumMetaCache();
const initialSettings = loadLocalSettings();

const state = {
  games: [],
  psnActivity: { achievements: [], games: [], platinums: [], sourceUrl: "" },
  steamActivity: { achievements: [], games: [], completed: [], totalEarned: 0, sourceUrl: "" },
  xboxActivity: { achievements: [], games: [], completed: [], totalEarned: 0, sourceUrl: "" },
  steamOwnedAppIds: null,
  cardTrophies: {},
  platinumCoverCache: loadPlatinumCoverCache(),
  settings: initialSettings,
  filters: { query: "", platform: "all", tag: "all", sort: mainSortForDefault(initialSettings.defaultOrder), direction: "asc", preordered: false },
  sortTouched: false,
  viewMode: localStorage.getItem(VIEW_MODE_KEY) === "list" ? "list" : "grid",
  editingId: "",
  finishSetupId: "",
  pendingDescription: "",
  canEdit: sessionStorage.getItem(SESSION_KEY) === "true",
  draggingId: "",
  mobileSection: "backlog",
  mobileSwipeStart: null,
  completedYear: "all",
  completedVisiblePages: 1,
  gotyYear: String(new Date().getFullYear()),
  gotyPickerOrder: gotyOrderForDefault(initialSettings.defaultOrder),
  gotyPromptShown: false,
  historyYear: String(new Date().getFullYear()),
  platinumYear: "all",
  platinumPlatform: "all",
  platinumSort: listSortForDefault(initialSettings.defaultOrder),
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
  playingCurrent: document.querySelector("#playingSection .playing-current"),
  playingCount: document.querySelector("#playingCount"),
  playingList: document.querySelector(".playing-list"),
  playingFinished: document.querySelector("#playingFinished"),
  playingFinishedList: document.querySelector(".playing-finished-list"),
  playingPrevButton: document.querySelector("#playingPrevButton"),
  playingNextButton: document.querySelector("#playingNextButton"),
  gotySection: document.querySelector("#gotySection"),
  gotyTitle: document.querySelector("#gotyTitle"),
  gotyYearSelect: document.querySelector("#gotyYearSelect"),
  gotyYearCount: document.querySelector("#gotyYearCount"),
  gotySaveButton: document.querySelector("#gotySaveButton"),
  gotyStatsButton: document.querySelector("#gotyStatsButton"),
  gotyEditButton: document.querySelector("#gotyEditButton"),
  gotyResetButton: document.querySelector("#gotyResetButton"),
  gotyGrid: document.querySelector("#gotyGrid"),
  achievementSection: document.querySelector("#achievementSection"),
  calendarSection: document.querySelector(".calendar-section"),
  highlightsSection: document.querySelector(".highlights-section"),
  achievementPanel: document.querySelector("#achievementPanel"),
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
  completedStatsButton: document.querySelector("#completedStatsButton"),
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
  gotyDialog: document.querySelector("#gotyDialog"),
  gotyForm: document.querySelector("#gotyForm"),
  gotyDialogTitle: document.querySelector("#gotyDialogTitle"),
  gotyCloseButton: document.querySelector("#gotyCloseButton"),
  gotyPickerOrder: document.querySelector("#gotyPickerOrder"),
  gotyPickerGrid: document.querySelector("#gotyPickerGrid"),
  platinumDialog: document.querySelector("#platinumDialog"),
  finishedStatsDialog: document.querySelector("#finishedStatsDialog"),
  finishedStatsCloseButton: document.querySelector("#finishedStatsCloseButton"),
  finishedStatsTitle: document.querySelector("#finishedStatsTitle"),
  finishedStatsBody: document.querySelector("#finishedStatsBody"),
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
  settingsLanguage: document.querySelector("#settingsLanguage"),
  settingsStores: document.querySelector("#settingsStores"),
  settingsDefaultOwner: document.querySelector("#settingsDefaultOwner"),
  settingsDevFeatures: document.querySelector("#settingsDevFeatures"),
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
  logPageVersion();
  await window.__initialThemeReady?.catch(() => "shabii");
  registerServiceWorker();
  syncDisplayMode();
  if (!state.canEdit) state.canEdit = await hasSharedEditorSession();
  document.body.classList.toggle("can-edit", state.canEdit);
  bindEvents();
  if (window.self === window.top) initPagePullTransition({ targetLabel: "Shelf", targetUrl: "shelf" });
  warmUiIcons();
  bindTextureParallax();
  await loadData();
  render();
  const cloudChanged = await pullCloudData();
  if (cloudChanged) render();
  const requestedGame = new URLSearchParams(location.search).get("game");
  if (requestedGame && state.games.some((game) => game.id === requestedGame && !game.deletedAt)) openDetail(requestedGame);
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
    const fromPullNavigation = consumeRecentPullNavigation();
    await clearSiteCachesForNewHour();
    const response = await fetch(`/version.json?t=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) return false;
    const remote = await response.json();
    applySiteVersion(remote);
    const remoteVersion = siteVersion.version;
    if (!remoteVersion) return false;
    const current = localStorage.getItem(VERSION_STORAGE_KEY);
    if (!current) {
      localStorage.setItem(VERSION_STORAGE_KEY, remoteVersion);
      return false;
    }
    if (current === remoteVersion) {
      localStorage.setItem(VERSION_STORAGE_KEY, remoteVersion);
      return false;
    }
    if (!forceCacheOnLoadEnabled()) return false;
    if (fromPullNavigation) {
      clearSiteCaches().catch(() => {});
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

async function clearSiteCachesForNewHour() {
  const currentHour = currentCacheHour();
  const previousHour = localStorage.getItem(CACHE_HOUR_STORAGE_KEY);
  if (!previousHour) {
    localStorage.setItem(CACHE_HOUR_STORAGE_KEY, currentHour);
    return;
  }
  if (previousHour === currentHour) return;
  await clearSiteCaches();
  localStorage.setItem(CACHE_HOUR_STORAGE_KEY, currentHour);
}

function currentCacheHour() {
  return new Date().toISOString().slice(0, 13);
}

function forceCacheOnLoadEnabled() {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}")?.forceCacheOnLoad === true;
  } catch {
    return false;
  }
}

function applySiteVersion(value = {}) {
  siteVersion.version = String(value.version || "").trim();
  siteVersion.updatedAt = String(value.updatedAt || "").trim();
}

function logPageVersion() {
  console.log("version", siteVersion.version || "unknown");
}

function consumeRecentPullNavigation() {
  try {
    const url = new URL(window.location.href);
    const fromPullUrl = url.searchParams.get("pull") === "1";
    if (fromPullUrl) {
      url.searchParams.delete("pull");
      url.searchParams.delete("v");
      window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
    }
    const value = JSON.parse(sessionStorage.getItem(PULL_NAVIGATION_KEY) || "{}");
    sessionStorage.removeItem(PULL_NAVIGATION_KEY);
    return fromPullUrl || Date.now() - Number(value.at || 0) < 8000;
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
  if (siteVersion.version) localStorage.setItem(VERSION_STORAGE_KEY, siteVersion.version);
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
  bindLatestFinishedHeading();
  el.detailTrophyList.addEventListener("scroll", updateDetailTrophyEdges, { passive: true });
  el.platinumCloseButton.addEventListener("click", () => el.platinumDialog.close());
  el.platinumDialog.addEventListener("click", (event) => {
    if (event.target === el.platinumDialog) el.platinumDialog.close();
  });
  el.platinumDialog.addEventListener("close", syncScrollLock);
  el.finishedStatsCloseButton?.addEventListener("click", () => el.finishedStatsDialog.close());
  el.finishedStatsDialog?.addEventListener("click", (event) => {
    if (event.target === el.finishedStatsDialog) el.finishedStatsDialog.close();
  });
  el.finishedStatsDialog?.addEventListener("close", syncScrollLock);
  window.addEventListener("scroll", () => {
    updateScrollTopButton();
    scheduleFocusedPlayingTrailerUpdate();
  }, { passive: true });
  window.addEventListener("resize", () => {
    schedulePlayingCardHeightSync();
    requestAnimationFrame(updateAllRowTitleOverflow);
    scheduleFocusedPlayingTrailerUpdate();
    requestAnimationFrame(renderMobileTabs);
  }, { passive: true });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) pauseAllPlayingTrailers();
    else {
      scheduleFocusedPlayingTrailerUpdate();
      syncSharedEditorSession();
    }
  });
  window.addEventListener("storage", (event) => {
    if (event.key === "gamelist-editor-signal") syncSharedEditorSession();
  });
  document.addEventListener("pointerover", handleSelectOverflowTitle);
  document.addEventListener("focusin", handleSelectOverflowTitle);
  document.addEventListener("pointerout", handleSelectOverflowLeave);
  document.addEventListener("focusout", handleSelectOverflowLeave);
  document.addEventListener("click", closePlatformLogoSelects);
  document.addEventListener("change", (event) => {
    if (event.target.matches?.("select")) updateSelectOverflowTitle(event.target);
  });
  window.addEventListener("scroll", hideSelectOverflowPopover, { passive: true });
  el.searchInput.addEventListener("input", (event) => {
    state.filters.query = normalizeSearchText(event.target.value);
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
    state.sortTouched = true;
    state.filters.sort = event.target.value;
    if (state.filters.sort === "added") state.filters.direction = "desc";
    state.completedVisiblePages = 1;
    render();
  });
  el.sortDirectionButton.addEventListener("click", () => {
    state.sortTouched = true;
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
  el.completedStatsButton?.addEventListener("click", () => openFinishedStatsDialog(state.completedYear || "all"));
  el.completedMoreButton?.addEventListener("click", () => {
    state.completedVisiblePages += 1;
    renderCompleted();
  });
  el.gotyYearSelect?.addEventListener("change", () => {
    state.gotyYear = el.gotyYearSelect.value || currentGameOfTheYear();
    renderGameOfTheYear();
  });
  el.gotyEditButton?.addEventListener("click", () => openGameOfTheYearDialog(currentGameOfTheYear(), { force: true }));
  el.gotySaveButton?.addEventListener("click", downloadGameOfTheYearImage);
  el.gotyStatsButton?.addEventListener("click", () => openFinishedStatsDialog(state.gotyYear || currentGameOfTheYear()));
  el.gotyResetButton?.addEventListener("click", resetGameOfTheYearFromForm);
  el.gotyPickerOrder?.addEventListener("change", () => {
    state.gotyPickerOrder = el.gotyPickerOrder.value || gotyOrderForDefault(state.settings.defaultOrder);
    const year = el.gotyForm.dataset.gotyYear || currentGameOfTheYear();
    renderGameOfTheYearPicker(sortedGameOfTheYearChoices(completedGamesForYear(year)), currentGameOfTheYearDraftPicks());
  });
  el.gotyCloseButton?.addEventListener("click", () => el.gotyDialog.close());
  el.gotyDialog?.addEventListener("click", (event) => {
    if (event.target === el.gotyDialog) el.gotyDialog.close();
  });
  el.gotyDialog?.addEventListener("close", syncScrollLock);
  el.gotyForm?.addEventListener("submit", saveGameOfTheYearFromForm);
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
  el.dialog.addEventListener("close", () => {
    state.finishSetupId = "";
    syncScrollLock();
  });
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
  el.pricesButton?.addEventListener("click", refreshCurrentPrices);
  el.coverUpload.addEventListener("change", handleCoverUpload);
  window.addEventListener("resize", syncDisplayMode, { passive: true });
  window.matchMedia("(display-mode: standalone)").addEventListener?.("change", syncDisplayMode);
}

function initPagePullTransition({ targetLabel, targetUrl }) {
  if (document.querySelector(".page-pull-switch")) return;
  const button = document.createElement("button");
  button.className = "page-pull-switch";
  button.type = "button";
  button.setAttribute("aria-label", `Switch to ${targetLabel}`);
  button.innerHTML = `<span>${escapeHtml(targetLabel)}</span>`;
  const curtain = document.createElement("div");
  curtain.className = "page-pull-curtain";
  curtain.setAttribute("aria-hidden", "true");
  curtain.innerHTML = pagePullPreviewMarkup(targetUrl);
  document.body.append(button, curtain);
  let startY = 0;
  let dragging = false;
  let moved = false;
  const setPull = (distance) => {
    const pull = Math.max(0, Math.min(window.innerHeight, distance));
    const progress = Math.min(1, pull / Math.max(180, window.innerHeight * 0.75));
    document.body.style.setProperty("--pull-distance", `${pull}px`);
    document.body.style.setProperty("--pull-handle-y", `${pull}px`);
    document.body.style.setProperty("--pull-blur", `${Math.round((1 - progress) * 10)}px`);
    document.body.style.setProperty("--pull-preview-opacity", `${0.48 + progress * 0.52}`);
    document.body.style.setProperty("--pull-preview-scale", `${0.96 + progress * 0.04}`);
    document.body.classList.toggle("page-pulling", pull > 6);
    return pull;
  };
  const switchPage = () => {
    if (document.body.classList.contains("page-switching") || document.body.classList.contains("page-switching-pending")) return;
    const frame = curtain.querySelector(".page-pull-frame");
    let committed = false;
    const commit = () => {
      if (committed) return;
      committed = true;
      document.body.classList.remove("page-switching-pending");
      document.body.classList.add("page-switching");
      document.body.classList.remove("page-pulling");
      document.body.style.setProperty("--pull-distance", `${window.innerHeight}px`);
      document.body.style.setProperty("--pull-handle-y", `${window.innerHeight}px`);
      document.body.style.setProperty("--pull-blur", "0px");
      document.body.style.setProperty("--pull-preview-opacity", "1");
      document.body.style.setProperty("--pull-preview-scale", "1");
      try {
        sessionStorage.setItem(PULL_NAVIGATION_KEY, JSON.stringify({ version: siteVersion.version, at: Date.now() }));
        if (siteVersion.version) localStorage.setItem(VERSION_STORAGE_KEY, siteVersion.version);
      } catch {}
      window.setTimeout(() => { window.location.href = pullNavigationUrl(targetUrl); }, 430);
    };
    if (frame?.dataset.loaded === "true") commit();
    else {
      document.body.classList.add("page-switching-pending");
      document.body.classList.add("page-pulling");
      frame?.addEventListener("load", commit, { once: true });
      window.setTimeout(commit, 1800);
    }
  };
  button.addEventListener("click", () => { if (!moved) switchPage(); moved = false; });
  button.addEventListener("pointerenter", () => document.body.classList.add("page-pull-hover"));
  button.addEventListener("pointerleave", () => { if (!dragging) document.body.classList.remove("page-pull-hover"); });
  button.addEventListener("pointerdown", (event) => {
    dragging = true;
    moved = false;
    startY = event.clientY;
    document.body.classList.add("page-pull-hover");
    button.classList.add("is-dragging");
    button.setPointerCapture?.(event.pointerId);
  });
  button.addEventListener("pointermove", (event) => {
    if (!dragging) return;
    const pull = setPull(event.clientY - startY);
    moved = moved || pull > 8;
  });
  const endDrag = (event) => {
    if (!dragging) return;
    dragging = false;
    button.classList.remove("is-dragging");
    document.body.classList.remove("page-pull-hover");
    button.releasePointerCapture?.(event.pointerId);
    const pull = Number.parseFloat(document.body.style.getPropertyValue("--pull-distance")) || 0;
    if (pull > window.innerHeight * 0.75) switchPage();
    else {
      document.body.classList.remove("page-pulling");
      document.body.style.setProperty("--pull-distance", "0px");
      document.body.style.setProperty("--pull-handle-y", "0px");
    }
    window.setTimeout(() => { moved = false; }, 0);
  };
  button.addEventListener("pointerup", endDrag);
  button.addEventListener("pointercancel", endDrag);
}

function pagePullPreviewMarkup(targetUrl) {
  return `<div class="page-pull-preview"><iframe class="page-pull-frame" src="${escapeHtml(targetUrl)}" tabindex="-1" aria-hidden="true" onload="this.dataset.loaded='true'"></iframe></div>`;
}

function pullNavigationUrl(targetUrl) {
  const url = new URL(targetUrl, window.location.href);
  url.searchParams.set("pull", "1");
  if (siteVersion.version) url.searchParams.set("v", siteVersion.version);
  return url.href;
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
        if (!state.sortTouched) applyDefaultOrder(nextSettings.defaultOrder);
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

function mainSortForDefault(value) {
  if (value === "name") return "title";
  return value === "time" ? "time" : "custom";
}

function listSortForDefault(value) {
  return value === "name" ? "name" : "time";
}

function gotyOrderForDefault(value) {
  if (value === "name") return "name";
  if (value === "platform") return "platform";
  return "time";
}

function applyDefaultOrder(value) {
  state.filters.sort = mainSortForDefault(value);
  state.platinumSort = listSortForDefault(value);
  state.gotyPickerOrder = gotyOrderForDefault(value);
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
  const selectedStores = Array.isArray(settings.stores)
    ? settings.stores.filter((store) => STORE_OPTIONS.includes(store))
    : DEFAULT_SETTINGS.stores;
  const stores = selectedStores;
  const hiddenSections = migratedHidden.filter((item) => LAYOUT_SECTION_KEYS.includes(item));
  const gameOfTheYear = normalizeGameOfTheYear(settings.gameOfTheYear);
  return {
    ...DEFAULT_SETTINGS,
    ...settings,
    pageOrder: [...pageOrder, ...DEFAULT_PAGE_ORDER.filter((item) => !pageOrder.includes(item))],
    hiddenSections,
    theme: THEMES[settings.theme] || settings.theme === "custom" ? settings.theme : DEFAULT_SETTINGS.theme,
    customTheme: normalizeThemeSettings(settings),
    defaultOrder: ["custom", "time", "name"].includes(settings.defaultOrder) ? settings.defaultOrder : DEFAULT_SETTINGS.defaultOrder,
    psnUser: cleanPsnUser(settings.psnUser) || DEFAULT_SETTINGS.psnUser,
    microsoftUser: cleanMicrosoftUser(settings.microsoftUser),
    steamUser: cleanSteamUser(settings.steamUser),
    currency: settings.currency === "USD" ? "USD" : "EUR",
    region: ["ES", "IT", "US", "UK"].includes(settings.region) ? settings.region : DEFAULT_SETTINGS.region,
    language: normalizeLanguage(settings.language),
    stores: stores.slice(0, MAX_PRICE_STORES),
    storeSettingsVersion: 2,
    defaultOwner: cleanOwnerLabel(settings.defaultOwner) || DEFAULT_SETTINGS.defaultOwner,
    shelfSync: settings.shelfSync !== false,
    forceCacheOnLoad: settings.forceCacheOnLoad === true,
    gotyAlwaysShow: settings.gotyAlwaysShow === true,
    gameOfTheYear,
    weekStart: normalizeWeekStart(settings.weekStart),
  };
}

function normalizeWeekStart(value) {
  return WEEK_START_OPTIONS.some(([key]) => key === value) ? value : "monday";
}

function normalizeGameOfTheYear(value = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).map(([year, entry]) => {
    const cleanYear = String(year || "").match(/\b(19|20)\d{2}\b/)?.[0];
    if (!cleanYear || !entry || typeof entry !== "object") return null;
    const picks = entry.picks && typeof entry.picks === "object" ? entry.picks : entry;
    const cleanPicks = Object.fromEntries(GAME_OF_YEAR_CATEGORIES.map(([key]) => [key, String(picks[key] || "")]));
    return [cleanYear, {
      picks: cleanPicks,
      published: gameOfTheYearComplete(cleanPicks),
      updatedAt: String(entry.updatedAt || ""),
    }];
  }).filter(Boolean));
}

function gameOfTheYearComplete(picks = {}) {
  return GAME_OF_YEAR_CATEGORIES.every(([key]) => Boolean(picks[key]));
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
  applyLanguage();
  document.documentElement.classList.remove("theme-booting");
  document.body.classList.toggle("can-edit", state.canEdit);
  document.body.classList.toggle("list-view-mode", state.viewMode === "list");
  el.loginButton.innerHTML = state.canEdit ? `${pauseIcon()}<span class="button-label">${escapeHtml(tt("Stop Editing"))}</span>` : pencilIcon();
  el.loginButton.title = state.canEdit ? tt("Stop Editing") : tt("Edit");
  el.loginButton.setAttribute("aria-label", el.loginButton.title);
  el.addButton.hidden = false;
  el.syncButton.hidden = !state.canEdit;
  if (el.settingsButton) el.settingsButton.hidden = !state.canEdit;
  if (el.fetchDataButton) el.fetchDataButton.hidden = true;
  el.fetchPricesButton.hidden = !state.canEdit;
  if (state.canEdit && !el.fetchPricesButton.disabled) el.fetchPricesButton.innerHTML = `${currencyIcon()}<span class="button-label">${escapeHtml(tt("Fetch New Prices"))}</span>`;
  el.sortFilter.value = state.filters.sort;
  renderFilters();
  renderPlayingSection();
  renderGameOfTheYear();
  renderStats();
  renderReleaseCalendar();
  syncMobileSectionToResults();
  renderMobileTabs();
  renderSection("new");
  renderSection("backlog");
  renderSection("upcoming");
  renderSection("wanted");
  renderCompleted();
  renderFooter();
  scheduleMobilePaintRefresh();
  el.sortDirectionButton.innerHTML = sortArrowIcon(state.filters.direction === "desc");
  el.sortDirectionButton.title = state.filters.direction === "asc" ? tt("Sort ascending") : tt("Sort descending");
  el.sortDirectionButton.setAttribute("aria-label", el.sortDirectionButton.title);
  el.sortDirectionButton.classList.toggle("desc", state.filters.direction === "desc");
  el.sortDirectionButton.disabled = state.filters.sort === "custom";
  renderViewToggle();
  applyPageOrder();
  el.preorderedFilter.checked = state.filters.preordered;
  el.platformFilter.classList.toggle("is-active", state.filters.platform !== "all");
  el.tagFilter.classList.toggle("is-active", state.filters.tag !== "all");
  updateScrollTopButton();
  maybePromptGameOfTheYear();
}

function currentLanguage() {
  return normalizeLanguage(state.settings?.language);
}

function tt(key, values) {
  return t(currentLanguage(), key, values);
}

function applyLanguage() {
  applyDocumentTranslations(currentLanguage());
}

function applyTheme() {
  const settings = normalizeSettings(state.settings);
  const theme = applySiteTheme(settings, { page: "gamelist" });
  el.brandLink?.setAttribute("aria-label", theme.title);
  el.brandLink?.setAttribute("href", settings.theme === "kash" ? KASH_TWITCH_URL : "#backlog");
  el.brandLink?.toggleAttribute("target", settings.theme === "kash");
  if (settings.theme === "kash") {
    el.brandLink?.setAttribute("rel", "noreferrer");
  } else {
    el.brandLink?.removeAttribute("rel");
  }
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
  el.playingSection.style.order = "1";
  if (el.gotySection) el.gotySection.style.order = "0";
  el.achievementSection.style.order = String(orderMap.get("trophies") || 1);
  el.calendarSection.style.order = String(orderMap.get("calendar") || 2);
  el.highlightsSection.style.order = String(orderMap.get("highlights") || 3);
  document.querySelector(".toolbar").style.order = String(orderMap.get("search") || 4);
  document.querySelector(".mobile-section-tabs").style.order = String(orderMap.get("gamelist") || 5);
  el.board.style.order = String(orderMap.get("gamelist") || 5);
  document.querySelector("#completed").style.order = String(orderMap.get("finished") || 6);
  el.playingCurrent.hidden = hidden.has("playing") || !hasPlayingGames;
  el.achievementSection.hidden = hidden.has("trophies");
  el.calendarSection.hidden = hidden.has("calendar");
  el.highlightsSection.hidden = hidden.has("highlights");
  document.querySelector(".toolbar").hidden = hidden.has("search");
  document.querySelector(".mobile-section-tabs").hidden = hidden.has("gamelist");
  el.board.hidden = hidden.has("gamelist");
  document.querySelector("#completed").hidden = hidden.has("finished");
  el.playingFinished.hidden = hidden.has("latestFinished") || !hasFinishedGames;
  el.playingSection.hidden = el.playingCurrent.hidden && el.playingFinished.hidden;
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
  el.settingsLanguage.innerHTML = languageOptions(state.settings.language, escapeHtml);
  el.settingsLanguage.value = state.settings.language;
  el.settingsDefaultOwner.value = state.settings.defaultOwner;
  const pageIndex = new Map(state.settings.pageOrder.map((key, index) => [key, index]));
  el.settingsLayoutList.innerHTML = [
    settingsLayoutItem("playing", -1, { fixed: true }),
    settingsLayoutItem("latestFinished", -1, { fixed: true }),
    ...state.settings.pageOrder.map((key) => settingsLayoutItem(key, pageIndex.get(key) ?? 0)),
    `<div class="settings-preference-separator" role="presentation"></div><div class="settings-preference-row">${settingsThemeItem()}${settingsDefaultOrderItem()}${settingsWeekStartItem()}${settingsShelfSyncItem()}</div>`,
  ].join("");
  document.querySelector("#settingsCsvData").innerHTML = settingsCsvDataItem("gamelist");
  if (el.settingsDevFeatures) el.settingsDevFeatures.innerHTML = settingsDevFeaturesItem("gamelist");
  el.settingsStores.innerHTML = STORE_OPTIONS.map((store) => `
    <label class="check-filter toggle-check settings-store-check">
      <input type="checkbox" value="${escapeHtml(store)}" ${state.settings.stores.includes(store) ? "checked" : ""}>
      <span>${escapeHtml(store)}</span>
    </label>
  `).join("");
  el.settingsStores.querySelectorAll("input[type='checkbox']").forEach((input) => {
    input.addEventListener("change", () => {
      const checked = [...el.settingsStores.querySelectorAll("input[type='checkbox']:checked")];
      if (checked.length <= MAX_PRICE_STORES) return;
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
  el.settingsLayoutList.querySelector("[data-theme-editor]")?.addEventListener("click", () => {
    openThemeEditor({
      settings: state.settings,
      page: "gamelist",
      onSave: async (settings) => {
        state.settings = normalizeSettings(settings);
        persistLocalSettings();
        await persistCloud();
        renderSettingsDialog();
        render();
      },
    });
    requestAnimationFrame(() => syncStyledSelects(document.querySelector("#themeEditorDialog"), { activeValue: null }));
  });
  el.settingsLayoutList.querySelector("[data-default-order]")?.addEventListener("change", (event) => {
    state.settings.defaultOrder = event.target.value;
  });
  el.settingsLayoutList.querySelector("[data-week-start]")?.addEventListener("change", (event) => {
    state.settings.weekStart = normalizeWeekStart(event.target.value);
    renderReleaseCalendar();
  });
  document.querySelector("[data-export-csv='gamelist']")?.addEventListener("click", exportGamelistCsv);
  document.querySelector("[data-import-csv='gamelist']")?.addEventListener("click", importGamelistCsv);
  applyLanguage();
  syncStyledSelects(el.settingsDialog, { activeValue: null });
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
  return themeSettingsButton(state.settings, escapeHtml);
}

function settingsDefaultOrderItem() {
  return `
    <article class="settings-layout-card settings-order-card" data-layout-key="default-order">
      <div class="settings-wire wire-order" aria-hidden="true"><span></span><span></span><span></span><span></span><span></span><span></span></div>
      <label class="settings-theme-select">
        <span>${escapeHtml(tt("Default order"))}</span>
        <select data-default-order aria-label="${escapeHtml(tt("Default list order"))}">
          <option value="custom" ${state.settings.defaultOrder === "custom" ? "selected" : ""}>${escapeHtml(tt("Custom"))}</option>
          <option value="time" ${state.settings.defaultOrder === "time" ? "selected" : ""}>${escapeHtml(tt("Time"))}</option>
          <option value="name" ${state.settings.defaultOrder === "name" ? "selected" : ""}>${escapeHtml(tt("Name"))}</option>
        </select>
      </label>
    </article>
  `;
}

function settingsWeekStartItem() {
  return `
    <article class="settings-layout-card settings-order-card" data-layout-key="week-start">
      <div class="settings-wire wire-calendar" aria-hidden="true"><span></span><span></span><span></span><span></span><span></span></div>
      <label class="settings-theme-select">
        <span>${escapeHtml(tt("Week starts"))}</span>
        <select data-week-start aria-label="${escapeHtml(tt("Calendar week starts on"))}">
          ${WEEK_START_OPTIONS.map(([value, label]) => `<option value="${value}" ${state.settings.weekStart === value ? "selected" : ""}>${escapeHtml(tt(label))}</option>`).join("")}
        </select>
      </label>
    </article>
  `;
}

function settingsShelfSyncItem() {
  return `
    <article class="settings-layout-card settings-sync-card" data-layout-key="shelf-sync">
      <div class="settings-wire wire-list" aria-hidden="true"><span></span><span></span><span></span></div>
      <div class="settings-theme-select">
        <span>${escapeHtml(tt("Shelf Sync"))}</span>
        <div class="settings-check-field">
          <label class="check-filter toggle-check settings-visible-check" title="${escapeHtml(tt("Shelf Sync"))}">
            <input type="checkbox" data-shelf-sync ${state.settings.shelfSync ? "checked" : ""}>
            <span>${escapeHtml(tt("Enabled"))}</span>
          </label>
        </div>
      </div>
    </article>
  `;
}

function settingsCsvDataItem(kind) {
  return `
    <article class="settings-layout-card settings-data-card">
      <div class="settings-theme-select">
        <div class="settings-data-actions">
          <button class="ghost-button" type="button" data-export-csv="${escapeHtml(kind)}">${escapeHtml(tt("Export"))}</button>
          <button class="ghost-button" type="button" data-import-csv="${escapeHtml(kind)}">${escapeHtml(tt("Import"))}</button>
        </div>
      </div>
    </article>
  `;
}

function settingsDevFeaturesItem(kind) {
  const links = [
    { href: "/api/gamelist-mass-add", label: "Mass add" },
    { href: "/api/gamelist-metadata", label: "Fill metadata" },
  ].map((link) => `
    <a class="ghost-button settings-dev-link" href="${escapeHtml(link.href)}" target="_blank" rel="noreferrer" data-dev-feature="${escapeHtml(kind)}">
      ${escapeHtml(tt(link.label))}
    </a>
  `).join("");
  return `${links}
    <label class="check-filter toggle-check settings-visible-check settings-dev-toggle" title="${escapeHtml(tt("Force cache on page load"))}">
      <input type="checkbox" id="settingsForceCacheOnLoad" ${state.settings.forceCacheOnLoad ? "checked" : ""}>
      <span>${escapeHtml(tt("Force cache on page load"))}</span>
    </label>
    <label class="check-filter toggle-check settings-visible-check settings-dev-toggle" title="${escapeHtml(tt("Always show Game of the Year"))}">
      <input type="checkbox" id="settingsGotyAlwaysShow" ${state.settings.gotyAlwaysShow ? "checked" : ""}>
      <span>${escapeHtml(tt("Always show Game of the Year"))}</span>
    </label>
  `;
}

const CSV_NUMERIC_FIELDS = new Set(["order", "lengthHours", "replayCount", "numericPrice", "price", "estimatedValue"]);

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
  }, new Set(["id", "title", "platform"]))];
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
  if (text === "true") return true;
  if (text === "false") return false;
  if (CSV_NUMERIC_FIELDS.has(key) && /^-?\d+(\.\d+)?$/.test(text)) return Number(text);
  return value;
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

function exportGamelistCsv() {
  downloadCsv(state.games, `gamelist-games-${dateStamp()}.csv`);
  showToast(`Exported ${state.games.length} games.`);
}

async function importGamelistCsv() {
  const file = await pickCsvFile();
  if (!file) return;
  try {
    const rows = csvToObjects(await file.text());
    if (!rows.length) {
      showToast("No games found in that CSV.", "error");
      return;
    }
    if (!window.confirm(`Import ${rows.length} games from CSV? This replaces the current Gamelist games.`)) return;
    state.games = normalizeGameRecords(rows.map((row, index) => ({
      ...row,
      id: row.id || csvImportedId("gamelist", index),
      updatedAt: row.updatedAt || new Date().toISOString(),
    })));
    persistLocal(false);
    await persistCloud();
    render();
    showToast(`Imported ${state.games.length} games.`);
  } catch (error) {
    showToast(error?.message || "CSV import failed.", "error");
  }
}

async function saveSettingsFromForm(event) {
  event.preventDefault();
  const previousCurrency = state.settings.currency;
  const previousDefaultOrder = state.settings.defaultOrder;
  const stores = [...el.settingsStores.querySelectorAll("input[type='checkbox']:checked")]
    .map((input) => input.value)
    .filter((store) => STORE_OPTIONS.includes(store))
    .slice(0, MAX_PRICE_STORES);
  const visibleSections = new Set([...el.settingsLayoutList.querySelectorAll("[data-layout-hidden]:checked")].map((input) => input.value));
  state.settings = normalizeSettings({
    ...state.settings,
    hiddenSections: LAYOUT_SECTION_KEYS.filter((key) => !visibleSections.has(key)),
    theme: state.settings.theme,
    customTheme: state.settings.customTheme,
    defaultOrder: el.settingsLayoutList.querySelector("[data-default-order]")?.value || state.settings.defaultOrder,
    psnUser: el.settingsPsnUser.value,
    microsoftUser: el.settingsMicrosoftUser.value,
    steamUser: el.settingsSteamUser.value,
    currency: el.settingsCurrency.value,
    region: el.settingsRegion.value,
    language: el.settingsLanguage.value,
    stores,
    defaultOwner: el.settingsDefaultOwner.value,
    shelfSync: Boolean(el.settingsLayoutList.querySelector("[data-shelf-sync]")?.checked),
    weekStart: normalizeWeekStart(el.settingsLayoutList.querySelector("[data-week-start]")?.value || state.settings.weekStart),
    forceCacheOnLoad: document.querySelector("#settingsForceCacheOnLoad")?.checked === true,
    gotyAlwaysShow: document.querySelector("#settingsGotyAlwaysShow")?.checked === true,
  });
  persistLocalSettings();
  await persistCloud();
  el.settingsDialog.close();
  state.cardTrophies = {};
  if (previousDefaultOrder !== state.settings.defaultOrder) {
    applyDefaultOrder(state.settings.defaultOrder);
    state.sortTouched = false;
  }
  refreshAchievements();
  render();
  if (previousCurrency !== state.settings.currency) await refreshAllPrices();
}

function renderModeToggle(button, mode) {
  if (button) syncViewModeButton(button, mode, { gridIcon, linesIcon });
}

function syncScrollLock() {
  document.body.classList.toggle("dialog-open", el.dialog.open || el.detailDialog.open || el.historyDialog.open || el.releaseDialog.open || el.platinumDialog.open || Boolean(el.finishedStatsDialog?.open) || Boolean(el.gotyDialog?.open) || Boolean(el.settingsDialog?.open) || Boolean(el.authDialog?.open));
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
  el.playingCount.textContent = `Playing ${games.length} ${games.length === 1 ? "game" : "games"}`;
  el.playingList.innerHTML = "";
  el.playingSection.classList.toggle("playing-single", games.length === 1);
  games.forEach((game) => el.playingList.appendChild(cardFor(game, { staticCard: true, imagePriority: "eager" })));
  preloadPausedActivityTrailers(el.playingList, escapeHtml);
  bindPlayingTrailerFocus();
  renderPlayingFinished();
  const hidden = new Set(normalizeSettings(state.settings).hiddenSections);
  el.playingCurrent.hidden = hidden.has("playing") || !games.length;
  el.playingSection.hidden = el.playingCurrent.hidden && el.playingFinished.hidden;
  schedulePlayingCardHeightSync();
  requestAnimationFrame(updatePlayingSliderControls);
  scheduleFocusedPlayingTrailerUpdate();
}

function renderPlayingFinished() {
  const games = state.games
    .filter((game) => !game.deletedAt && game.completedAt)
    .sort((a, b) => String(b.completedAt).localeCompare(String(a.completedAt)) || stringCompare(a.title, b.title))
    .slice(0, 10);
  el.playingFinished.hidden = (state.settings.hiddenSections || []).includes("latestFinished") || !games.length;
  el.playingFinishedList.innerHTML = games.map((game) => {
    const achievementProgress = achievementProgressForGame(game);
    const progress = achievementProgress ? progressValue(achievementProgress.game) : 0;
    const badges = `${completedOwnerBadges(game)}${completedBadges(game, { includePsn: false })}`;
    return finishedGameMarkup({ id: game.id, title: game.title, cover: game.cover || platformLogo(game.platform || "PS5"), completedClass: game.platinum ? "completed-trophy-card" : "", itemClass: ownerCardClass(game), badges, dateText: [formatLongDate(game.completedAt), finishedDurationText(game.startedAt, game.completedAt)].filter(Boolean).join(" · "), progress: achievementProgress ? progress : null, escape: escapeHtml });
  }).join("");
  el.playingFinishedList.querySelectorAll(".playing-finished-game").forEach((button) => {
    button.addEventListener("click", (event) => {
      if (event.target.closest("strong")) {
        scrollToFinishedSection();
        return;
      }
      openDetail(button.dataset.id);
    });
  });
  requestAnimationFrame(updatePlayingFinishedEdges);
}

function renderGameOfTheYear() {
  if (!el.gotySection) return;
  const years = gameOfTheYearYears();
  if (!gameOfTheYearVisible() || !years.length) {
    el.gotySection.hidden = true;
    return;
  }
  if (!years.includes(state.gotyYear)) state.gotyYear = years.includes(currentGameOfTheYear()) ? currentGameOfTheYear() : years[0];
  const year = state.gotyYear;
  const entry = state.settings.gameOfTheYear?.[year] || {};
  const picks = entry.picks || {};
  el.gotySection.hidden = false;
  const sectionTitle = window.matchMedia("(max-width: 520px)").matches ? `My GOTYs ${year}` : `My Games of the Year ${year}`;
  el.gotyTitle.innerHTML = `${trophyIcon()} <span>${escapeHtml(sectionTitle)}</span>`;
  el.gotyYearSelect.innerHTML = years.map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join("");
  el.gotyYearSelect.value = year;
  syncStyledSelect(el.gotyYearSelect, { activeValue: null });
  if (el.gotyYearCount) {
    const count = completedGamesForYear(year).length;
    el.gotyYearCount.textContent = `${count} ${count === 1 ? "game" : "games"} played`;
  }
  const canEditCurrent = state.canEdit && year === currentGameOfTheYear();
  el.gotyEditButton.hidden = !canEditCurrent;
  el.gotyEditButton.innerHTML = pencilIcon();
  el.gotyEditButton.title = "Edit";
  el.gotyEditButton.setAttribute("aria-label", "Edit");
  el.gotySaveButton.hidden = !gameOfTheYearComplete(picks);
  el.gotySaveButton.innerHTML = downloadIcon();
  el.gotySaveButton.title = "Download";
  el.gotySaveButton.setAttribute("aria-label", "Download");
  if (el.gotyStatsButton) {
    el.gotyStatsButton.hidden = !completedGamesForYear(year).length;
    el.gotyStatsButton.innerHTML = graphIcon();
    el.gotyStatsButton.title = "Stats";
    el.gotyStatsButton.setAttribute("aria-label", `Stats for ${year}`);
  }
  el.gotyGrid.innerHTML = GAME_OF_YEAR_CATEGORIES.map(([key, label], index) => {
    const game = gameById(picks[key]);
    if (!game) return "";
    const cover = coverDisplayUrl(game.cover || "") || platformLogo(game.platform || "PS5");
    const edgeClass = index >= GAME_OF_YEAR_CATEGORIES.length - 2 ? "goty-card-edge-right" : index === 0 ? "goty-card-edge-left" : "";
    return `
      <button class="goty-card ${edgeClass}" type="button" data-id="${escapeHtml(game.id)}" aria-label="${escapeHtml(`${label}: ${game.title}`)}">
        <span class="goty-category">${escapeHtml(label)}</span>
        <span class="goty-cover"><img src="${escapeHtml(cover)}" alt="" loading="lazy" decoding="async"></span>
        ${gameOfTheYearHoverInfo(game, "goty-hover-info")}
      </button>
    `;
  }).join("");
  el.gotyGrid.querySelectorAll(".goty-card").forEach((button) => {
    button.addEventListener("click", () => openDetail(button.dataset.id));
  });
}

function maybePromptGameOfTheYear() {
  if (!state.canEdit || state.gotyPromptShown || !gameOfTheYearVisible()) return;
  const year = currentGameOfTheYear();
  if (gameOfTheYearComplete(state.settings.gameOfTheYear?.[year]?.picks || {})) return;
  if (!completedGamesForYear(year).length) return;
  state.gotyPromptShown = true;
  window.setTimeout(() => showGameOfTheYearCallout(year), 300);
}

function openGameOfTheYearDialog(year = currentGameOfTheYear(), options = {}) {
  if (!options.force && (!state.canEdit || year !== currentGameOfTheYear())) return false;
  const games = sortedGameOfTheYearChoices(completedGamesForYear(year));
  if (!games.length) {
    showToast("No finished games found for this year.", "error");
    return false;
  }
  state.gotyYear = String(year);
  el.gotyForm.dataset.gotyYear = String(year);
  const entry = state.settings.gameOfTheYear?.[year] || {};
  const picks = { ...(entry.picks || {}) };
  const dialogTitle = window.matchMedia("(max-width: 520px)").matches ? `GOTYs ${year}` : `Games of the Year ${year}`;
  el.gotyDialogTitle.innerHTML = `${trophyIcon()} <span>${escapeHtml(dialogTitle)}</span>`;
  if (el.gotyPickerOrder) {
    state.gotyPickerOrder = state.gotyPickerOrder || gotyOrderForDefault(state.settings.defaultOrder);
    el.gotyPickerOrder.value = state.gotyPickerOrder;
    syncStyledSelect(el.gotyPickerOrder, { activeValue: null });
  }
  if (el.gotyResetButton) el.gotyResetButton.innerHTML = trashIcon();
  renderGameOfTheYearPicker(games, picks);
  try {
    if (!el.gotyDialog.open) el.gotyDialog.showModal();
  } catch (error) {
    try {
      if (!el.gotyDialog.open) el.gotyDialog.show();
    } catch (fallbackError) {
      console.error("Unable to open Games of the Year dialog", fallbackError || error);
      showToast("Could not open Game of the Year picks.", "error");
      return false;
    }
  }
  syncScrollLock();
  return true;
}

function renderGameOfTheYearPicker(games, picks) {
  hideGameOfTheYearTitleOverlay();
  const pickedIds = new Set(Object.values(picks).filter(Boolean));
  el.gotyPickerGrid.innerHTML = GAME_OF_YEAR_CATEGORIES.map(([key, label]) => {
    const selectedId = picks[key] || "";
    const pickedElsewhere = new Set([...pickedIds].filter((id) => id !== selectedId));
    const selectedGame = games.find((game) => game.id === selectedId);
    const choices = games.filter((game) => game.id !== selectedId);
    return `
    <section class="goty-picker-field" data-goty-category="${escapeHtml(key)}">
      <div class="goty-picker-head">
        <span class="goty-picker-category">${escapeHtml(label)}</span>
        <strong>${selectedGame ? escapeHtml(selectedGame.title) : ""}</strong>
        <div class="goty-picker-navs">
          <button class="icon-button playing-slider-button goty-choice-nav" type="button" data-goty-scroll="-1" title="Previous games" aria-label="Previous games">${gotyPickerArrowIcon("left")}</button>
          <button class="icon-button playing-slider-button goty-choice-nav" type="button" data-goty-scroll="1" title="Next games" aria-label="Next games">${gotyPickerArrowIcon("right")}</button>
        </div>
      </div>
      <div class="goty-choice-strip">
        ${selectedGame ? `<div class="goty-choice-selected">${gameOfTheYearChoiceCard(selectedGame, true)}</div>` : ""}
        <div class="goty-choice-list">
          ${choices.map((game) => gameOfTheYearChoiceCard(game, false, pickedElsewhere.has(game.id))).join("")}
        </div>
      </div>
    </section>
  `;
  }).join("");
  el.gotyPickerGrid.querySelectorAll(".goty-choice-card").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.disabled || button.classList.contains("is-unavailable")) return;
      const field = button.closest(".goty-picker-field");
      const category = field.dataset.gotyCategory;
      const gameId = button.dataset.gameId || "";
      picks[category] = picks[category] === gameId ? "" : gameId;
      renderGameOfTheYearPicker(games, picks);
    });
  });
  el.gotyPickerGrid.querySelectorAll(".goty-choice-title strong").forEach((title) => {
    title.classList.toggle("is-overflowing", title.scrollWidth > title.clientWidth + 1);
    title.addEventListener("pointerenter", () => showGameOfTheYearTitleOverlay(title));
    title.addEventListener("focus", () => showGameOfTheYearTitleOverlay(title));
    title.addEventListener("pointerleave", hideGameOfTheYearTitleOverlay);
    title.addEventListener("blur", hideGameOfTheYearTitleOverlay);
  });
  el.gotyPickerGrid.querySelectorAll(".goty-choice-nav").forEach((button) => {
    button.addEventListener("click", () => {
      const field = button.closest(".goty-picker-field");
      const list = field?.querySelector(".goty-choice-list");
      const card = list?.querySelector(".goty-choice-card");
      if (!list) return;
      const gap = Number.parseFloat(getComputedStyle(list).columnGap) || 0;
      const step = card ? card.getBoundingClientRect().width + gap : list.clientWidth;
      list.scrollBy({ left: Number(button.dataset.gotyScroll || 1) * step, behavior: "smooth" });
      window.setTimeout(() => updateGameOfTheYearPickerNav(field), 220);
    });
  });
  el.gotyPickerGrid.querySelectorAll(".goty-picker-field").forEach((field) => {
    const list = field.querySelector(".goty-choice-list");
    list?.addEventListener("scroll", () => updateGameOfTheYearPickerNav(field), { passive: true });
    updateGameOfTheYearPickerNav(field);
  });
}

function sortedGameOfTheYearChoices(games) {
  const order = state.gotyPickerOrder || gotyOrderForDefault(state.settings.defaultOrder);
  return [...games].sort((a, b) => {
    if (order === "name") return stringCompare(a.title, b.title) || String(b.completedAt).localeCompare(String(a.completedAt));
    if (order === "platform") return stringCompare(canonicalPlatform(a.platform), canonicalPlatform(b.platform)) || stringCompare(a.title, b.title);
    return String(b.completedAt).localeCompare(String(a.completedAt)) || stringCompare(a.title, b.title);
  });
}

function currentGameOfTheYearDraftPicks() {
  return Object.fromEntries([...el.gotyPickerGrid.querySelectorAll(".goty-picker-field")]
    .map((field) => [field.dataset.gotyCategory, field.querySelector(".goty-choice-card.is-selected")?.dataset.gameId || ""]));
}

function updateGameOfTheYearPickerNav(field) {
  if (!field) return;
  const list = field.querySelector(".goty-choice-list");
  const prev = field.querySelector("[data-goty-scroll='-1']");
  const next = field.querySelector("[data-goty-scroll='1']");
  if (!list || !prev || !next) return;
  const maxScroll = Math.max(0, list.scrollWidth - list.clientWidth - 1);
  const hasOverflow = maxScroll > 2;
  field.querySelector(".goty-choice-strip")?.classList.toggle("no-overflow", !hasOverflow);
  field.querySelector(".goty-choice-strip")?.classList.toggle("has-selected", Boolean(field.querySelector(".goty-choice-selected")));
  field.querySelector(".goty-choice-strip")?.classList.toggle("at-start", !hasOverflow || list.scrollLeft <= 2);
  field.querySelector(".goty-choice-strip")?.classList.toggle("at-end", !hasOverflow || list.scrollLeft >= maxScroll);
  prev.hidden = !hasOverflow;
  next.hidden = !hasOverflow;
  prev.disabled = list.scrollLeft <= 2;
  next.disabled = list.scrollLeft >= maxScroll;
}

async function saveGameOfTheYearFromForm(event) {
  event.preventDefault();
  const year = el.gotyForm.dataset.gotyYear || currentGameOfTheYear();
  const picks = currentGameOfTheYearDraftPicks();
  if (!gameOfTheYearComplete(picks)) {
    showToast("Choose a game for every category.", "error");
    return;
  }
  state.settings = normalizeSettings({
    ...state.settings,
    gameOfTheYear: {
      ...(state.settings.gameOfTheYear || {}),
      [year]: { picks, published: true, updatedAt: new Date().toISOString() },
    },
  });
  state.gotyYear = year;
  persistLocalSettings();
  await persistCloud();
  document.querySelector(".goty-callout")?.classList.remove("visible");
  el.gotyDialog.close();
  render();
  showToast(`Saved Games of the Year ${year}.`);
}

function resetGameOfTheYearFromForm(event) {
  event?.preventDefault();
  event?.stopPropagation();
  const year = el.gotyForm.dataset.gotyYear || currentGameOfTheYear();
  const gameOfTheYear = { ...(state.settings.gameOfTheYear || {}) };
  delete gameOfTheYear[year];
  state.settings = normalizeSettings({ ...state.settings, gameOfTheYear });
  state.gotyYear = year;
  state.gotyPromptShown = false;
  persistLocalSettings();
  el.gotyDialog.close();
  document.querySelector(".goty-callout")?.remove();
  render();
  state.gotyPromptShown = false;
  window.setTimeout(() => showGameOfTheYearCallout(year), 120);
  showToast(`Reset Games of the Year ${year}.`);
  persistCloud().catch(() => showToast("Could not sync the reset yet.", "error"));
}

function showGameOfTheYearCallout(year) {
  if (!state.canEdit || el.gotyDialog?.open) return;
  let callout = document.querySelector(".goty-callout");
  if (!callout) {
    callout = document.createElement("div");
    callout.className = "goty-callout";
    callout.setAttribute("role", "status");
    callout.setAttribute("aria-live", "polite");
    document.body.appendChild(callout);
  }
  callout.innerHTML = `
    <span class="goty-callout-title">${trophyIcon()}<span>Choose your games of this year.</span></span>
    <button class="primary-button" type="button" data-goty-callout-action="choose">Choose now</button>
    <button class="icon-button" type="button" data-goty-callout-action="dismiss" title="Dismiss" aria-label="Dismiss">×</button>
  `;
  callout.querySelector("[data-goty-callout-action='choose']")?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const opened = openGameOfTheYearDialog(year, { force: true });
    if (opened) callout.classList.remove("visible");
  });
  callout.querySelector("[data-goty-callout-action='dismiss']")?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    callout.classList.remove("visible");
  });
  requestAnimationFrame(() => callout.classList.add("visible"));
}

function gameOfTheYearChoiceCard(game, selected, unavailable = false) {
  const cover = coverDisplayUrl(game.cover || "") || platformLogo(game.platform || "PS5");
  return `
    <button class="goty-choice-card ${selected ? "is-selected" : ""} ${unavailable ? "is-unavailable" : ""}" type="button" data-game-id="${escapeHtml(game.id)}" data-title="${escapeHtml(game.title)}" ${unavailable ? "disabled aria-disabled=\"true\"" : ""}>
      <span class="goty-choice-cover"><img src="${escapeHtml(cover)}" alt="" loading="lazy" decoding="async"></span>
      <span class="goty-choice-title"><strong data-full-title="${escapeHtml(game.title)}">${escapeHtml(game.title)}</strong>${platformBadge(game.platform)}</span>
    </button>
  `;
}

function showGameOfTheYearTitleOverlay(target) {
  hideGameOfTheYearTitleOverlay();
  if (!target?.classList?.contains("is-overflowing") && target.scrollWidth <= target.clientWidth + 1) return;
  const text = target?.dataset.fullTitle || target?.textContent || "";
  if (!text) return;
  const overlay = document.createElement("div");
  overlay.className = "goty-title-overlay";
  overlay.textContent = text;
  (el.gotyDialog?.open ? el.gotyDialog : document.body).appendChild(overlay);
  const rect = target.getBoundingClientRect();
  const maxWidth = Math.min(520, window.innerWidth - 32);
  overlay.style.maxWidth = `${maxWidth}px`;
  const overlayRect = overlay.getBoundingClientRect();
  const left = Math.min(Math.max(16, rect.left + rect.width / 2 - overlayRect.width / 2), window.innerWidth - overlayRect.width - 16);
  const top = Math.max(16, rect.top - overlayRect.height - 10);
  overlay.style.left = `${left}px`;
  overlay.style.top = `${top}px`;
  requestAnimationFrame(() => overlay.classList.add("visible"));
}

function hideGameOfTheYearTitleOverlay() {
  document.querySelector(".goty-title-overlay")?.remove();
}

function gotyPickerArrowIcon(direction) {
  const path = direction === "left" ? "M15 18l-6-6 6-6" : "M9 6l6 6-6 6";
  return `<svg class="sort-arrow-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${path}"></path></svg>`;
}

function gameOfTheYearHoverInfo(game, className) {
  const progress = achievementProgressForGame(game);
  const details = [
    game.developer || "",
    game.publisher || "",
  ].filter(Boolean);
  const tags = [
    ...String(game.genres || "").split(","),
    ...(Array.isArray(game.tags) ? game.tags : []),
  ].map((tag) => tag.trim()).filter(Boolean).slice(0, 4);
  return `
    <span class="${className}">
      <strong>${escapeHtml(game.title)}</strong>
      ${details.length ? `<small>${escapeHtml(details.join(" · "))}</small>` : ""}
      <span class="goty-meta">
        <span class="goty-main-pills">${platformBadge(game.platform)}${progress ? psnProgressBadge(progress, { className: "goty-progress-pill" }) : ""}</span>
        ${tags.map((tag) => `<span class="chip genre">${escapeHtml(tag)}</span>`).join("")}
      </span>
    </span>
  `;
}

function gameOfTheYearVisible() {
  return state.settings.gotyAlwaysShow || isGameOfTheYearSeason();
}

function isGameOfTheYearSeason(date = new Date()) {
  const month = date.getMonth();
  return month === 11 || (month === 0 && date.getDate() <= 14);
}

function currentGameOfTheYear(date = new Date()) {
  const year = date.getFullYear();
  return String(date.getMonth() === 0 && date.getDate() <= 14 ? year - 1 : year);
}

function gameOfTheYearYears() {
  return Object.entries(state.settings.gameOfTheYear || {})
    .filter(([, entry]) => gameOfTheYearComplete(entry?.picks || {}))
    .map(([year]) => year)
    .sort((a, b) => b.localeCompare(a));
}

function gameById(id) {
  return state.games.find((game) => game.id === id && !game.deletedAt) || null;
}

async function downloadGameOfTheYearImage() {
  const year = state.gotyYear;
  const picks = state.settings.gameOfTheYear?.[year]?.picks || {};
  if (!gameOfTheYearComplete(picks)) return;
  const owner = cleanOwnerLabel(state.settings.defaultOwner) || DEFAULT_SETTINGS.defaultOwner;
  const rows = GAME_OF_YEAR_CATEGORIES.map(([key, label]) => ({ label, game: gameById(picks[key]) })).filter((item) => item.game);
  const theme = normalizeThemeSettings(state.settings);
  const assetRows = await Promise.all(rows.map(async (row) => ({
    ...row,
    coverSrc: await exportImageDataUrl(coverDisplayUrl(row.game.cover || ""), platformLogo(row.game.platform || "PS5")),
  })));
  const logo = await exportImageDataUrl(document.querySelector(".brand-mark")?.src || THEMES.shabii.icon, THEMES.shabii.icon);
  const background = await exportImageDataUrl(theme.backgroundImage || "", theme.mode === "light" ? "assets/backdrop_light.png" : "assets/backdrop.png");
  const html = gameOfTheYearExportMarkup({ owner, year, rows: assetRows, theme, logo, background });
  try {
    await downloadHtmlPosterPng(html, `games-of-the-year-${year}.png`);
  } catch (error) {
    console.error("Unable to export GOTY poster", error);
    downloadHtmlPosterSvg(html, `games-of-the-year-${year}.svg`);
    showToast("PNG export was blocked, so I downloaded an SVG instead.", "error");
  }
}

function gameOfTheYearExportMarkup({ owner, year, rows, theme, logo, background }) {
  const main = theme.mainColorReset ? DEFAULT_SETTINGS.theme === "kash" ? THEMES.kash.themeColor : THEMES.shabii.themeColor : theme.mainColor;
  const accent = theme.accentColor || "#79f2ce";
  const gradient = theme.gradient ? theme.gradientColor : main;
  const bg = background || theme.backgroundImage || (theme.mode === "light" ? "assets/backdrop_light.png" : "assets/backdrop.png");
  const glowPrimary = canvasThemeColorBySource(theme, theme.glowPrimary || "main", main, accent);
  const glowSecondary = canvasThemeColorBySource(theme, theme.glowSecondary || "accent", main, accent);
  const siteUrl = cleanCanvasSiteUrl(window.location.origin && window.location.origin !== "null" ? window.location.origin : window.location.hostname || "Gamelist");
  const logoSrc = logo || document.querySelector(".brand-mark")?.src || THEMES.shabii.icon;
  return `
  <div xmlns="http://www.w3.org/1999/xhtml" class="goty-export-poster">
    <style>${gameOfTheYearExportCss({ theme, main, accent, gradient, bg, glowPrimary, glowSecondary })}</style>
    <img class="goty-export-logo" src="${escapeHtml(logoSrc)}" alt="" />
    <header class="goty-export-head">
      <h1>${escapeHtml(`${owner}'s Games of the Year ${year}`)}</h1>
    </header>
    <main class="goty-export-grid">
      ${rows.map((row, index) => gameOfTheYearExportCard({ ...row, index })).join("")}
    </main>
    <footer>${escapeHtml(siteUrl)}</footer>
  </div>`;
}

function gameOfTheYearExportCard({ label, game, coverSrc, index }) {
  const cover = coverSrc || "";
  const progress = achievementProgressForGame(game);
  const progressNumber = progress ? Math.round(Number(progress.progress ?? progressValue(progress.game)) || 0) : 0;
  const progressCount = progress ? canvasProgressCount(progress.label) : "";
  const studio = game.developer || game.publisher || "";
  const tags = [
    ...String(game.genres || "").split(","),
    ...(Array.isArray(game.tags) ? game.tags : []),
  ].map((tag) => tag.trim()).filter(Boolean).slice(0, 2);
  return `
    <article class="goty-export-card ${index >= 4 ? "is-bottom" : ""}">
      <div class="goty-export-cover-wrap">${cover ? `<img class="goty-export-cover" src="${escapeHtml(cover)}" alt="" />` : `<span class="goty-export-cover goty-export-cover-fallback"></span>`}</div>
      <div class="goty-export-info">
        <strong class="goty-export-category">${escapeHtml(label)}</strong>
        <h2>${escapeHtml(game.title || "")}</h2>
        <p>${escapeHtml(studio || "Finished game")}</p>
        <div class="goty-export-pills">
          ${progress ? `<span class="goty-export-pill goty-export-progress" style="--progress:${progressNumber}%"><em></em><b>${progressNumber}%</b>${progressCount ? `<span>${escapeHtml(progressCount)}</span>` : ""}</span>` : ""}
          <span class="goty-export-pill">${escapeHtml(platformDisplayName(game.platform || "Game"))}</span>
          ${tags.map((tag) => `<span class="goty-export-pill goty-export-tag">${escapeHtml(tag)}</span>`).join("")}
        </div>
      </div>
    </article>`;
}

function gameOfTheYearExportCss({ theme, main, accent, gradient, bg, glowPrimary, glowSecondary }) {
  const text = theme.mode === "light" ? "#151925" : "#f6f7fb";
  const muted = theme.mode === "light" ? "rgba(22,28,42,.68)" : "rgba(246,247,251,.68)";
  const panel = theme.mode === "light" ? "rgba(255,255,255,.62)" : "rgba(255,255,255,.075)";
  const line = theme.mode === "light" ? "rgba(18,24,36,.16)" : "rgba(255,255,255,.14)";
  const sweep = theme.mode === "light" ? "rgba(255,255,255,.58)" : "rgba(255,255,255,.055)";
  const titleFont = canvasTitleFont(theme);
  const bodyFont = canvasBodyFont();
  return `
    .goty-export-poster {
      position: relative;
      box-sizing: border-box;
      width: 1920px;
      height: 1080px;
      overflow: hidden;
      padding: 68px 62px 52px;
      color: ${text};
      font-family: ${bodyFont};
      background:
        radial-gradient(circle at 78% 9%, ${canvasRgba(glowPrimary, theme.disableGlow ? 0 : 0.24)}, transparent 30%),
        radial-gradient(circle at 11% 84%, ${canvasRgba(glowSecondary, theme.disableGlow ? 0 : 0.16)}, transparent 34%),
        linear-gradient(120deg, ${sweep}, transparent 38%),
        url("${cssUrl(bg)}") top left / cover repeat,
        ${theme.mode === "light" ? "#e8edf5" : "#161619"};
    }
    .goty-export-logo {
      position: absolute;
      left: 84px;
      top: 68px;
      width: 112px;
      height: 112px;
      object-fit: cover;
      border-radius: 22px;
    }
    .goty-export-head {
      margin-left: 158px;
      min-height: 150px;
    }
    .goty-export-head h1 {
      width: 1260px;
      margin: 0;
      color: transparent;
      font: 900 64px/1.08 ${titleFont};
      background: linear-gradient(135deg, ${gradient}, ${main});
      -webkit-background-clip: text;
      background-clip: text;
    }
    .goty-export-grid {
      display: grid;
      grid-template-columns: repeat(4, 425px);
      grid-template-rows: repeat(2, 342px);
      gap: 36px 26px;
      margin-top: 34px;
    }
    .goty-export-card {
      box-sizing: border-box;
      display: grid;
      grid-template-columns: 154px minmax(0, 1fr);
      gap: 18px;
      width: 425px;
      height: 342px;
      padding: 34px 22px 30px;
      background: ${panel};
      border: 1px solid ${line};
      border-radius: 18px;
    }
    .goty-export-card.is-bottom:first-of-type {
      grid-column: 1;
    }
    .goty-export-card:nth-child(5) {
      grid-column: 2;
    }
    .goty-export-cover-wrap {
      align-self: end;
      width: 154px;
      height: 216px;
      filter:
        drop-shadow(0 16px 18px ${canvasRgba(main, 0.34)})
        drop-shadow(0 0 16px ${canvasRgba(main, 0.26)});
    }
    .goty-export-cover {
      width: 154px;
      height: 216px;
      object-fit: contain;
      border-radius: 12px;
    }
    .goty-export-cover-fallback {
      display: block;
      background:
        linear-gradient(135deg, ${canvasRgba(main, 0.22)}, transparent),
        ${theme.mode === "light" ? "rgba(255,255,255,.5)" : "rgba(255,255,255,.12)"};
    }
    .goty-export-info {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      min-width: 0;
      text-align: right;
    }
    .goty-export-category {
      min-height: 48px;
      color: ${accent};
      font: 900 20px/1.15 ${titleFont};
      text-transform: uppercase;
    }
    .goty-export-info h2 {
      margin: 10px 0 0;
      color: ${text};
      font: 900 31px/1.12 ${bodyFont};
    }
    .goty-export-info p {
      margin: 14px 0 0;
      color: ${muted};
      font: 700 19px/1.25 ${bodyFont};
    }
    .goty-export-pills {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: 7px;
      margin-top: auto;
    }
    .goty-export-pill {
      position: relative;
      overflow: hidden;
      min-height: 28px;
      box-sizing: border-box;
      padding: 6px 12px;
      color: ${text};
      font: 800 15px/1 ${bodyFont};
      background: ${theme.mode === "light" ? "rgba(255,255,255,.76)" : "rgba(255,255,255,.11)"};
      border: 1px solid ${line};
      border-radius: 10px;
    }
    .goty-export-progress em {
      position: absolute;
      inset: 4px auto 4px 4px;
      width: var(--progress);
      max-width: calc(100% - 8px);
      background: ${canvasRgba(main, theme.mode === "light" ? 0.32 : 0.42)};
      border-radius: 8px;
    }
    .goty-export-progress b,
    .goty-export-progress span {
      position: relative;
      z-index: 1;
    }
    .goty-export-progress span::before {
      content: " · ";
    }
    footer {
      position: absolute;
      right: 82px;
      bottom: 52px;
      color: ${muted};
      font: 800 24px/1 ${bodyFont};
    }
  `;
}

function htmlPosterSvg(html) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">
  <foreignObject width="1920" height="1080">${html}</foreignObject>
</svg>`;
}

function downloadHtmlPosterPng(html, filename) {
  return new Promise((resolve, reject) => {
    const svg = htmlPosterSvg(html);
    const svgUrl = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
    const image = new Image();
    image.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 1920;
        canvas.height = 1080;
        const context = canvas.getContext("2d");
        context.drawImage(image, 0, 0);
        URL.revokeObjectURL(svgUrl);
        canvas.toBlob((blob) => {
          if (!blob) return reject(new Error("PNG export failed"));
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          link.remove();
          window.setTimeout(() => URL.revokeObjectURL(url), 1000);
          resolve();
        }, "image/png");
      } catch (error) {
        URL.revokeObjectURL(svgUrl);
        reject(error);
      }
    };
    image.onerror = () => {
      URL.revokeObjectURL(svgUrl);
      reject(new Error("Could not render poster"));
    };
    image.src = svgUrl;
  });
}

function downloadHtmlPosterSvg(html, filename) {
  const blob = new Blob([htmlPosterSvg(html)], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function exportImageDataUrl(src, fallback = "") {
  const inline = await imageToDataUrl(src);
  if (inline) return inline;
  return fallback && fallback !== src ? await imageToDataUrl(fallback) : "";
}

async function imageToDataUrl(src) {
  if (!src) return "";
  if (String(src).startsWith("data:")) return src;
  try {
    const url = new URL(src, window.location.href);
    if (url.origin !== window.location.origin) return "";
    const response = await fetch(url.href, { cache: "no-store" });
    if (!response.ok || response.type === "opaque") return "";
    const blob = await response.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => resolve("");
      reader.readAsDataURL(blob);
    });
  } catch {
    return "";
  }
}

async function drawGameOfTheYearImage(ctx, { owner, year, rows, logo, theme, background, withCovers }) {
  const { width, height } = ctx.canvas;
  ctx.clearRect(0, 0, width, height);
  const main = theme.mainColorReset ? DEFAULT_SETTINGS.theme === "kash" ? THEMES.kash.themeColor : THEMES.shabii.themeColor : theme.mainColor;
  const accent = theme.accentColor || "#79f2ce";
  const titleGradient = theme.gradient ? theme.gradientColor : main;
  const titleFont = canvasTitleFont(theme);
  const bodyFont = canvasBodyFont();
  ctx.fillStyle = theme.mode === "light" ? "#e8edf5" : "#08090d";
  ctx.fillRect(0, 0, width, height);
  if (background) {
    ctx.globalAlpha = theme.mode === "light" ? 0.62 : 0.9;
    drawCanvasImageCover(ctx, background, 0, 0, width, height);
    ctx.globalAlpha = 1;
  }
  drawCanvasGlow(ctx, width * 0.78, height * 0.09, 580, canvasThemeColorBySource(theme, theme.glowPrimary || "main", main, accent), theme.disableGlow ? 0 : 0.24);
  drawCanvasGlow(ctx, width * 0.11, height * 0.84, 650, canvasThemeColorBySource(theme, theme.glowSecondary || "accent", main, accent), theme.disableGlow ? 0 : 0.16);
  const sweep = ctx.createLinearGradient(0, 0, width, height * 0.72);
  sweep.addColorStop(0, theme.mode === "light" ? "rgba(255,255,255,.58)" : "rgba(255,255,255,.055)");
  sweep.addColorStop(0.38, "rgba(255,255,255,0)");
  sweep.addColorStop(1, theme.mode === "light" ? "rgba(232,237,245,.32)" : "rgba(8,9,13,.36)");
  ctx.fillStyle = sweep;
  ctx.fillRect(0, 0, width, height);
  if (logo) {
    drawCanvasImageCover(ctx, logo, 84, 68, 112, 112, 22);
  }
  const titleFill = ctx.createLinearGradient(220, 78, 980, 154);
  titleFill.addColorStop(0, titleGradient);
  titleFill.addColorStop(1, main);
  ctx.fillStyle = titleFill;
  ctx.font = `900 64px ${titleFont}`;
  wrapCanvasText(ctx, `${owner}'s Games of the Year ${year}`, 220, 108, 1260, 70);
  const siteUrl = cleanCanvasSiteUrl(window.location.origin && window.location.origin !== "null" ? window.location.origin : window.location.hostname || "Gamelist");
  ctx.font = `800 24px ${bodyFont}`;
  ctx.textAlign = "right";
  ctx.fillStyle = theme.mode === "light" ? "rgba(22,28,42,.72)" : "rgba(246,247,251,.74)";
  ctx.fillText(siteUrl, width - 82, height - 52);
  ctx.textAlign = "left";
  const cardW = 425;
  const cardH = 342;
  const gap = 26;
  const topX = 62;
  const topY = 252;
  const bottomY = 630;
  const bottomX = Math.round((width - (3 * cardW + 2 * gap)) / 2);
  for (let index = 0; index < rows.length; index += 1) {
    const topRow = index < 4;
    const col = topRow ? index : index - 4;
    const x = (topRow ? topX : bottomX) + col * (cardW + gap);
    const y = topRow ? topY : bottomY;
    const game = rows[index].game;
    const progress = achievementProgressForGame(game);
    const progressValueNumber = progress ? Math.round(Number(progress.progress ?? progressValue(progress.game)) || 0) : 0;
    const progressCount = progress ? canvasProgressCount(progress.label) : "";
    const details = [game.platform || "", game.developer || game.publisher || ""].filter(Boolean).join(" · ");
    const tags = [
      ...String(game.genres || "").split(","),
      ...(Array.isArray(game.tags) ? game.tags : []),
    ].map((tag) => tag.trim()).filter(Boolean).slice(0, 2).join(" · ");
    drawCanvasGlow(ctx, x + 88, y + 182, 170, main, 0.18);
    drawRoundedRect(ctx, x, y, cardW, cardH, 18, theme.mode === "light" ? "rgba(255,255,255,.62)" : "rgba(255,255,255,.075)");
    drawRoundedStroke(ctx, x, y, cardW, cardH, 18, theme.mode === "light" ? "rgba(18,24,36,.16)" : "rgba(255,255,255,.14)");
    const cover = withCovers ? await loadCanvasImage(coverDisplayUrl(rows[index].game.cover || "")) : null;
    if (cover) drawCanvasImageContain(ctx, cover, x + 22, y + 78, 154, 216, 12);
    else drawRoundedRect(ctx, x + 22, y + 78, 154, 216, 12, "rgba(255,255,255,.12)");
    ctx.fillStyle = accent;
    ctx.textAlign = "right";
    ctx.font = `900 20px ${titleFont}`;
    wrapCanvasText(ctx, rows[index].label, x + cardW - 18, y + 34, cardW - 36, 24);
    ctx.fillStyle = theme.mode === "light" ? "#151925" : "#f6f7fb";
    ctx.font = `900 31px ${bodyFont}`;
    wrapCanvasText(ctx, game.title || "", x + cardW - 22, y + 92, cardW - 214, 35, 3);
    ctx.fillStyle = theme.mode === "light" ? "rgba(22,28,42,.72)" : "#a6adbd";
    ctx.font = `700 19px ${bodyFont}`;
    wrapCanvasText(ctx, details || "Finished game", x + cardW - 22, y + 212, cardW - 214, 24, 2);
    ctx.fillStyle = theme.mode === "light" ? "rgba(22,28,42,.62)" : "rgba(246,247,251,.68)";
    ctx.font = `700 17px ${bodyFont}`;
    wrapCanvasText(ctx, tags, x + cardW - 22, y + 264, cardW - 214, 22, 1);
    let pillRight = x + cardW - 22;
    if (progress) {
      pillRight -= drawCanvasProgressPill(ctx, pillRight, y + 288, progressValueNumber, progressCount, { theme, bodyFont, main }) + 8;
    }
    drawCanvasPill(ctx, pillRight, y + 288, platformDisplayName(game.platform || "Game"), { theme, bodyFont, align: "right" });
    ctx.textAlign = "left";
  }
}

function drawCanvasGlow(ctx, x, y, radius, color, alpha) {
  if (!alpha) return;
  const glow = ctx.createRadialGradient(x, y, 0, x, y, radius);
  glow.addColorStop(0, canvasRgba(color, alpha));
  glow.addColorStop(1, canvasRgba(color, 0));
  ctx.fillStyle = glow;
  ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
}

function drawCanvasPill(ctx, right, y, text, { theme, bodyFont, align = "right" }) {
  const label = String(text || "").trim();
  if (!label) return 0;
  ctx.save();
  ctx.font = `800 15px ${bodyFont}`;
  const width = Math.ceil(ctx.measureText(label).width) + 26;
  const height = 28;
  const x = align === "right" ? right - width : right;
  drawRoundedRect(ctx, x, y, width, height, 10, theme.mode === "light" ? "rgba(255,255,255,.76)" : "rgba(255,255,255,.11)");
  drawRoundedStroke(ctx, x, y, width, height, 10, theme.mode === "light" ? "rgba(18,24,36,.16)" : "rgba(255,255,255,.15)");
  ctx.fillStyle = theme.mode === "light" ? "#151925" : "#f6f7fb";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, x + width / 2, y + height / 2 + 1);
  ctx.restore();
  return width;
}

function drawCanvasProgressPill(ctx, right, y, progress, count, { theme, bodyFont, main }) {
  const pct = Math.max(0, Math.min(100, Math.round(Number(progress) || 0)));
  const label = [`${pct}%`, count || ""].filter(Boolean).join(" · ");
  ctx.save();
  ctx.font = `900 15px ${bodyFont}`;
  const width = Math.max(118, Math.ceil(ctx.measureText(label).width) + 34);
  const height = 28;
  const x = right - width;
  drawRoundedRect(ctx, x, y, width, height, 10, theme.mode === "light" ? "rgba(255,255,255,.76)" : "rgba(255,255,255,.11)");
  drawRoundedRect(ctx, x + 4, y + 4, Math.max(10, (width - 8) * pct / 100), height - 8, 8, canvasRgba(main, theme.mode === "light" ? 0.32 : 0.42));
  drawRoundedStroke(ctx, x, y, width, height, 10, theme.mode === "light" ? "rgba(18,24,36,.16)" : "rgba(255,255,255,.15)");
  ctx.fillStyle = theme.mode === "light" ? "#151925" : "#f6f7fb";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, x + width / 2, y + height / 2 + 1);
  ctx.restore();
  return width;
}

function canvasProgressCount(label = "") {
  const match = String(label).match(/(\d+\s*\/\s*\d+)/);
  return match ? match[1].replace(/\s+/g, "") : "";
}

function cleanCanvasSiteUrl(value) {
  return String(value || "")
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/\/$/, "");
}

function canvasTitleFont(theme) {
  return canvasFontFamily(theme?.accentFont, true);
}

function canvasBodyFont() {
  return "\"Cascadia Code\", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";
}

function canvasFontFamily(value, fallbackToBody = false) {
  const fonts = {
    antique: "\"Antique Olive Nord\"",
    georgia: "\"Georgia Bold\"",
    pokemon: "\"Pokemon GBA\"",
    pixel: "\"04B 30\"",
    michroma: "\"Michroma\"",
    minecraft: "\"Minecraft\"",
    mata: "\"Mata Regular\"",
  };
  return fonts[value] || (fallbackToBody ? canvasBodyFont() : "\"Cascadia Code\"");
}

function canvasThemeColorBySource(theme, source, main, accent) {
  if (source === "accent") return accent;
  if (source === "gradient") return theme.gradientColor || main;
  if (source === "extra") return theme.extraColor || accent;
  return main;
}

function drawRoundedRect(ctx, x, y, width, height, radius, fill) {
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") ctx.roundRect(x, y, width, height, radius);
  else {
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
  }
  ctx.fillStyle = fill;
  ctx.fill();
}

function drawRoundedStroke(ctx, x, y, width, height, radius, stroke) {
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") ctx.roundRect(x, y, width, height, radius);
  else {
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
  }
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawCanvasImageContain(ctx, image, x, y, width, height, radius = 0) {
  ctx.save();
  if (radius) {
    drawRoundedPath(ctx, x, y, width, height, radius);
    ctx.clip();
  }
  const scale = Math.min(width / image.width, height / image.height);
  const drawW = image.width * scale;
  const drawH = image.height * scale;
  ctx.drawImage(image, x + (width - drawW) / 2, y + (height - drawH) / 2, drawW, drawH);
  ctx.restore();
}

function drawCanvasImageCover(ctx, image, x, y, width, height, radius = 0) {
  ctx.save();
  if (radius) {
    drawRoundedPath(ctx, x, y, width, height, radius);
    ctx.clip();
  }
  const scale = Math.max(width / image.width, height / image.height);
  const drawW = image.width * scale;
  const drawH = image.height * scale;
  ctx.drawImage(image, x + (width - drawW) / 2, y + (height - drawH) / 2, drawW, drawH);
  ctx.restore();
}

function drawRoundedPath(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, width, height, radius);
    return;
  }
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
}

function canvasRgba(hex, alpha) {
  const value = String(hex || "").replace("#", "");
  const number = /^[0-9a-fA-F]{6}$/.test(value) ? Number.parseInt(value, 16) : 0xff0039;
  return `rgba(${(number >> 16) & 255}, ${(number >> 8) & 255}, ${number & 255}, ${alpha})`;
}

function wrapCanvasText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 2) {
  const words = String(text || "").split(/\s+/);
  let line = "";
  let lines = 0;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, y + lines * lineHeight);
      line = word;
      lines += 1;
      if (lines >= maxLines) return;
    } else line = test;
  }
  if (line && lines < maxLines) ctx.fillText(line, x, y + lines * lineHeight);
}

function loadCanvasImage(src) {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

function downloadCanvas(canvas, filename) {
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob((blob) => {
        if (!blob) return reject(new Error("Canvas export failed"));
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        resolve();
      }, "image/png");
    } catch (error) {
      reject(error);
    }
  });
}

function scrollToSearchArea() {
  document.querySelector(".toolbar")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function scrollToFinishedSection() {
  document.querySelector("#completed")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function bindLatestFinishedHeading() {
  const heading = el.playingFinished?.querySelector(".achievement-subtitle");
  if (!heading) return;
  heading.setAttribute("role", "button");
  heading.tabIndex = 0;
  heading.title = "Go to Finished games";
  heading.addEventListener("click", scrollToFinishedSection);
  heading.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    scrollToFinishedSection();
  });
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
  slideHorizontalCarousel(el.playingList, direction);
}

function updatePlayingSliderControls() {
  const state = horizontalCarouselState(el.playingList);
  el.playingPrevButton.hidden = !state.overflow;
  el.playingNextButton.hidden = !state.overflow;
  el.playingPrevButton.disabled = state.atStart;
  el.playingNextButton.disabled = state.atEnd;
  el.playingSection.classList.toggle("playing-at-start", state.atStart);
  el.playingSection.classList.toggle("playing-at-end", state.atEnd);
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
  const cacheKey = achievementSettingsKey(state.settings);
  const forceRefresh = state.settings.forceCacheOnLoad === true;
  const cached = forceRefresh ? null : readAchievementCache(cacheKey);
  if (cached) {
    renderAchievements(cached.psn || {}, cached.steam || emptySteamActivity(), cached.xbox || emptyXboxActivity());
    render();
    return;
  }
  const psnRequest = (async () => {
    const params = achievementParams({ user: psnUser, schema: "3" }, forceRefresh);
    const response = await fetch(`/api/achievements?${params}`);
    return response.json();
  })();
  const [psnResult, steamResult, xboxResult] = await Promise.allSettled([psnRequest, fetchSteamActivity(forceRefresh), fetchXboxActivity(forceRefresh)]);
  const psnData = psnResult.status === "fulfilled"
    ? psnResult.value
    : { user: psnUser, achievements: [], sourceUrl: "https://www.playstation.com/", source: "psn", authError: true };
  const steamData = steamResult.status === "fulfilled" ? steamResult.value : emptySteamActivity();
  const xboxData = xboxResult.status === "fulfilled" ? xboxResult.value : emptyXboxActivity();
  writeAchievementCache(cacheKey, { psn: psnData, steam: steamData, xbox: xboxData });
  renderAchievements(
    psnData,
    steamData,
    xboxData
  );
  render();
}

async function fetchXboxActivity(forceRefresh = state.settings.forceCacheOnLoad === true) {
  const params = achievementParams({ schema: "2" }, forceRefresh);
  if (state.settings.microsoftUser) params.set("user", state.settings.microsoftUser);
  const response = await fetch(`/api/xbox-achievements?${params}`, { cache: "no-store" });
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

async function fetchSteamActivity(forceRefresh = state.settings.forceCacheOnLoad === true) {
  const steamUser = state.settings.steamUser || "";
  const steamGames = await fetchSteamAccountActivity(steamUser, forceRefresh);
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

async function fetchSteamAccountActivity(steamUser = state.settings.steamUser || "", forceRefresh = state.settings.forceCacheOnLoad === true) {
  const games = [];
  let cursor = 0;
  for (let page = 0; page < 20 && cursor !== null; page += 1) {
    const params = achievementParams({ activity: "1", cursor: String(cursor), limit: "20", debug: "1" }, forceRefresh);
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

function achievementParams(values = {}, forceRefresh = state.settings.forceCacheOnLoad === true) {
  const params = new URLSearchParams(values);
  if (forceRefresh) params.set("fresh", String(Date.now()));
  return params;
}

function achievementSettingsKey(settings = state.settings) {
  return [
    cleanPsnUser(settings.psnUser) || DEFAULT_SETTINGS.psnUser,
    cleanSteamUser(settings.steamUser),
    cleanMicrosoftUser(settings.microsoftUser),
  ].join("|");
}

function readAchievementCache(key) {
  try {
    const cached = JSON.parse(localStorage.getItem(ACHIEVEMENT_CACHE_KEY) || "{}");
    return cached?.key === key && cached.data ? cached.data : null;
  } catch {
    return null;
  }
}

function writeAchievementCache(key, data) {
  try {
    localStorage.setItem(ACHIEVEMENT_CACHE_KEY, JSON.stringify({ key, data, updatedAt: Date.now() }));
  } catch {
    // Achievement cache is only a load-time shortcut.
  }
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
  const params = achievementParams({ appId, debug: "1" });
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
  const panel = achievementPanelMarkup({ psn: { ...data, ...state.psnActivity }, steam: state.steamActivity, xbox: state.xboxActivity, trophyIconHtml: trophyIcon(), platformBadge, platformLogo, trophyTone, escape: escapeHtml });
  el.achievementPanel.innerHTML = panel.html;
  el.achievementPanel.querySelector("[data-action='platinums']")?.addEventListener("click", openPlatinumDialog);
  scheduleMobilePaintRefresh();
}

function openPlatinumDialog(year = null) {
  const platinums = platinumItems();
  const requestedYear = year == null ? "" : String(year);
  const years = requestedYear && requestedYear !== "all"
    ? unique([requestedYear, ...platinumYears(platinums)]).sort((a, b) => b.localeCompare(a))
    : platinumYears(platinums);
  if (year != null) state.platinumYear = String(year);
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
  syncStyledSelects(el.platinumDialog, { activeValue: null });
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
    cover: activityCoverOverride(item) || item.cover || localCoverForTitle(item.title, "card"),
    trophyIcon: item.trophyIcon || platformLogo("Steam"),
    trophyName: item.trophyName || "100% Achievements",
    platform: item.platform || "Steam",
  }));
  const xboxCompleted = (state.xboxActivity.completed || []).map((item) => {
    const localGame = localXboxGameForTitle(item.title);
    const cover = item.cover || (localGame?.cover ? coverDisplayUrl(localGame.cover, "card") : "") || platinumCoverFor(item);
    return {
      ...item,
      cover,
      trophyIcon: cover || item.trophyIcon || platformLogo("Xbox"),
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
  return activityCoverOverride(input) || MANUAL_PLATINUM_COVER_OVERRIDES.find((entry) => manualPlatinumEntryMatches(entry, normalized, input))?.cover || "";
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
  const exactMatch = (entry.exact || []).some((title) => normalized === normalizeTitleForMatch(title));
  if ((entry.exact || []).length) return exactMatch;
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

function loadPlatinumCoverCache() {
  try {
    const parsed = JSON.parse(localStorage.getItem(PLATINUM_COVER_CACHE_KEY) || "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed).filter(([key, value]) => key && typeof value === "string" && value && value !== "__missing"));
  } catch {
    return {};
  }
}

function savePlatinumCoverCache() {
  try {
    const covers = Object.fromEntries(Object.entries(state.platinumCoverCache).filter(([, value]) => value && value !== "__missing"));
    localStorage.setItem(PLATINUM_COVER_CACHE_KEY, JSON.stringify(covers));
  } catch {
    // Cover caching is an optional enhancement.
  }
}

async function hydratePlatinumCovers(platinums) {
  const missing = platinums
    .filter((item) => !localCoverForTitle(item.title) && !state.platinumCoverCache[normalizeTitleForMatch(item.title)])
    .slice(0, 64);
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
  savePlatinumCoverCache();
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
  const cover = activityCoverOverride(item) || item.cover || "";
  const artStyle = cover ? ` style="--platinum-art: url(&quot;${escapeHtml(cssUrl(cover))}&quot;)"` : "";
  const artClass = cover ? " has-platinum-art" : "";
  const coverPreview = cover
    ? `<img class="platinum-cover-preview" src="${escapeHtml(cover)}" alt="">`
    : "";
  const content = `
    ${cover ? `<span class="platinum-art-layer" aria-hidden="true"></span>` : ""}
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
    return completedCardMarkup({ title: item.title, cover, trophyIcon: item.trophyIcon, trophyName: item.trophyName || "Platinum", platform: item.platform, earnedAt: item.earnedAt, actionAttribute: `data-game-id="${escapeHtml(item.gameId)}"`, escape: escapeHtml, cssEscape: cssUrl });
  }
  if (item.url) {
    return `<a class="platinum-card${artClass}" href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer"${artStyle}>${content}</a>`;
  }
  return `<article class="platinum-card${artClass}"${artStyle}>${content}</article>`;
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
  const listedCompleted = state.games.filter((game) => !game.deletedAt && Boolean(game.completedAt));
  const completedThisYear = listedCompleted.filter((game) => completionYear(game) === currentYear).length;
  const markedCompleted = listedCompleted.filter((game) => game.platinum);
  const markedCompletedThisYear = markedCompleted.filter((game) => completionYear(game) === currentYear).length;
  const counts = {
    new: active.filter((game) => game.section === "new").length,
    wanted: active.filter((game) => game.section === "wanted").length,
    upcoming: active.filter((game) => game.section === "upcoming").length,
    backlog: active.filter((game) => game.section === "backlog").length,
    completed: listedCompleted.length,
  };
  el.stats.innerHTML = [
    stat(`Finished ${currentYear}`, completedThisYear, "done", {
      action: "completed",
      detail: completedStatDetail(currentYear, completedThisYear, counts.completed, markedCompletedThisYear),
    }),
    stat("Backlog", counts.backlog, "backlog", { detail: sectionStatDetail("backlog", active, total) }),
    stat("Upcoming", counts.upcoming, "release", { detail: sectionStatDetail("upcoming", active, total) }),
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
  const preorderSummary = preorderStoreSummary(sectionGames);
  const preordered = preorderSummary.reduce((sum, [, count]) => sum + count, 0);
  return `
    <div class="stat-detail">
      <span>${sectionGames.length} ${sectionGames.length === 1 ? "game" : "games"}</span>
      ${preordered ? preorderCountPill(preordered, preorderSummary) : ""}
      <b>Total ${total}</b>
    </div>
  `;
}

function completedStatDetail(year, yearCount, total, completedYearCount) {
  return `
    <div class="stat-detail">
      <span>${yearCount} ${yearCount === 1 ? "game" : "games"} in ${escapeHtml(year)}</span>
      ${completedYearCount ? `<span class="completed-year-count-pill">${completedYearCount} completed of ${yearCount} this year</span>` : ""}
      <b>Total ${total} finished ${total === 1 ? "game" : "games"}</b>
    </div>
  `;
}

function scrollToCompletedSection() {
  document.querySelector("#completed")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function sectionCountLabel(section, games, count) {
  const preorderSummary = preorderStoreSummary(games.filter((game) => game.section === section));
  const preordered = preorderSummary.reduce((sum, [, storeCount]) => sum + storeCount, 0);
  return [
    `${count} ${count === 1 ? "game" : "games"}`,
    preordered ? preorderCountPill(preordered, preorderSummary) : "",
  ].filter(Boolean).join("");
}

function preorderStoreSummary(games) {
  return topCounts(games.filter((game) => game.preorderStore), (game) => game.preorderStore);
}

function preorderCountPill(count, summary) {
  const rows = summary.map(([store, storeCount]) => `<span><strong>${escapeHtml(store)}</strong><em>${storeCount}</em></span>`).join("");
  const title = summary.map(([store, storeCount]) => `${store}: ${storeCount}`).join("\n");
  return `
    <span class="preorder-count-pill preorder-count-tooltip" tabindex="0" title="${escapeHtml(title)}">
      ${count} preordered
      <span class="preorder-store-list" role="tooltip">${rows}</span>
    </span>
  `;
}

function renderReleaseCalendar() {
  mountReleaseCalendar(el.releaseCalendar, {
    games: state.games,
    offset: state.releaseCalendarOffset,
    weekStart: state.settings.weekStart,
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
  el.releaseDialogTitle.textContent = formatLongDate(date);
  el.releaseDialogList.innerHTML = "";
  games.forEach((game) => el.releaseDialogList.appendChild(cardFor(game, { staticCard: true, includePastRelease: true, releaseDialog: true })));
  el.releaseDialog.showModal();
  syncScrollLock();
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
  const sections = mobileSections();
  const counts = mobileSectionCounts();
  if (!sections.includes(state.mobileSection)) state.mobileSection = sections[0] || "backlog";
  el.mobileTabs.forEach((button) => {
    const visible = sections.includes(button.dataset.mobileSection);
    button.hidden = !visible;
    const active = visible && button.dataset.mobileSection === state.mobileSection;
    button.classList.toggle("active", active);
    const label = mobileSectionLabel(button.dataset.mobileSection);
    const count = counts[button.dataset.mobileSection] || 0;
    button.innerHTML = `<span class="label">${escapeHtml(label)}</span>${button.dataset.mobileSection === "new" ? `<span class="count">${count}</span>` : ""}`;
  });
  const index = Math.max(0, sections.indexOf(state.mobileSection));
  const mobileTabs = document.querySelector(".mobile-section-tabs");
  mobileTabs?.style.setProperty("--mobile-tab-count", String(sections.length));
  mobileTabs?.style.setProperty("--mobile-tab-index", String(index));
  if (mobileTabs) {
    mobileTabs.style.gridTemplateColumns = sections.includes("new") && window.matchMedia("(max-width: 760px)").matches ? `minmax(34px, 42px) repeat(${Math.max(1, sections.length - 1)}, minmax(0, 1fr))` : "";
    requestAnimationFrame(syncMobileTabIndicator);
  }
  el.board.style.setProperty("--mobile-section-count", String(sections.length));
  el.board.style.setProperty("--mobile-section-index", String(index));
  el.board.querySelectorAll(".column").forEach((column) => {
    const columnIndex = sections.indexOf(column.id);
    column.classList.toggle("is-mobile-active", column.id === state.mobileSection);
    column.classList.toggle("is-mobile-pane", columnIndex >= 0);
    column.style.setProperty("--mobile-column-index", String(Math.max(0, columnIndex)));
    column.setAttribute("aria-hidden", String(columnIndex < 0 || column.id !== state.mobileSection));
  });
  document.body.dataset.mobileSection = state.mobileSection;
}

function syncMobileTabIndicator() {
  const tabs = document.querySelector(".mobile-section-tabs");
  const active = tabs?.querySelector("button.active:not([hidden])");
  if (!tabs || !active) return;
  const tabsRect = tabs.getBoundingClientRect();
  const activeRect = active.getBoundingClientRect();
  tabs.style.setProperty("--mobile-tab-left", `${Math.max(6, activeRect.left - tabsRect.left)}px`);
  tabs.style.setProperty("--mobile-tab-width", `${activeRect.width}px`);
}

function mobileSections() {
  return hasNewAdditions() ? ["new", "backlog", "upcoming", "wanted"] : ["backlog", "upcoming", "wanted"];
}

function mobileSectionCounts() {
  const games = filteredGames().filter((game) => !game.completedAt && !game.playing);
  return Object.fromEntries(mobileSections().map((section) => [section, games.filter((game) => game.section === section).length]));
}

function mobileSectionLabel(section) {
  return {
    new: "New additions",
    backlog: "Backlog",
    upcoming: "Upcoming",
    wanted: "Available",
  }[section] || section;
}

function hasNewAdditions() {
  return canSeeNewAdditions() && state.games.some((game) => !game.deletedAt && !game.completedAt && !game.playing && game.section === "new");
}

function canSeeNewAdditions() {
  return Boolean(state.canEdit);
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
  const sections = mobileSections();
  const index = sections.indexOf(state.mobileSection);
  const next = dx < 0 ? sections[index + 1] : sections[index - 1];
  if (!next) return;
  state.mobileSection = next;
  render();
}

function syncMobileSectionToResults() {
  const hasActiveFilter = Boolean(state.filters.query)
    || state.filters.platform !== "all"
    || state.filters.tag !== "all"
    || state.filters.preordered;
  if (!hasActiveFilter) return;
  const sections = state.filters.preordered ? mobileSections().filter((section) => section !== "new").sort((a, b) => ["upcoming", "backlog", "wanted"].indexOf(a) - ["upcoming", "backlog", "wanted"].indexOf(b)) : mobileSections();
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
  const platforms = orderedPlatforms(unique(active.map((game) => platformFilterGroup(game.platform)).filter(Boolean)));
  const genres = unique(active.flatMap((game) => game.genres || []));
  fillSelect(el.platformFilter, ["all", ...platforms], state.filters.platform, tt("All platforms"));
  fillSelect(el.tagFilter, ["all", ...genres], state.filters.tag, tt("All categories"));
  syncStyledSelect(el.platformFilter, { logos: true, activeValue: "all" });
  syncStyledSelect(el.tagFilter, { activeValue: "all" });
  syncStyledSelect(el.sortFilter, { activeValue: null });
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
    const label = value === "all" ? allLabel : (select === el.platformFilter ? platformFilterDisplayName(value) : platformDisplayName(value));
    return `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`;
  }).join("");
  select.value = values.includes(selected) ? selected : "all";
  updateSelectOverflowTitle(select);
}

function syncStyledSelect(select, options = {}) {
  if (!select) return;
  const useLogos = Boolean(options.logos);
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
    selected: option.selected,
    disabled: option.disabled || option.hidden,
  }));
  const visibleOptions = selectOptions.filter((option) => !option.disabled);
  const selected = selectOptions.find((option) => option.selected) || visibleOptions[0] || { value: "all", label: "All platforms" };
  control.classList.toggle("is-active", options.activeValue != null && selected.value !== options.activeValue);
  control.innerHTML = `
    <button class="platform-logo-button" type="button" aria-haspopup="listbox" aria-expanded="false" data-full-label="${escapeHtml(selected.label)}" aria-label="${escapeHtml(selected.label)}">
      ${platformLogoChoiceMarkup(selected.value, selected.label, { logos: useLogos })}
    </button>
    <div class="platform-logo-menu" role="listbox">
      ${visibleOptions.map((option) => `
        <button class="platform-logo-option ${option.selected ? "is-selected" : ""}" type="button" role="option" aria-selected="${option.selected ? "true" : "false"}" data-value="${escapeHtml(option.value)}" data-full-label="${escapeHtml(option.label)}">
          ${platformLogoChoiceMarkup(option.value, option.label, { logos: useLogos })}
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
  const cls = showLogo ? platformClass(value) : "platform-generic";
  return `
    <span class="platform-logo-choice ${escapeHtml(cls)}">
      ${showLogo ? `<span class="platform-logo-choice-icon"><img src="${escapeHtml(platformLogo(value))}" alt="" width="18" height="18" decoding="async"></span>` : ""}
      <span class="platform-logo-choice-label">${escapeHtml(label)}</span>
    </span>
  `;
}

function platformFilterDisplayName(value) {
  return platformDisplayName(value);
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

function showToast(message, tone = "info") {
  if (!message) return;
  const host = [...document.querySelectorAll("dialog[open]")].at(-1) || document.body;
  let toast = document.querySelector(".toast-notification");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "toast-notification";
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
  }
  if (toast.parentElement !== host) host.appendChild(toast);
  window.clearTimeout(showToast.timer);
  toast.textContent = message;
  toast.classList.toggle("is-error", tone === "error");
  toast.classList.remove("visible");
  requestAnimationFrame(() => toast.classList.add("visible"));
  showToast.timer = window.setTimeout(() => toast.classList.remove("visible"), tone === "error" ? 4200 : 2800);
}

function renderSection(section) {
  const list = document.querySelector(`.card-list[data-section="${section}"]`);
  const column = document.querySelector(`#${CSS.escape(section)}`);
  if (!list) return;
  const games = filteredGames().filter((game) => game.section === section && !game.completedAt && !game.playing);
  if (column && section === "new") column.hidden = !canSeeNewAdditions() || !games.length;
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
  if (manualDragEnabled()) setupDrag(list);
}

function manualDragEnabled() {
  return state.canEdit
    && state.filters.sort === "custom"
    && !state.filters.query
    && state.filters.platform === "all"
    && state.filters.tag === "all"
    && !state.filters.preordered;
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
  const showRowPrices = !["backlog", "new"].includes(section) && priceProvidersForGame(game).length;
  row.className = "game-row";
  row.classList.toggle("new-addition-row", section === "new");
  row.dataset.id = game.id;
  row.dataset.owner = statuses.join(" ");
  row.draggable = manualDragEnabled();
  row.setAttribute("role", "button");
  row.tabIndex = 0;
  row.setAttribute("aria-label", `Open ${game.title}`);
  applyOwnerCardClasses(row, owners);
  row.classList.toggle("digital-card", Boolean(game.digital));
  row.classList.toggle("stream-card", Boolean(game.stream));
  row.innerHTML = `
    <span class="game-row-cover-wrap" ${game.cover ? "" : "hidden"}>
      <img class="game-row-cover" src="${escapeHtml(game.cover ? coverDisplayUrl(game.cover, "tiny") : "")}" alt="" loading="${escapeHtml(options.imagePriority || "lazy")}" decoding="async">
      <img class="game-row-cover-preview" src="${escapeHtml(game.cover ? coverDisplayUrl(game.cover, "card") : "")}" alt="" loading="lazy" decoding="async" aria-hidden="true">
    </span>
    <div class="game-row-identity">
      <strong class="${game.platinum ? "completed-achievements-title" : ""} ${ownerTitleClasses(owners)}" tabindex="0">${escapeHtml(game.title)}</strong>
      <span class="game-row-owner-line">${visibleOwnerTags(game).map(ownerBadge).join("")}</span>
      ${studioText(game) ? `<span>${escapeHtml(studioText(game))}</span>` : ""}
    </div>
    <div class="game-row-core">${rowCoreStats(game)}</div>
    <div class="game-row-tags">${rowTags(game).join("")}</div>
    ${showRowPrices ? `<div class="game-row-prices">${rowPrices(game)}</div>` : ""}
    <div class="game-row-actions">
      <div class="game-row-actions-top">
        <button class="icon-button row-edit-action" type="button" title="Edit" aria-label="Edit">${pencilIcon()}</button>
        <button class="danger-button icon-only-button row-delete-action" type="button" title="Delete" aria-label="Delete">${trashIcon()}</button>
      </div>
      <div class="game-row-actions-bottom">
      ${rowPrimaryAction(game, section)}
      </div>
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
  row.querySelector(".row-edit-action")?.addEventListener("click", () => openEditor(game.id));
  row.querySelector(".row-primary-action")?.addEventListener("click", () => {
    if (section === "backlog" || section === "new") startPlaying(game.id);
    else moveToBacklog(game.id);
  });
  row.querySelector(".row-setup-action")?.addEventListener("click", () => finishSetupGame(game.id));
  row.querySelector(".row-delete-action")?.addEventListener("click", () => deleteGame(game.id));
  return row;
}

function rowPrimaryAction(game, section) {
  if (section === "backlog") return `<button class="primary-button row-primary-action" type="button">Play</button>`;
  if (section === "new") {
    return `<button class="primary-button row-primary-action" type="button">Play</button><button class="ghost-button row-setup-action" type="button">Finish setup</button>`;
  }
  return `<button class="ghost-button row-primary-action" type="button">Got it</button>`;
}

function rowCoreStats(game) {
  const progress = achievementProgressForGame(game);
  const release = releaseStatus(game);
  return [
    game.platform ? platformBadge(game.platform, null, { title: game.title }) : "",
    game.digital ? `<span class="digital-pill">Digital</span>` : "",
    game.emulator ? `<span class="emulator-pill">Emulator</span>` : "",
    game.lengthHours ? timeBadge(game.lengthHours, hltbUrlFor(game)) : "",
    game.stream ? `<span class="stream-pill">Stream</span>` : "",
    release ? releaseStatusPill(release) : "",
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
  if (el.completedStatsButton) {
    el.completedStatsButton.hidden = !filteredGames({ applyPreorder: false }).some((game) => game.completedAt);
    el.completedStatsButton.innerHTML = graphIcon();
  }
  const filteredFinishedGames = filteredGames({ applyPreorder: false }).filter((game) => game.completedAt);
  const visibleFinishedGames = filteredFinishedGames.filter((game) => state.completedYear === "all" || completionYear(game) === state.completedYear);
  const games = sortedCompletedGames(visibleFinishedGames);
  const pageSize = completedPageSize();
  const shownGames = games.slice(0, pageSize * state.completedVisiblePages);
  const hasMore = games.length > shownGames.length;
  list.classList.toggle("is-collapsed", hasMore);
  updateCompletedCount(completedCountForSelectedYear());
  list.innerHTML = shownGames.length ? shownGames.map((game) => `
    <div class="completed-row ${game.stream ? "stream-card" : ""} ${game.platinum ? "completed-trophy-card" : ""} ${ownerCardClass(game)}" data-id="${escapeHtml(game.id)}" role="button" tabindex="0" aria-label="${escapeHtml(`Open ${game.title}`)}">
      <img class="completed-cover" src="${escapeHtml(game.cover || "")}" alt="" loading="lazy" decoding="async" ${game.cover ? "" : "hidden"}>
      <div class="completed-main">
        <strong class="${game.platinum ? "completed-achievements-title" : ""}">${escapeHtml(game.title)}</strong>
        <span class="completed-platform">${completedOwnerBadges(game)}${completedBadges(game)}</span>
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
  syncStyledSelect(el.completedYearFilter, { activeValue: null });
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
    el.footerVersion.textContent = siteVersion.version
      ? `${siteVersion.version} · Updated ${formatFooterDateTime(siteVersion.updatedAt)}`
      : "Version -";
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

function openFinishedStatsDialog(year = "all") {
  const scope = finishedStatsScope(year);
  const games = finishedStatsGames(scope);
  const completed = finishedStatsCompleted(scope);
  el.finishedStatsTitle.textContent = scope === "all" ? "Finished games" : `Finished games ${scope}`;
  el.finishedStatsBody.innerHTML = finishedStatsMarkup(scope, games, completed);
  el.finishedStatsBody.querySelector("[data-stats-action='completed']")?.addEventListener("click", () => {
    el.finishedStatsDialog.close();
    openPlatinumDialog(scope);
  });
  bindFinishedStatsMobileOverlays();
  el.finishedStatsDialog.showModal();
  syncScrollLock();
}

function finishedStatsScope(year = "all") {
  const value = String(year || "all");
  const years = completedYears();
  return value === "all" && years.length === 1 ? years[0] : value;
}

function finishedStatsGames(year = "all") {
  return state.games
    .filter((game) => !game.deletedAt && game.completedAt && (year === "all" || completionYear(game) === String(year)));
}

function finishedStatsCompleted(year = "all") {
  return platinumItems()
    .filter((item) => year === "all" || completedStatsYearFor(item) === String(year));
}

function completedStatsYearFor(item) {
  const localGame = item.gameId ? state.games.find((game) => game.id === item.gameId && !game.deletedAt) : null;
  return localGame?.completedAt ? completionYear(localGame) : platinumYearFor(item);
}

function finishedStatsMarkup(year, games, completed) {
  const platforms = countBy(games, (game) => canonicalPlatform(game.platform) || game.platform || "Unknown");
  const tags = countTags(games);
  const timeBuckets = countApproximatePlaytimeBuckets(games);
  const months = countBy(games, (game) => monthShortName(game.completedAt));
  const streamed = games.filter((game) => game.stream);
  const otherOwnerGames = games.filter((game) => visibleOwnerTags(game).length);
  const otherOwnerSummary = statsOtherOwnerSummary(otherOwnerGames);
  const allYears = year === "all";
  const showYearlyDetail = !allYears;
  const cards = [
    statsKpiCard("Finished games", games.length, showYearlyDetail ? statsGameList(games) : "", { tone: "finished" }),
    statsKpiCard("Completed games", completed.length, showYearlyDetail ? statsCompletedGameList(completed) : "", { action: "completed", tone: "completed", icon: trophyIcon() }),
    streamed.length ? statsKpiCard("Streamed games", streamed.length, showYearlyDetail ? statsGameList(streamed) : "", { tone: "streamed" }) : "",
    otherOwnerGames.length ? statsKpiCard(otherOwnerSummary.label, otherOwnerGames.length, statsOwnerBreakdown(otherOwnerGames), { tone: "owners", valueClass: otherOwnerSummary.valueClass }) : "",
  ].filter(Boolean).join("");
  return `
    <div class="finished-stats-kpis">${cards}</div>
    <div class="finished-stats-charts">
      ${statsDonutCard("Platforms", platforms, "platform", 5)}
      ${statsDonutCard("Tags", tags, "category", 5)}
      ${statsDonutCard("Aproximate playtime", timeBuckets, "time", 5)}
    </div>
    <section class="finished-stats-months">
      <h3>${allYears ? "By year" : "By month"}</h3>
      <div class="finished-stats-period-grid ${allYears ? "is-yearly" : ""}">${allYears ? statsYearBars(games) : statsMonthBars(games, months, games.length)}</div>
    </section>
    ${games.length ? "" : `<div class="empty">No finished games${year === "all" ? "" : ` in ${escapeHtml(year)}`}.</div>`}
  `;
}

function statsKpiCard(label, value, detail = "", options = {}) {
  return `
    <button class="finished-stats-kpi ${options.action ? "is-clickable" : ""} ${options.tone ? `is-${escapeHtml(options.tone)}` : ""}" type="button" ${options.action ? `data-stats-action="${escapeHtml(options.action)}"` : ""} ${detail && !options.action ? `data-stats-overlay-title="${escapeHtml(label)}"` : ""}>
      <strong class="${options.valueClass ? escapeHtml(options.valueClass) : ""}">${options.icon || ""}${escapeHtml(String(value))}</strong>
      <span>${escapeHtml(label)}</span>
      ${detail ? `<span class="finished-stats-breakdown">${detail}</span>` : ""}
    </button>
  `;
}

function statsDonutCard(title, counts, tone, visibleLimit = counts.length) {
  const visibleCounts = counts.slice(0, visibleLimit);
  const hasMore = counts.length > visibleCounts.length;
  return `
    <article class="finished-stats-chart">
      <h3>${escapeHtml(title)}</h3>
      <div class="finished-stats-donut ${tone === "category" ? "is-category" : "is-platform"}">${statsPieMarkup(counts, tone)}</div>
      <div class="finished-stats-chart-copy">
        <div class="finished-stats-chart-list" data-stats-overlay-title="${escapeHtml(title)}">${statsBreakdownList(visibleCounts, tone)}${hasMore ? `<span class="finished-stats-more-row" aria-hidden="true">...</span>` : ""}<div class="finished-stats-breakdown">${statsBreakdownList(counts, tone)}</div></div>
      </div>
    </article>
  `;
}

function statsPieMarkup(counts, tone) {
  const total = counts.reduce((sum, item) => sum + item.count, 0);
  if (!total) return `<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="46" fill="rgba(255,255,255,.08)"></circle></svg>`;
  let cursor = 0;
  const segments = counts.map((item, index) => {
    const start = cursor;
    cursor += (item.count / total) * 360;
    const color = statsSegmentColor(item.label, tone, index);
    return statsPieSegmentData(item, start, cursor, color, total, index, tone);
  });
  const tipCss = segments.map((_, index) => `
    .finished-stats-donut:has(.finished-stats-pie-segment-${index}:hover) .finished-stats-pie-shape,
    .finished-stats-donut:has(.finished-stats-pie-segment-${index}:focus-visible) .finished-stats-pie-shape {
      filter: saturate(0.42) brightness(0.72);
      opacity: 0.5;
    }
    .finished-stats-donut:has(.finished-stats-pie-segment-${index}:hover) .finished-stats-pie-segment-${index} .finished-stats-pie-shape,
    .finished-stats-donut:has(.finished-stats-pie-segment-${index}:focus-visible) .finished-stats-pie-segment-${index} .finished-stats-pie-shape {
      filter: brightness(1.18) saturate(1.12);
      opacity: 0.98;
      transform: scale(1.025);
    }
    .finished-stats-donut:has(.finished-stats-pie-segment-${index}:hover) .finished-stats-segment-tip-${index},
    .finished-stats-donut:has(.finished-stats-pie-segment-${index}:focus-visible) .finished-stats-segment-tip-${index} {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1);
    }
  `).join("");
  return `<svg viewBox="0 0 100 100" role="img" aria-label="Stats breakdown">${segments.map((segment) => segment.shape).join("")}</svg><div class="finished-stats-pie-tips">${segments.map((segment) => segment.tip).join("")}</div><style>${tipCss}</style>`;
}

function statsPieSegmentData(item, startDeg, endDeg, color, total, index, tone) {
  const sweep = Math.max(0.01, endDeg - startDeg);
  const start = polarPoint(50, 50, 46, startDeg - 90);
  const end = polarPoint(50, 50, 46, endDeg - 90);
  const mid = polarPoint(50, 50, 34, startDeg + sweep / 2 - 90);
  const percent = total ? Math.round((item.count / total) * 100) : 0;
  const left = clampNumber(mid.x, 16, 84);
  const top = clampNumber(mid.y, 14, 86);
  const shape = sweep >= 359.99
    ? `<circle class="finished-stats-pie-shape" cx="50" cy="50" r="46" fill="${escapeHtml(color)}"></circle>`
    : `<path class="finished-stats-pie-shape" d="M 50 50 L ${start.x.toFixed(3)} ${start.y.toFixed(3)} A 46 46 0 ${sweep > 180 ? 1 : 0} 1 ${end.x.toFixed(3)} ${end.y.toFixed(3)} Z" fill="${escapeHtml(color)}"></path>`;
  const label = tone === "platform" ? platformBadge(item.label) : `<b>${escapeHtml(item.label)}</b>`;
  return {
    shape: `<g class="finished-stats-pie-segment finished-stats-pie-segment-${index}" style="--slice-opacity:${index % 2 ? 0.78 : 0.96}" tabindex="0">${shape}</g>`,
    tip: `<div class="finished-stats-segment-tip finished-stats-segment-tip-${index}" style="--tip-x:${left.toFixed(2)}%;--tip-y:${top.toFixed(2)}%"><span class="finished-stats-segment-percent">${percent}%</span>${label}<span class="finished-stats-segment-count">${escapeHtml(String(item.count))}</span></div>`,
  };
}

function polarPoint(cx, cy, radius, angleDeg) {
  const radians = angleDeg * Math.PI / 180;
  return {
    x: cx + radius * Math.cos(radians),
    y: cy + radius * Math.sin(radians),
  };
}

function clampNumber(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function statsMonthBars(games, counts) {
  const order = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const byLabel = new Map(counts.map((item) => [item.label, item.count]));
  const max = Math.max(1, ...counts.map((item) => item.count));
  return order.map((label) => {
    const count = byLabel.get(label) || 0;
    const monthGames = games
      .filter((game) => monthShortName(game.completedAt) === label)
      .sort((a, b) => String(a.completedAt || "").localeCompare(String(b.completedAt || "")) || stringCompare(a.title, b.title));
    return `<div class="finished-stats-month" title="${escapeHtml(`${label}: ${count}`)}" ${count ? `data-stats-overlay-title="${escapeHtml(label)}"` : ""}><span>${escapeHtml(label)}</span><em style="--month:${count / max};--platform-bar:${statsPlatformBar(monthGames)}"></em><strong>${count}</strong>${count ? `<span class="finished-stats-breakdown">${statsGameList(monthGames)}</span>` : ""}</div>`;
  }).join("");
}

function statsYearBars(games) {
  const counts = countBy(games, completionYear);
  const max = Math.max(1, ...counts.map((item) => item.count));
  return counts
    .sort((a, b) => b.label.localeCompare(a.label))
    .map(({ label, count }) => {
      const yearGames = games
        .filter((game) => completionYear(game) === label)
        .sort((a, b) => String(a.completedAt || "").localeCompare(String(b.completedAt || "")) || stringCompare(a.title, b.title));
      return `<div class="finished-stats-month finished-stats-year" title="${escapeHtml(`${label}: ${count}`)}" ${count ? `data-stats-overlay-title="${escapeHtml(label)}"` : ""}><span>${escapeHtml(label)}</span><em style="--month:${count / max};--platform-bar:${statsPlatformBar(yearGames)}"></em><strong>${count}</strong>${count ? `<span class="finished-stats-breakdown">${statsGameList(yearGames)}</span>` : ""}</div>`;
    })
    .join("");
}

function statsBreakdownList(counts, tone = "") {
  return counts.length
    ? counts.map((item, index) => statsBreakdownRow(item, tone, index)).join("")
    : `<span><b>None</b><em>0</em></span>`;
}

function statsBreakdownRow(item, tone, index) {
  if (tone === "platform") {
    return `<span class="finished-stats-platform-row"><b>${platformBadge(item.label)}</b><em>${item.count}</em></span>`;
  }
  if (tone === "category" || tone === "time") {
    const color = statsSegmentColor(item.label, tone, index);
    return `<span class="finished-stats-category-row" style="--category-stat-color:${escapeHtml(color)}"><b><i></i>${escapeHtml(item.label)}</b><em>${item.count}</em></span>`;
  }
  if (tone === "owner") {
    return `<span class="finished-stats-owner-row"><b>${ownerBadge(item.label)}</b><em>${item.count}</em></span>`;
  }
  return `<span><b>${escapeHtml(item.label)}</b><em>${item.count}</em></span>`;
}

function statsGameList(games) {
  return games.map((game) => {
    const progress = achievementProgressForGame(game);
    return `<span class="finished-stats-game-row"><b>${escapeHtml(game.title)}</b>${game.platform ? platformBadge(game.platform) : ""}${progress ? psnProgressBadge(progress, { className: "finished-stats-progress-pill" }) : ""}</span>`;
  }).join("");
}

function statsPlatformBar(games) {
  if (!games.length) return "color-mix(in srgb, var(--accent) 58%, rgba(255, 255, 255, 0.26))";
  const counts = countBy(games, (game) => canonicalPlatform(game.platform) || game.platform || "Unknown");
  const total = counts.reduce((sum, item) => sum + item.count, 0);
  let cursor = 0;
  return `linear-gradient(to top, ${counts.map((item, index) => {
    const start = cursor;
    cursor += (item.count / total) * 100;
    return `${platformStatsColor(item.label, index)} ${start.toFixed(2)}% ${cursor.toFixed(2)}%`;
  }).join(", ")})`;
}

function bindFinishedStatsMobileOverlays() {
  el.finishedStatsBody.querySelectorAll("[data-stats-overlay-title]").forEach((node) => {
    node.addEventListener("click", (event) => {
      if (!window.matchMedia("(max-width: 760px)").matches) return;
      if (event.target.closest(".finished-stats-breakdown")) return;
      const breakdown = node.querySelector(".finished-stats-breakdown");
      if (!breakdown?.innerHTML.trim()) return;
      event.preventDefault();
      event.stopPropagation();
      openFinishedStatsMiniOverlay(node.dataset.statsOverlayTitle || "Stats", breakdown.innerHTML);
    });
  });
}

function openFinishedStatsMiniOverlay(title, content) {
  let overlay = el.finishedStatsDialog.querySelector(".finished-stats-mini-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.className = "finished-stats-mini-overlay";
    el.finishedStatsDialog.querySelector(".finished-stats-modal")?.appendChild(overlay);
  }
  overlay.innerHTML = `
    <div class="finished-stats-mini-panel">
      <div class="finished-stats-mini-head">
        <strong>${escapeHtml(title)}</strong>
        <button class="icon-button" type="button" data-stats-mini-close title="Close" aria-label="Close">×</button>
      </div>
      <div class="finished-stats-mini-list">${content}</div>
    </div>
  `;
  overlay.hidden = false;
  overlay.querySelector("[data-stats-mini-close]")?.addEventListener("click", () => {
    overlay.hidden = true;
  });
  overlay.onclick = (event) => {
    if (event.target === overlay) overlay.hidden = true;
  };
}

function statsCompletedGameList(items) {
  return statsGameList(items.map((item) => ({
    title: item.title,
    platform: item.platform || platinumPlatformFor(item),
  })));
}

function statsOwnerBreakdown(games) {
  return statsBreakdownList(countBy(games.flatMap((game) => visibleOwnerTags(game).map((owner) => ({ owner }))), (item) => item.owner), "owner");
}

function statsOtherOwnerSummary(games) {
  const owners = countBy(games.flatMap((game) => visibleOwnerTags(game).map((owner) => ({ owner }))), (item) => item.owner);
  if (owners.length !== 1) return { label: "Other owners", valueClass: "" };
  const owner = owners[0].label;
  return { label: `games from ${owner}`, valueClass: ownerColorClass(owner) };
}

function countBy(items, getter) {
  const map = new Map();
  items.forEach((item) => {
    const label = String(getter(item) || "Unknown").trim() || "Unknown";
    map.set(label, (map.get(label) || 0) + 1);
  });
  return [...map.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || stringCompare(a.label, b.label));
}

function countTags(games) {
  const items = games.flatMap((game) => gameStatsTags(game).map((label) => ({ label })));
  return countBy(items, (item) => item.label);
}

function countApproximatePlaytimeBuckets(games) {
  const bucketMap = new Map();
  let noPlaytime = 0;
  games.forEach((game) => {
    const hours = Number(game.lengthHours);
    if (!Number.isFinite(hours) || hours <= 0) {
      noPlaytime += 1;
      return;
    }
    const start = Math.floor(hours / 10) * 10;
    const label = start === 0 ? "<10" : `${start}-${start + 10}`;
    bucketMap.set(label, (bucketMap.get(label) || 0) + 1);
  });
  const buckets = [...bucketMap.entries()]
    .map(([label, count]) => ({ label, count, order: label === "<10" ? 0 : Number(label.split("-")[0]) }))
    .sort((a, b) => a.order - b.order)
    .map(({ label, count }) => ({ label, count }));
  if (noPlaytime) buckets.push({ label: "No HLTB time", count: noPlaytime });
  return buckets;
}

function gameStatsTags(game) {
  const tags = [...(game.genres || []), ...(game.tags || [])]
    .map((value) => String(value || "").trim())
    .filter((value) => value && normalizeTag(value) !== "game");
  return unique(tags).length ? unique(tags) : ["Uncategorized"];
}

function monthShortName(value) {
  const date = new Date(`${dateOnly(value)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? "Unknown" : new Intl.DateTimeFormat("en-US", { month: "short" }).format(date);
}

function categoryStatsColor(index) {
  const shade = Math.max(76, 202 - index * 22);
  return `rgb(${shade} ${shade} ${shade})`;
}

function timeStatsColor(index) {
  return ["#79f2ce", "#7cc7ff", "#aa8bff", "#f2d06b", "#ff9ed2", "#ff7a8a", "#9ba6bd"][index % 7];
}

function statsSegmentColor(label, tone, index = 0) {
  if (tone === "platform") return platformStatsColor(label, index);
  if (tone === "time") return timeStatsColor(index);
  return categoryStatsColor(index);
}

function platformStatsColor(platform, index = 0) {
  const value = normalizeSearchText(platform);
  if (value.includes("switch") || value.includes("nintendo")) return "rgba(255, 59, 69, 0.13)";
  if (value === "ps5") return "#ffffff";
  if (value === "ps1") return "rgba(142, 148, 160, 0.18)";
  if (value === "ps3" || value === "psp") return "rgba(5, 7, 11, 0.82)";
  if (value.includes("playstation") || /\bps/.test(value)) return "rgb(111 120 255 / 22%)";
  if (value.includes("xbox 360") || value === "x360") return "rgba(98, 212, 112, 0.14)";
  if (value === "xbox") return "rgba(5, 7, 11, 0.82)";
  if (value.includes("xbox") || value.includes("microsoft") || value === "xone") return "rgba(98, 212, 112, 0.14)";
  if (value.includes("wiiu")) return "rgba(155, 215, 255, 0.14)";
  if (value.includes("3ds") || value.includes("gbc")) return "rgba(255, 90, 102, 0.14)";
  if (value.includes("n64")) return "rgba(52, 154, 76, 0.28)";
  if (value.includes("gamecube") || value.includes("snes") || value.includes("gba")) return "rgba(150, 112, 255, 0.16)";
  if (value.includes("sega") || value.includes("game gear")) return "rgba(42, 112, 224, 0.18)";
  if (value.includes("dreamcast")) return "rgba(255, 132, 45, 0.15)";
  if (value.includes("wii") || value.includes("nes") || value.includes("gb")) return "rgba(217, 221, 230, 0.12)";
  return ["rgba(255, 255, 255, 0.07)", "rgba(170, 139, 255, 0.16)", "rgba(242, 208, 107, 0.16)", "rgba(255, 158, 210, 0.16)"][index % 4];
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
    if (game.section === "new" && !canSeeNewAdditions()) return false;
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
    ].join(" ");
    const tagText = [...(game.genres || []), ...gameStatuses(game), canonicalStatus(game.preorderStore), canonicalStatus(game.preferredStore)].filter(Boolean);
    return (!state.filters.query || normalizeSearchText(haystack).includes(state.filters.query))
      && (state.filters.platform === "all" || platformFilterGroup(game.platform) === state.filters.platform)
      && (state.filters.tag === "all" || tagText.includes(state.filters.tag))
      && (!applyPreorder || !state.filters.preordered || Boolean(game.preorderStore));
  });
}

function cardFor(game, options = {}) {
  const releaseDialog = Boolean(options.releaseDialog);
  const neutralReleaseCard = releaseDialog && Boolean(game.playing);
  const card = createGameCardShell(document);
  const statuses = gameStatuses(game);
  const owners = ownerTags(game);
  card.dataset.id = game.id;
  card.dataset.owner = statuses.join(" ");
  card.draggable = !options.staticCard && manualDragEnabled() && ["backlog", "upcoming", "wanted"].includes(game.section);
  applyOwnerCardClasses(card, owners);
  card.classList.toggle("digital-card", Boolean(game.digital));
  card.classList.toggle("playing-card", Boolean(game.playing) && !neutralReleaseCard);
  card.classList.toggle("stream-card", Boolean(game.stream));
  card.classList.toggle("completed-trophy-card", Boolean(game.platinum));
  const trailer = card.querySelector(".card-trailer");
  const trailerUrl = !neutralReleaseCard && shouldShowCardTrailer(game) ? trailerEmbedUrl(game.trailerUrl) : "";
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
  if (game.playing && !neutralReleaseCard && game.cover) upgradeCoverIfFast(img, game.cover, "playing");
  if (game.playing && !neutralReleaseCard && game.cover) img.addEventListener("load", schedulePlayingCardHeightSync, { once: true });
  card.classList.toggle("has-art", Boolean(game.cover));
  if (game.cover) {
    card.style.setProperty("--card-art", `url("${cssUrl(backgroundCoverUrl(game.cover))}")`);
    bindActivityCardParallax(card);
  }
  card.querySelector("h3").textContent = game.title;
  card.querySelector("h3").className = `${card.querySelector("h3").className.replace(/\bowner-[\w-]+/g, "").trim()} ${ownerTitleClasses(owners)}`.trim();
  card.querySelector("h3").classList.toggle("completed-achievements-title", Boolean(game.platinum));
  const titleOwners = card.querySelector(".title-owners");
  titleOwners.innerHTML = visibleOwnerTags(game).map(ownerBadge).join("");
  titleOwners.hidden = !titleOwners.innerHTML;
  const studioLine = card.querySelector(".studio-line");
  studioLine.textContent = studioText(game);
  studioLine.hidden = !studioLine.textContent;
  card.querySelector(".meta").innerHTML = metaFor(game, { includePsn: neutralReleaseCard || !game.playing }).join("");
  const playDates = card.querySelector(".play-dates");
  playDates.innerHTML = playDatesFor(game, { includePastRelease: Boolean(options.includePastRelease), includeRelease: !releaseDialog }).join("");
  playDates.hidden = !playDates.innerHTML;
  card.querySelector(".chips").innerHTML = cardChipsFor(game).join("");
  const trophyStrip = card.querySelector(".card-trophies");
  trophyStrip.innerHTML = game.playing && !releaseDialog ? cardTrophiesFor(game) : "";
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
  if (neutralReleaseCard) {
    card.querySelector(".edit-action")?.remove();
    card.querySelector(".card-actions")?.remove();
    prices.remove();
  } else if (game.section === "new") {
    card.querySelector(".edit-action").remove();
    prices.remove();
    priceRefreshAction.remove();
    backlogAction.remove();
    trophyAction.remove();
    boughtAction.textContent = "Finish setup";
    boughtAction.addEventListener("click", () => finishSetupGame(game.id));
    completeAction.innerHTML = `<span class="action-label">Play</span>`;
    completeAction.addEventListener("click", () => startPlaying(game.id));
  } else if (game.section === "backlog" || game.completedAt) {
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
  card.querySelector(".edit-action")?.addEventListener("click", () => openEditor(game.id));
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
  card.querySelector(".delete-action")?.addEventListener("click", () => deleteGame(game.id));
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
  return activityTrailerFrameMarkup(url, escapeHtml);
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
    iframe.addEventListener("load", (event) => {
      if (!card.classList.contains("trailer-paused") && !card.classList.contains("trailer-user-paused")) {
        commandTrailer(event.currentTarget, "playVideo");
      }
    }, { once: true });
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
  return activityTrailerUrl(value, window.location.origin);
}

function openDetail(id, options = {}) {
  const game = getGame(id);
  if (!game) return;
  pauseAllPlayingTrailers();
  state.detailReturnToHistory = Boolean(options.returnToHistory);
  const owners = ownerTags(game);
  el.detailTitle.textContent = game.title;
  el.detailTitle.className = `${el.detailTitle.className.replace(/\bowner-[\w-]+/g, "").trim()} ${ownerTitleClasses(owners)}`.trim();
  el.detailStudio.textContent = studioText(game);
  el.detailStudio.hidden = !el.detailStudio.textContent;
  el.detailMeta.innerHTML = metaFor(game, { includePsn: false, includeOwners: false }).join("");
  el.detailDates.innerHTML = playDatesFor(game, { includePastRelease: true }).join("");
  el.detailDates.hidden = !el.detailDates.innerHTML;
  el.detailChips.innerHTML = `${visibleOwnerTags(game).map(ownerBadge).join("")}${chipsFor(game).join("")}`;
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
    const params = achievementParams({
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
    <article class="detail-trophy-card trophy-${escapeHtml(state.detailTrophyProvider === "steam" ? "steam" : trophyTone(trophy.type))} ${trophy.earned ? "earned" : "missing"}">
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
  if (game.platform) values.push(platformBadge(game.platform, null, { title: game.title }));
  if (game.digital) values.push(`<span class="digital-pill">Digital</span>`);
  if (game.emulator) values.push(`<span class="emulator-pill">Emulator</span>`);
  if (game.lengthHours) values.push(timeBadge(game.lengthHours, hltbUrlFor(game)));
  if (game.stream) values.push(`<span class="stream-pill">Stream</span>`);
  gameStatuses(game).forEach((status) => values.push(statusBadge(status)));
  const progress = achievementProgressForGame(game);
  if (options.includePsn !== false && progress) values.push(psnProgressBadge(progress));
  if (game.coop) values.push(`<span class="coop-pill">Coop</span>`);
  if (game.replayCount) values.push(replayBadge(game.replayCount));
  return values;
}

function releaseStatusPill(value) {
  const text = String(value || "").trim();
  const match = text.match(/^(Released|Releases)\s+(.+)$/i);
  if (!match) return `<span class="release-pill">${escapeHtml(text)}</span>`;
  const label = match[1].toLowerCase() === "released" ? "Released" : "Releases";
  const date = formatShortDate(match[2]) || match[2];
  return `<span class="release-pill history-date-pill"><small>${label}</small><strong>${escapeHtml(date)}</strong></span>`;
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
  const params = achievementParams({ titleId: xboxGame.titleId });
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
  if (!activityAllowsPsnCardTrophies(game.platform)) return "";
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
    <div class="card-trophy-head">${trophyIcon()}<span>Trophies</span>${psn ? psnProgressBadge(psn, { includeIcon: false, className: "card-trophy-progress" }) : ""}</div>
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
    const heading = progress ? `<div class="card-trophy-head">${trophyIcon()}<span>Achievements</span>${psnProgressBadge(progress, { includeIcon: false, className: "card-trophy-progress" })}</div>` : "";
    return `${heading}${guideLinks.length ? `<div class="guide-links card-guide-row">${guideLinks.join("")}</div>` : ""}`;
  }
  return `
    <div class="card-trophy-head">${trophyIcon()}<span>Achievements</span>${progress ? psnProgressBadge(progress, { includeIcon: false, className: "card-trophy-progress" }) : ""}</div>
    ${guideLinks.length ? `<div class="guide-links card-guide-row">${guideLinks.join("")}</div>` : ""}
    <div class="card-trophy-list">
      ${achievements.map((achievement) => `
        <a class="card-trophy trophy-steam" href="${escapeHtml(game.storeLinks?.steam || hltbUrlFor(game) || "#")}" target="_blank" rel="noreferrer" title="${escapeHtml([achievement.title, achievement.earnedAt].filter(Boolean).join(" · "))}">
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
    ? `<div class="card-trophy-head">${trophyIcon()}<span>Achievements</span>${psnProgressBadge(progress, { includeIcon: false, className: "card-trophy-progress" })}</div>`
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
    const params = achievementParams({
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
    game.platform ? platformBadge(game.platform, null, { title: game.title }) : "",
    game.digital ? `<span class="digital-pill">Digital</span>` : "",
    game.emulator ? `<span class="emulator-pill">Emulator</span>` : "",
    game.coop ? `<span class="coop-pill">Coop</span>` : "",
    game.stream ? `<span class="stream-pill">Stream</span>` : "",
    game.replayCount ? replayBadge(game.replayCount) : "",
    options.includePsn === false ? "" : (progress ? psnProgressBadge(progress) : ""),
  ].filter(Boolean).join("");
}

function playDatesFor(game, options = {}) {
  const values = [];
  const formatDate = game.completedAt ? formatLongDate : formatShortDate;
  const release = options.includeRelease === false ? "" : releaseStatus(game, { includePast: options.includePastRelease });
  if (release) values.push(releaseStatusPill(release));
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
  if (state.filters.sort === "custom") {
    return (a.order ?? Number.POSITIVE_INFINITY) - (b.order ?? Number.POSITIVE_INFINITY)
      || addedTimeValue(a) - addedTimeValue(b)
      || stringCompare(a.title, b.title);
  }
  const streamSort = compareStreamFirst(a, b);
  if (streamSort) return streamSort;
  if (Boolean(a.playing) !== Boolean(b.playing)) return a.playing ? -1 : 1;
  if (section === "upcoming") {
    return compareReleaseDates(a, b) || stringCompare(a.title, b.title);
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

function compareStreamFirst(a, b) {
  return Number(Boolean(b.stream)) - Number(Boolean(a.stream));
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

function platformBadge(platform, count = null, options = {}) {
  const cls = platformClass(platform, options);
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
  return `<span class="owner-pill ${escapeHtml(ownerColorClass(owner))}">${escapeHtml(owner)}</span>`;
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

function trashIcon() {
  return `
    <svg class="trash-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 6h18"></path>
      <path d="M8 6V4h8v2"></path>
      <path d="M19 6l-1 14H6L5 6"></path>
      <path d="M10 11v5"></path>
      <path d="M14 11v5"></path>
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

function downloadIcon() {
  return `
    <svg class="download-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2.5v13.5"></path>
      <path d="M6.5 10.5l5.5 5.5 5.5-5.5"></path>
      <path d="M4.5 20.5h15"></path>
    </svg>
  `;
}

function graphIcon() {
  return `
    <svg class="graph-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 19h16"></path>
      <path d="M7 16V9"></path>
      <path d="M12 16V5"></path>
      <path d="M17 16v-4"></path>
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
  const value = String(canonicalPlatform(platform) || platform || "").toLowerCase();
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
  if (value === "gb") return "assets/platforms/gb.png";
  if (value === "game gear") return "assets/platforms/gamegear.png";
  if (value === "dc" || value.includes("dreamcast")) return "assets/platforms/dreamcast.png";
  if (isSegaPlatform(value)) return "assets/platforms/sega.png";
  if (value.includes("switch")) return "assets/platforms/switch.png";
  if (value === "ps1" || value === "ps2") return "assets/platforms/playstation_retro.png";
  if (value === "ps5") return "assets/platforms/playstation_modern.png";
  if (/\bps\d*\b/.test(value) || value.includes("playstation") || value.includes("psp") || value.includes("vita")) return "assets/platforms/playstation.png";
  if (value === "x360" || value === "xbox 360") return "assets/platforms/xbox360.png";
  if (value === "xbox") return "assets/platforms/xbox_retro.png";
  if (value.includes("xbox") || value.includes("microsoft") || value === "xone") return "assets/platforms/xbox.png";
  if (value.includes("steam") || value.includes("pc")) return "assets/platforms/steam.png";
  return "assets/Icon.png";
}

function platformClass(platform, options = {}) {
  const value = String(canonicalPlatform(platform) || platform || "").toLowerCase();
  const title = String(options.title || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
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
  if (value === "game gear") return "platform-gamegear";
  if (value === "dc" || value.includes("dreamcast")) return "platform-dreamcast";
  if (isSegaPlatform(value)) return "platform-sega";
  if (value.includes("switch")) return "platform-nintendo";
  if (value === "ps1") return "platform-playstation platform-ps1";
  if (value === "ps3" && PS3_BLUE_PILL_TITLES.has(title)) return "platform-playstation platform-ps3-as-ps4";
  if (value === "ps3") return "platform-playstation platform-ps3";
  if (value === "ps5") return "platform-playstation platform-ps5";
  if (value === "psp") return "platform-playstation platform-psp";
  if (/\bps\d*\b/.test(value) || value.includes("playstation") || value.includes("psp") || value.includes("vita")) return "platform-playstation";
  if (value === "x360" || value === "xbox 360") return "platform-xbox platform-xbox360";
  if (value === "xbox") return "platform-xbox platform-xbox-retro";
  if (value.includes("xbox") || value.includes("microsoft") || value === "xone") return "platform-xbox";
  if (value.includes("steam") || value.includes("pc")) return "platform-pc";
  return "platform-generic";
}

const PS3_BLUE_PILL_TITLES = new Set([
  "deception iv blood ties",
  "drakengard 3",
  "dynasty warriors 8 xtreme legends",
  "everybody dance 3",
  "lego hobbit",
  "mugen souls z",
  "murdered soul suspect",
  "rambo the video game",
  "sports pack vol 1",
  "the amazing spider man 2",
  "ultra street fighter iv",
  "watch dogs",
  "wolfenstein the new order",
]);

function isSegaPlatform(value) {
  return /\b(gen|genesis|mega drive|megadrive|sega|saturn|cd|32x|master system|game gear)\b/i.test(value);
}

function timeBadge(hours, url = "") {
  return timeBadgeMarkup(hours, url, escapeHtml);
}

function chipsFor(game) {
  const chips = [];
  if (game.preorderStore) chips.push(chip(`Preordered: ${game.preorderStore}`, "accent"));
  if (game.preferredStore) chips.push(chip(`Buy: ${game.preferredStore}`));
  (game.genres || []).slice(0, 4).forEach((genre) => chips.push(chip(genre, "genre")));
  return chips;
}

function cardChipsFor(game) {
  return chipsFor(game);
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

function visibleOwnerTags(game) {
  const defaultOwner = state.settings.defaultOwner || DEFAULT_SETTINGS.defaultOwner;
  return ownerTags(game).filter((owner) => owner !== defaultOwner);
}

function completedOwnerBadges(game) {
  return visibleOwnerTags(game).map(ownerBadge).join("");
}

function ownerCardClass(game) {
  const owners = ownerTags(game);
  return owners.map(ownerCardColorClass).join(" ");
}

function ownerTitleClasses(owners = []) {
  return owners.map(ownerColorClass).join(" ");
}

function applyOwnerCardClasses(element, owners = []) {
  [...element.classList].filter((name) => name.startsWith("owner-card-") || name.startsWith("owner-color-card-")).forEach((name) => element.classList.remove(name));
  owners.map(ownerCardColorClass).forEach((name) => element.classList.add(name));
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
  if (normalized === "cage") return "Cage";
  return cleaned;
}

function hasJordiToneOwner(owners = []) {
  return owners.includes("Jordi") || owners.includes("Cage");
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
    sonyplaystationportable: "PSP",
    playstationportable: "PSP",
    psp: "PSP",
    sonyplaystationvita: "PSVita",
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
    gameboyadvanced: "GBA",
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
  return value;
}

function platformDisplayName(platform) {
  const value = canonicalPlatform(platform) || platform;
  const labels = {
    PC: "PC",
    PS1: "Sony PlayStation",
    PS2: "Sony PlayStation 2",
    PS3: "Sony PlayStation 3",
    PS4: "Sony PlayStation 4",
    PS5: "Sony Playstation 5",
    PSP: "Sony Playstation Portable",
    PSVita: "Sony Playstation Vita",
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
  return labels[value] || value;
}

function orderedPlatforms(values) {
  return [...values].sort((a, b) => platformOrderRank(a) - platformOrderRank(b) || stringCompare(platformDisplayName(a), platformDisplayName(b)));
}

function platformOrderRank(platform) {
  const value = platformFilterGroup(platform);
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

function normalizeGameRecords(games) {
  const normalized = Array.isArray(games) ? games.map(normalizeGameRecord) : [];
  ["new", "backlog", "upcoming", "wanted"].forEach((section) => {
    normalized
      .filter((game) => !game.deletedAt && !game.completedAt && !game.playing && game.section === section)
      .sort((a, b) => {
        const orderA = Number.isFinite(Number(a.order)) ? Number(a.order) : Number.POSITIVE_INFINITY;
        const orderB = Number.isFinite(Number(b.order)) ? Number(b.order) : Number.POSITIVE_INFINITY;
        return orderA - orderB || addedTimeValue(a) - addedTimeValue(b) || stringCompare(a.title, b.title);
      })
      .forEach((game, index) => {
        game.order = index;
      });
  });
  return normalized;
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
  normalized.section = ["new", "backlog", "upcoming", "wanted"].includes(normalized.section) ? normalized.section : "wanted";
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
  const buttons = [
    ...stores
    .filter((store) => providers.includes(store.provider))
    .map((store) => ({ ...store, url: links[store.key] })),
    providers.length ? null : { label: "Wikipedia", url: wikipediaUrlFor(game), cls: "store-wikipedia", icon: "assets/sites/wikipedia.ico" },
    hltbUrl ? { label: "HowLongToBeat", url: hltbUrl, cls: "store-hltb", icon: "assets/sites/howlongtobeat.png" } : null,
  ];
  return storeButtonsMarkup(buttons, escapeHtml);
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
  return guideLinksMarkup(game, { title: retailTitle(game.title), playstation: ["PS4", "PS5"].includes(canonicalPlatform(game.platform)), escape: escapeHtml });
}

function normalizeGuideUrl(value) {
  const url = String(value || "").trim();
  return /^https?:\/\//i.test(url) ? url : "";
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
    { store: "eBay", url: ebaySearchUrl(q, state.settings.region) },
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
  return (state.settings.stores || []).slice(0, MAX_PRICE_STORES).map((store) => {
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

function ebaySearchUrl(query, region = state.settings.region) {
  const host = region === "US" ? "www.ebay.com" : region === "UK" ? "www.ebay.co.uk" : "www.ebay.es";
  return `https://${host}/sch/i.html?_nkw=${query}&LH_BIN=1`;
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
  if (store === "eBay") return "https://www.ebay.com/favicon.ico";
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
  return activityReleaseStatus(game, options);
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
  return formatPillDate(date);
}

function formatLongDate(value) {
  const date = dateOnly(value);
  return formatPillDate(date);
}

function formatPillDate(value) {
  const date = dateOnly(value);
  if (!date) return "";
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit", year: "numeric" }).format(parsed);
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
  el.fields.section.value = game.section === "new" ? "backlog" : game.section || "wanted";
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
  syncStyledSelect(el.fields.section, { activeValue: null });
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
  state.finishSetupId = "";
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
  const finishingSetup = existing?.section === "new" && state.finishSetupId === id;
  const section = playing || replayCount || finishingSetup ? "backlog" : el.fields.section.value;
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
  if (el.pricesButton) el.pricesButton.hidden = draft.section === "backlog" || !priceProvidersForGame(draft).length;
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
  const fromShelfAdditions = isShelfNewAddition(game);
  game.section = "backlog";
  if (fromShelfAdditions) game.acceptedFromShelfAt = new Date().toISOString();
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
  if (isShelfNewAddition(game)) game.acceptedFromShelfAt = new Date().toISOString();
  game.section = "backlog";
  game.playing = true;
  game.startedAt = game.startedAt || todayDate();
  markGameEdited(game);
  upsertGame(game);
}

function finishSetupGame(id) {
  state.finishSetupId = id;
  openEditor(id);
}

function isShelfNewAddition(game) {
  return Boolean(game?.section === "new" && game.shelfId);
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

async function deleteCurrentGame() {
  if (state.editingId && await deleteGame(state.editingId)) el.dialog.close();
}

async function deleteGame(id) {
  const game = getGame(id);
  if (!game) return false;
  if (!await confirmGameDelete(game.title)) return false;
  const deletedAt = new Date().toISOString();
  game.deletedAt = deletedAt;
  markGameEdited(game, deletedAt);
  resetEmptyPlatformFilter();
  upsertGame(game);
  return true;
}

function resetEmptyPlatformFilter() {
  if (state.filters.platform === "all") return;
  const hasMatch = state.games.some((game) => !game.deletedAt && platformFilterGroup(game.platform) === state.filters.platform);
  if (!hasMatch) state.filters.platform = "all";
}

function getGame(id) {
  return state.games.find((game) => game.id === id);
}

function nextOrder(section) {
  return Math.max(-1, ...state.games
    .filter((game) => !game.deletedAt && !game.completedAt && !game.playing && game.section === section)
    .map((game) => Number(game.order) || 0)) + 1;
}

function setupDrag(list) {
  list.querySelectorAll(".game-card, .game-row").forEach((item) => {
    item.addEventListener("dragstart", () => {
      state.draggingId = item.dataset.id;
      item.classList.add("dragging");
    });
    item.addEventListener("dragend", () => {
      item.classList.remove("dragging");
      saveSectionOrder(list);
      state.draggingId = "";
    });
    item.addEventListener("dragover", (event) => {
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
  const items = [...container.querySelectorAll(".game-card:not(.dragging), .game-row:not(.dragging)")];
  return items.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) return { offset, element: child };
    return closest;
  }, { offset: Number.NEGATIVE_INFINITY, element: null }).element;
}

function saveSectionOrder(list) {
  const editedAt = new Date().toISOString();
  let changed = false;
  [...list.querySelectorAll(".game-card, .game-row")].forEach((item, index) => {
    const game = getGame(item.dataset.id);
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
    fetch("/api/auth", { method: "DELETE" }).catch(() => {});
    localStorage.setItem("gamelist-editor-signal", String(Date.now()));
    render();
    return;
  }
  await ensureEditMode();
}

async function hasSharedEditorSession() {
  try {
    return (await fetch("/api/auth", { cache: "no-store" })).ok;
  } catch {
    return false;
  }
}

async function syncSharedEditorSession() {
  const active = await hasSharedEditorSession();
  if (active === state.canEdit) return;
  state.canEdit = active;
  if (active) sessionStorage.setItem(SESSION_KEY, "true");
  else {
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(`${SESSION_KEY}:password`);
  }
  render();
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
    localStorage.setItem("gamelist-editor-signal", String(Date.now()));
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
  showToast("Fetching game info...");
  el.lookupResults.classList.remove("loaded");
  el.lookupResults.innerHTML = `<div class="empty">Searching...</div>`;
  el.lookupResults.classList.add("loaded");
  try {
    const results = await fetchSearchResults(query);
    renderLookupResults(results);
    showToast(results.length ? `Found ${results.length} game matches.` : "No game matches found.");
  } catch {
    renderLookupResults([]);
    showToast("Game info fetch unavailable.", "error");
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
    showToast("No games to refresh.");
    return;
  }

  const originalText = el.fetchDataButton.textContent;
  el.fetchDataButton.disabled = true;
  showToast(`Fetching data for ${games.length} games...`);
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
  showToast(`Updated data for ${updated} games${failed ? `, ${failed} failed` : ""}.`, failed ? "error" : "info");
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
  return Boolean(game?.title && ["upcoming", "wanted"].includes(game.section) && !game.completedAt && !game.platinum && priceProvidersForGame(game).length);
}

async function refreshCurrentPrices() {
  const title = el.fields.title.value.trim();
  if (!title) return;
  const savedGame = await saveCurrentFormGame();
  if (!shouldFetchPricesForGame(savedGame)) return;
  el.pricesButton.textContent = "Refreshing...";
  showToast("Fetching prices...");
  try {
    const data = await fetchPrices(savedGame.title, savedGame.platform, savedGame.digital);
    const game = getGame(savedGame.id);
    if (game) {
      game.prices = mergeFetchedPrices(game, data.prices);
      upsertGame(game);
    }
    showToast(`Found ${game?.prices?.length || data.prices?.length || 0} price links.`);
  } catch {
    showToast("Price refresh is unavailable right now.", "error");
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
    if (!silent) showToast("Price refresh is unavailable right now.", "error");
  }
}

async function refreshAllPrices() {
  if (!state.canEdit) return;
  const games = activeGames().filter((game) => ["upcoming", "wanted"].includes(game.section) && game.title && priceProvidersForGame(game).length);
  if (!games.length) {
    showToast("No Available or Upcoming games to refresh.");
    return;
  }

  el.fetchPricesButton.disabled = true;
  showToast(tt("Fetching prices for {count} games...", { count: games.length }));
  let updated = 0;
  let failed = 0;

  for (const [index, game] of games.entries()) {
    const progressLabel = tt("Prices {current}/{total}", { current: index + 1, total: games.length });
    el.fetchPricesButton.innerHTML = `${currencyIcon()}<span class="button-label">${escapeHtml(progressLabel)}</span>`;
    el.fetchPricesButton.title = progressLabel;
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
  el.fetchPricesButton.innerHTML = `${currencyIcon()}<span class="button-label">${escapeHtml(tt("Fetch New Prices"))}</span>`;
  el.fetchPricesButton.title = tt("Fetch New Prices");
  el.fetchPricesButton.setAttribute("aria-label", tt("Fetch New Prices"));
  showToast(tt("Updated prices for {updated} games{failed}.", { updated, failed: failed ? tt(", {count} failed", { count: failed }) : "" }), failed ? "error" : "info");
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
