const STORAGE_KEY = "gamelist:v1";
const LEGACY_STORAGE_KEY = "buylist-tracker:v6";
const SESSION_KEY = "gamelist-editor";
const VIEW_MODE_KEY = "gamelist:view-mode";
const PHYSICAL_PROVIDERS = ["Amazon.es", "Xtralife", "GAME.es", "Playasia"];
const DIGITAL_PROVIDERS = ["Nintendo España", "PlayStation España", "Steam"];
const PSN_PROFILE_USER = "ShabiiEXE";
const STATUS_OPTIONS = [
  "To Collect",
  "Scarce",
  "Waiting for Physical",
];
const UI_ICON_URLS = [
  "/assets/Icon.png",
  "/assets/platforms/playstation.png",
  "/assets/platforms/steam.png",
  "/assets/platforms/switch.png",
  "/assets/platforms/xbox.png",
  "/assets/stores/amazon.ico",
  "/assets/stores/game.ico",
  "/assets/stores/playasia.ico",
  "/assets/stores/xtralife.ico",
];
const SEARCH_CACHE_TTL = 1000 * 60 * 60;
let titleLookupTimer = 0;
const searchCache = new Map();
const searchInflight = new Map();

const state = {
  games: [],
  psnActivity: { achievements: [], games: [], sourceUrl: "" },
  cardTrophies: {},
  filters: { query: "", platform: "all", tag: "all", sort: "time", direction: "asc", preordered: false },
  viewMode: localStorage.getItem(VIEW_MODE_KEY) === "list" ? "list" : "grid",
  editingId: "",
  pendingDescription: "",
  canEdit: sessionStorage.getItem(SESSION_KEY) === "true",
  draggingId: "",
  mobileSection: "backlog",
  historyYear: String(new Date().getFullYear()),
  releaseCalendarOffset: 0,
  detailTrophyRequest: "",
  detailReturnToHistory: false,
  detailTrophiesData: [],
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
  achievementPanel: document.querySelector("#achievementPanel"),
  achievementProfileLink: document.querySelector("#achievementProfileLink"),
  stats: document.querySelector("#stats"),
  loginButton: document.querySelector("#loginButton"),
  addButton: document.querySelector("#addButton"),
  syncButton: document.querySelector("#syncButton"),
  fetchDataButton: document.querySelector("#fetchDataButton"),
  fetchPricesButton: document.querySelector("#fetchPricesButton"),
  searchInput: document.querySelector("#searchInput"),
  platformFilter: document.querySelector("#platformFilter"),
  tagFilter: document.querySelector("#tagFilter"),
  sortFilter: document.querySelector("#sortFilter"),
  sortDirectionButton: document.querySelector("#sortDirectionButton"),
  viewToggleButton: document.querySelector("#viewToggleButton"),
  preorderedFilter: document.querySelector("#preorderedFilter"),
  scrollTopButton: document.querySelector("#scrollTopButton"),
  mobileTabs: document.querySelectorAll("[data-mobile-section]"),
  detailDialog: document.querySelector("#detailDialog"),
  detailCloseButton: document.querySelector("#detailCloseButton"),
  historyDialog: document.querySelector("#historyDialog"),
  historyCloseButton: document.querySelector("#historyCloseButton"),
  historyYearTabs: document.querySelector("#historyYearTabs"),
  historyList: document.querySelector("#historyList"),
  releaseCalendar: document.querySelector("#releaseCalendar"),
  releaseDialog: document.querySelector("#releaseDialog"),
  releaseCloseButton: document.querySelector("#releaseCloseButton"),
  releaseDialogTitle: document.querySelector("#releaseDialogTitle"),
  releaseDialogList: document.querySelector("#releaseDialogList"),
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
  detailTrophyCount: document.querySelector("#detailTrophyCount"),
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
    coop: document.querySelector("#coopInput"),
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
    cover: document.querySelector("#coverInput"),
    notes: document.querySelector("#notesInput"),
  },
};

init();

async function init() {
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

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/service-worker.js").catch(() => {
      // Asset caching is optional; the app still works without it.
    });
  });
}

function bindEvents() {
  el.brandLink.addEventListener("click", (event) => {
    event.preventDefault();
    scrollToSearchArea();
  });
  el.loginButton.addEventListener("click", toggleEditMode);
  el.addButton.addEventListener("click", () => {
    scrollToSearchArea();
    window.setTimeout(() => openEditor(), 180);
  });
  el.syncButton.addEventListener("click", syncNow);
  el.fetchDataButton?.addEventListener("click", refreshAllGameData);
  el.fetchPricesButton.addEventListener("click", refreshAllPrices);
  el.playingPrevButton.addEventListener("click", () => slidePlaying(-1));
  el.playingNextButton.addEventListener("click", () => slidePlaying(1));
  el.playingList.addEventListener("scroll", () => {
    updatePlayingSliderControls();
    requestAnimationFrame(updateFocusedPlayingTrailer);
  }, { passive: true });
  el.playingFinishedList.addEventListener("scroll", updatePlayingFinishedEdges, { passive: true });
  el.detailTrophyList.addEventListener("scroll", updateDetailTrophyEdges, { passive: true });
  window.addEventListener("scroll", updateScrollTopButton, { passive: true });
  window.addEventListener("resize", schedulePlayingCardHeightSync, { passive: true });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) pauseAllPlayingTrailers();
    else requestAnimationFrame(updateFocusedPlayingTrailer);
  });
  el.searchInput.addEventListener("input", (event) => {
    state.filters.query = event.target.value.trim().toLowerCase();
    render();
  });
  el.platformFilter.addEventListener("change", (event) => {
    state.filters.platform = event.target.value;
    render();
  });
  el.tagFilter.addEventListener("change", (event) => {
    state.filters.tag = event.target.value;
    render();
  });
  el.sortFilter.addEventListener("change", (event) => {
    state.filters.sort = event.target.value;
    render();
  });
  el.sortDirectionButton.addEventListener("click", () => {
    state.filters.direction = state.filters.direction === "asc" ? "desc" : "asc";
    render();
  });
  el.viewToggleButton.addEventListener("click", () => {
    state.viewMode = state.viewMode === "grid" ? "list" : "grid";
    localStorage.setItem(VIEW_MODE_KEY, state.viewMode);
    render();
  });
  el.preorderedFilter.addEventListener("change", (event) => {
    state.filters.preordered = event.target.checked;
    render();
  });
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
  el.mobileTabs.forEach((button) => button.addEventListener("click", () => {
    state.mobileSection = button.dataset.mobileSection;
    render();
  }));
  el.fields.section.addEventListener("change", syncDialogPriceVisibility);
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
  const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
  if (saved) {
    state.games = normalizeGameRecords(JSON.parse(saved));
    persistLocal(false);
    return;
  }
  const response = await fetch("data/seed-games.json");
  const seed = await response.json();
  state.games = normalizeGameRecords(seed.games);
  persistLocal(false);
}

async function pullCloudData() {
  try {
    const response = await fetch("/api/sync");
    if (!response.ok) return false;
    const data = await response.json();
    if (Array.isArray(data.games) && data.games.length) {
      const nextGames = normalizeGameRecords(data.games);
      if (JSON.stringify(nextGames) !== JSON.stringify(state.games)) {
        state.games = nextGames;
        persistLocal(false);
        return true;
      }
    }
  } catch {
    // Static local preview has no Cloudflare function. Local data stays authoritative.
  }
  return false;
}

function persistLocal(shouldRender = true) {
  state.games = normalizeGameRecords(state.games);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.games));
  if (shouldRender) render();
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
      body: JSON.stringify({ games: state.games }),
    });
  } catch {
    // Local-only mode is expected before Cloudflare hosting.
  }
}

function render() {
  document.body.classList.toggle("can-edit", state.canEdit);
  document.body.classList.toggle("list-view-mode", state.viewMode === "list");
  el.loginButton.innerHTML = state.canEdit ? `${pauseIcon()}<span class="button-label">Stop Editing</span>` : pencilIcon();
  el.loginButton.title = state.canEdit ? "Stop Editing" : "Edit";
  el.loginButton.setAttribute("aria-label", el.loginButton.title);
  el.addButton.hidden = false;
  if (el.fetchDataButton) el.fetchDataButton.hidden = true;
  el.fetchPricesButton.hidden = !state.canEdit;
  if (state.canEdit && !el.fetchPricesButton.disabled) el.fetchPricesButton.innerHTML = `${euroIcon()}<span class="button-label">Fetch New Prices</span>`;
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
  scheduleMobilePaintRefresh();
  el.sortFilter.value = state.filters.sort;
  el.sortDirectionButton.textContent = state.filters.direction === "asc" ? "↑" : "↓";
  el.sortDirectionButton.title = state.filters.direction === "asc" ? "Sort ascending" : "Sort descending";
  el.sortDirectionButton.setAttribute("aria-label", el.sortDirectionButton.title);
  el.sortDirectionButton.classList.toggle("desc", state.filters.direction === "desc");
  renderViewToggle();
  el.preorderedFilter.checked = state.filters.preordered;
  el.platformFilter.classList.toggle("is-active", state.filters.platform !== "all");
  el.tagFilter.classList.toggle("is-active", state.filters.tag !== "all");
  updateScrollTopButton();
}

function renderViewToggle() {
  const showingGrid = state.viewMode === "grid";
  el.viewToggleButton.innerHTML = showingGrid ? linesIcon() : gridIcon();
  el.viewToggleButton.title = showingGrid ? "Show as list" : "Show as grid";
  el.viewToggleButton.setAttribute("aria-label", el.viewToggleButton.title);
  el.viewToggleButton.classList.toggle("active", state.viewMode === "list");
}

function syncScrollLock() {
  document.body.classList.toggle("dialog-open", el.dialog.open || el.detailDialog.open || el.historyDialog.open || el.releaseDialog.open);
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
  requestAnimationFrame(updateFocusedPlayingTrailer);
}

function renderPlayingFinished() {
  const games = filteredGames()
    .filter((game) => game.completedAt)
    .sort((a, b) => String(b.completedAt).localeCompare(String(a.completedAt)) || stringCompare(a.title, b.title));
  el.playingFinished.hidden = !games.length;
  el.playingFinishedList.innerHTML = games.map((game) => {
    const psn = matchedPsnGame(game);
    const progress = psn ? progressValue(psn.game) : 0;
    const badges = completedBadges(game);
    return `
      <button class="achievement-game playing-finished-game" type="button" data-id="${escapeHtml(game.id)}" aria-label="${escapeHtml(`Open ${game.title}`)}">
        <img src="${escapeHtml(game.cover || platformLogo(game.platform || "PS5"))}" alt="" loading="lazy" decoding="async">
        <div>
          <strong class="${game.platinum ? "completed-achievements-title" : ""}">${escapeHtml(game.title)}</strong>
          ${badges ? `<span class="playing-finished-tags">${badges}</span>` : ""}
          <span>${escapeHtml([formatLongDate(game.completedAt), finishedDurationText(game.startedAt, game.completedAt)].filter(Boolean).join(" · "))}</span>
          ${psn ? `<em style="--progress:${progress}%"></em>` : ""}
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
  el.achievementProfileLink.href = `https://psnprofiles.com/${encodeURIComponent(PSN_PROFILE_USER)}`;
  try {
    const response = await fetch(`/api/achievements?user=${encodeURIComponent(PSN_PROFILE_USER)}&schema=2`);
    const data = await response.json();
    renderAchievements(data);
    render();
  } catch {
    renderAchievements({ user: PSN_PROFILE_USER, achievements: [], sourceUrl: "https://www.playstation.com/", source: "psn", authError: true });
  }
}

function renderAchievements(data = {}) {
  const user = data.user || PSN_PROFILE_USER;
  const sourceUrl = data.sourceUrl || "https://www.playstation.com/";
  state.psnActivity = {
    achievements: Array.isArray(data.achievements) ? data.achievements : [],
    games: Array.isArray(data.games) ? data.games : [],
    summary: data.summary || null,
    sourceUrl,
  };
  renderPlayingSection();
  el.achievementProfileLink.href = sourceUrl;
  el.achievementProfileLink.textContent = data.source === "psn" ? "PSN activity" : user;
  const achievements = Array.isArray(data.achievements) ? data.achievements.slice(0, 6) : [];
  const games = Array.isArray(data.games) ? data.games.slice(0, 3) : [];
  if (!achievements.length) {
    const fallbackText = data.needsSetup
      ? "Set PSN_NPSSO in Cloudflare to show recent PSN trophy activity here."
      : data.authError
        ? "PSN token needs refreshing. Update PSN_NPSSO in Cloudflare."
        : data.blocked
          ? "The public tracker is blocking embedded scraping, but your profile is one click away."
          : "No recent trophy activity found yet.";
    el.achievementPanel.innerHTML = `
      <a class="achievement-fallback" href="${escapeHtml(sourceUrl)}" target="_blank" rel="noreferrer">
        <img src="${escapeHtml(platformLogo("PS5"))}" alt="">
        <div>
          <strong>PSN activity</strong>
          <span>${escapeHtml(fallbackText)}</span>
        </div>
      </a>
    `;
    return;
  }

  const trophyCards = achievements.map((item, index) => `
    <a class="achievement-card ${index === 0 ? "latest" : ""} trophy-${escapeHtml(trophyTone(item.rarity))}" href="${escapeHtml(item.url || sourceUrl)}" target="_blank" rel="noreferrer">
      <img class="achievement-icon" src="${escapeHtml(item.icon || platformLogo("PS5"))}" alt="">
      <div>
        <strong>${escapeHtml(item.title || "Trophy unlocked")}</strong>
        ${item.game ? `<span class="achievement-game-name">${escapeHtml(item.game)}</span>` : ""}
        ${item.earnedAt ? `<span class="achievement-earned-date">${escapeHtml(item.earnedAt)}</span>` : ""}
      </div>
    </a>
  `).join("");
  const dashboard = achievementDashboard(achievements, games, sourceUrl, data.summary);
  el.achievementPanel.innerHTML = `${dashboard}<span class="achievement-subtitle trophy-subtitle">Latest Trophies</span>${trophyCards}`;
  scheduleMobilePaintRefresh();
}

function achievementDashboard(achievements, games, sourceUrl, summary = null) {
  const trophies = summary?.trophies || {};
  const counts = [
    ["Platinum", Number(trophies.platinum || 0)],
    ["Gold", Number(trophies.gold || 0)],
    ["Silver", Number(trophies.silver || 0)],
    ["Bronze", Number(trophies.bronze || 0)],
  ];
  const total = Math.max(1, counts.reduce((sum, [, count]) => sum + count, 0));
  const latestPlatinum = achievements.find((item) => trophyTone(item.rarity) === "platinum");
  const average = games.length
    ? Math.round(games.reduce((sum, game) => sum + progressValue(game.game), 0) / games.length)
    : 0;
  return `
    <div class="achievement-summary">
      <a class="achievement-kpi" href="${escapeHtml(sourceUrl)}" target="_blank" rel="noreferrer">
        <strong>${escapeHtml(String(total))}</strong>
        <span>Trophies</span>
      </a>
      <a class="achievement-kpi platinum-highlight ${latestPlatinum ? "has-platinum" : ""}" href="${escapeHtml(latestPlatinum?.url || sourceUrl)}" target="_blank" rel="noreferrer">
        <strong class="kpi-with-icon">${trophyIcon()}${escapeHtml(String(trophies.platinum || 0))}</strong>
        <span>Platinums</span>
      </a>
      <div class="achievement-kpi">
        <strong>${escapeHtml(String(summary?.level || average || 0))}</strong>
        <span>${summary?.level ? `Level <small>${escapeHtml(String(summary.progress || 0))}% Next</small>` : "Latest Game Avg"}</span>
      </div>
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
  const active = filteredGames().filter((game) => !game.completedAt);
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
    stat("Backlog", counts.backlog, "backlog", { detail: sectionStatDetail("backlog", active, total) }),
    stat("To Release", counts.upcoming, "release", { detail: sectionStatDetail("upcoming", active, total) }),
    stat("Available", counts.wanted, "available", { detail: sectionStatDetail("wanted", active, total) }),
    stat(`Finished ${currentYear}`, completedThisYear, "done", { action: "history" }),
  ].join("");
  const historyStat = el.stats.querySelector("[data-stat-action='history']");
  historyStat?.addEventListener("click", openHistoryDialog);
  historyStat?.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openHistoryDialog();
    }
  });
  el.stats.querySelectorAll("[data-stat-detail]").forEach((node) => {
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
  <div class="release-months">
      ${months.map((month) => releaseMonthMarkup(month, releases, today)).join("")}
    </div>
    <div class="release-calendar-head">
      <div class="release-calendar-actions">
        <button class="ghost-button calendar-today-action" type="button" data-calendar-today>Today</button>
        <button class="icon-button" type="button" data-calendar-shift="-1" title="Previous month" aria-label="Previous month">←</button>
        <button class="icon-button" type="button" data-calendar-shift="1" title="Next month" aria-label="Next month">→</button>
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
  if (platform.includes("switch")) return "release-platform-nintendo";
  if (/\bps\d+\b/.test(platform) || platform.includes("playstation")) return "release-platform-playstation";
  if (platform.includes("pc")) return "release-platform-pc";
  if (platform.includes("xbox")) return "release-platform-xbox";
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
  const platforms = unique(active.map((game) => canonicalPlatform(game.platform)).filter(Boolean));
  const genres = unique(active.flatMap((game) => game.genres || []));
  fillSelect(el.platformFilter, ["all", ...platforms], state.filters.platform, "All platforms");
  fillSelect(el.tagFilter, ["all", ...genres], state.filters.tag, "All categories");
}

function fillSelect(select, values, selected, allLabel) {
  const current = [...select.options].map((option) => option.value).join("|");
  const next = values.join("|");
  if (current === next) return;
  select.innerHTML = values.map((value) => {
    const label = value === "all" ? allLabel : value;
    return `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`;
  }).join("");
  select.value = values.includes(selected) ? selected : "all";
}

function renderSection(section) {
  const list = document.querySelector(`.card-list[data-section="${section}"]`);
  const games = filteredGames().filter((game) => game.section === section && !game.completedAt && !game.playing);
  games.sort((a, b) => compareGames(a, b, section));
  list.innerHTML = "";
  list.classList.toggle("list-view", state.viewMode === "list");
  if (!games.length) {
    list.innerHTML = `<div class="empty">No games here.</div>`;
    return;
  }
  const fragment = document.createDocumentFragment();
  games.forEach((game, index) => {
    fragment.appendChild(state.viewMode === "list"
      ? rowFor(game, section, { imagePriority: index < 10 ? "eager" : "lazy" })
      : cardFor(game, { imagePriority: index < 6 ? "eager" : "lazy" }));
  });
  list.appendChild(fragment);
  if (state.viewMode === "grid" && section === "backlog" && state.filters.sort === "custom") setupDrag(list);
}

function rowFor(game, section, options = {}) {
  const row = document.createElement("article");
  const statuses = gameStatuses(game);
  const owners = ownerTags(game);
  row.className = "game-row";
  row.dataset.id = game.id;
  row.dataset.owner = statuses.join(" ");
  row.setAttribute("role", "button");
  row.tabIndex = 0;
  row.setAttribute("aria-label", `Open ${game.title}`);
  row.classList.toggle("owner-card-judy", owners.includes("Judy"));
  row.classList.toggle("owner-card-jordi", owners.includes("Jordi"));
  row.classList.toggle("digital-card", Boolean(game.digital));
  row.innerHTML = `
    <img class="game-row-cover" src="${escapeHtml(game.cover ? coverDisplayUrl(game.cover, "tiny") : "")}" alt="" loading="${escapeHtml(options.imagePriority || "lazy")}" decoding="async" ${game.cover ? "" : "hidden"}>
    <div class="game-row-main">
      <div class="game-row-title">
        <strong class="${game.platinum ? "completed-achievements-title" : ""} ${owners.includes("Judy") ? "owner-judy" : ""} ${owners.includes("Jordi") ? "owner-jordi" : ""}">${escapeHtml(game.title)}</strong>
        <span class="title-owners">${owners.filter((owner) => owner !== "Xavi").map(ownerBadge).join("")}</span>
      </div>
      ${studioText(game) ? `<span class="studio-line">${escapeHtml(studioText(game))}</span>` : ""}
      <span class="meta">${metaFor(game).join("")}</span>
      <span class="play-dates">${playDatesFor(game).join("")}</span>
      <span class="chips">${chipsFor(game).join("")}</span>
      ${section === "backlog" ? "" : `<span class="prices game-row-prices" style="--price-columns:${priceProvidersForGame(game).length}">${pricesFor(game)}</span>`}
    </div>
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

function renderCompleted() {
  const list = document.querySelector(".completed-list");
  const games = filteredGames().filter((game) => game.completedAt);
  games.sort((a, b) => String(b.completedAt).localeCompare(String(a.completedAt)));
  list.innerHTML = games.length ? games.map((game) => `
    <div class="completed-row" data-id="${escapeHtml(game.id)}" role="button" tabindex="0" aria-label="${escapeHtml(`Open ${game.title}`)}">
      <img class="completed-cover" src="${escapeHtml(game.cover || "")}" alt="" loading="lazy" decoding="async" ${game.cover ? "" : "hidden"}>
      <div>
        <strong class="${game.platinum ? "completed-achievements-title" : ""}">${escapeHtml(game.title)}</strong>
        <span class="completed-platform">${completedBadges(game)}</span>
        <span class="completed-dates">${escapeHtml(historyRangeText(game))}</span>
        ${completedDurationLine(game)}
      </div>
      <button class="icon-button completed-edit-action" type="button" title="Edit" aria-label="Edit">${pencilIcon()}</button>
      <button class="ghost-button restore-action" type="button">Backlog</button>
    </div>
  `).join("") : `<div class="empty">Finished games will stay saved here.</div>`;
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
    <div class="history-row" data-id="${escapeHtml(game.id)}" role="button" tabindex="0" aria-label="${escapeHtml(`Open ${game.title}`)}">
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

function completedYears() {
  return unique(state.games
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
  game.updatedAt = new Date().toISOString();
  upsertGame(game);
}

function activeGames() {
  return state.games.filter((game) => !game.completedAt && !game.deletedAt);
}

function filteredGames() {
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
      && (state.filters.platform === "all" || canonicalPlatform(game.platform) === state.filters.platform)
      && (state.filters.tag === "all" || tagText.includes(state.filters.tag))
      && (!state.filters.preordered || Boolean(game.preorderStore));
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
  titleOwners.innerHTML = owners.filter((owner) => owner !== "Xavi").map(ownerBadge).join("");
  titleOwners.hidden = !titleOwners.innerHTML;
  const studioLine = card.querySelector(".studio-line");
  studioLine.textContent = studioText(game);
  studioLine.hidden = !studioLine.textContent;
  card.querySelector(".meta").innerHTML = metaFor(game).join("");
  const playDates = card.querySelector(".play-dates");
  playDates.innerHTML = playDatesFor(game).join("");
  playDates.hidden = !playDates.innerHTML;
  card.querySelector(".chips").innerHTML = chipsFor(game).join("");
  const trophyStrip = card.querySelector(".card-trophies");
  trophyStrip.innerHTML = game.playing ? cardTrophiesFor(game) : "";
  trophyStrip.hidden = !trophyStrip.innerHTML;
  trophyStrip.addEventListener("click", (event) => {
    event.preventDefault();
    openDetail(game.id);
  }, true);
  const description = card.querySelector(".notes");
  description.textContent = shortDescription(game.description || "");
  description.hidden = !description.textContent;
  const prices = card.querySelector(".prices");
  const priceRefreshAction = card.querySelector(".price-refresh-action");
  const boughtAction = card.querySelector(".bought-action");
  const completeAction = card.querySelector(".complete-action");
  const trophyAction = card.querySelector(".trophy-action");
  if (game.section === "backlog") {
    prices.remove();
    priceRefreshAction.remove();
    boughtAction.remove();
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
    completeAction.remove();
    trophyAction.remove();
    prices.style.setProperty("--price-columns", priceProvidersForGame(game).length);
    prices.innerHTML = pricesFor(game);
    priceRefreshAction.addEventListener("click", () => refreshPricesForGame(game.id));
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

function updateFocusedPlayingTrailer() {
  if (document.hidden) {
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
  state.detailReturnToHistory = Boolean(options.returnToHistory);
  const owners = ownerTags(game);
  el.detailTitle.textContent = game.title;
  el.detailTitle.classList.toggle("owner-judy", owners.includes("Judy"));
  el.detailTitle.classList.toggle("owner-jordi", owners.includes("Jordi"));
  el.detailStudio.textContent = studioText(game);
  el.detailStudio.hidden = !el.detailStudio.textContent;
  el.detailMeta.innerHTML = metaFor(game).join("");
  el.detailDates.innerHTML = playDatesFor(game).join("");
  el.detailDates.hidden = !el.detailDates.innerHTML;
  el.detailChips.innerHTML = chipsFor(game).join("");
  el.detailStoreLinks.innerHTML = storeLinksFor(game);
  el.detailDescription.textContent = game.description || "No description yet.";
  renderDetailGuides(game);
  if (game.section === "backlog") {
    el.detailPrices.hidden = true;
    el.detailPrices.innerHTML = "";
  } else {
    el.detailPrices.hidden = false;
    el.detailPrices.style.setProperty("--price-columns", priceProvidersForGame(game).length);
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
  const psn = matchedPsnGame(game);
  const trophyId = psn?.npCommunicationId;
  if (!trophyId) {
    state.detailTrophyRequest = "";
    state.detailTrophiesData = [];
    el.detailTrophies.hidden = true;
    el.detailTrophyCount.textContent = "";
    el.detailTrophyList.innerHTML = "";
    updateDetailTrophyEdges();
    return;
  }

  const requestKey = `${game.id}:${trophyId}:${Date.now()}`;
  state.detailTrophyRequest = requestKey;
  el.detailTrophies.hidden = false;
  el.detailTrophyCount.textContent = "Loading...";
  el.detailTrophyList.innerHTML = `<div class="detail-trophy-empty">Loading earned trophies...</div>`;

  try {
    const params = new URLSearchParams({
      id: trophyId,
      service: psn.npServiceName || "trophy",
      schema: "3",
    });
    const response = await fetch(`/api/trophies?${params}`);
    const data = await response.json();
    if (state.detailTrophyRequest !== requestKey) return;
    state.detailTrophiesData = Array.isArray(data.trophies) ? data.trophies : [];
    renderDetailTrophyList();
  } catch {
    if (state.detailTrophyRequest !== requestKey) return;
    state.detailTrophiesData = [];
    el.detailTrophyCount.textContent = "";
    el.detailTrophyList.innerHTML = `<div class="detail-trophy-empty">Could not load trophies right now.</div>`;
    updateDetailTrophyEdges();
  }
}

function renderDetailTrophyList() {
  el.detailTrophySort.value = state.detailTrophySort;
  el.detailTrophyDirection.textContent = state.detailTrophyDirection === "asc" ? "↑" : "↓";
  el.detailTrophyDirection.title = state.detailTrophyDirection === "asc" ? "Sort ascending" : "Sort descending";
  el.detailTrophyDirection.setAttribute("aria-label", el.detailTrophyDirection.title);
  el.detailTrophyDirection.classList.toggle("desc", state.detailTrophyDirection === "desc");
  const trophies = sortedDetailTrophies();
  const earnedCount = trophies.filter((trophy) => trophy.earned).length;
  el.detailTrophyCount.textContent = trophies.length ? `${earnedCount}/${trophies.length} earned` : "";
  el.detailTrophyList.innerHTML = trophies.length
    ? trophies.map(detailTrophyCard).join("")
    : `<div class="detail-trophy-empty">No trophies found for this game yet.</div>`;
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
  if (!el.scrollTopButton) return;
  el.scrollTopButton.classList.toggle("visible", window.scrollY > 560 && !document.body.classList.contains("dialog-open"));
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
  return `
    <article class="detail-trophy-card trophy-${escapeHtml(trophyTone(trophy.type))} ${trophy.earned ? "earned" : "missing"}">
      <img src="${escapeHtml(trophy.icon || platformLogo("PS5"))}" alt="">
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

function metaFor(game) {
  const values = [];
  if (game.platform) values.push(platformBadge(game.platform));
  if (game.digital) values.push(`<span class="digital-pill">Digital</span>`);
  gameStatuses(game).forEach((status) => values.push(statusBadge(status)));
  const release = releaseStatus(game);
  if (release) values.push(`<span class="release-pill">${escapeHtml(release)}</span>`);
  if (game.lengthHours) values.push(timeBadge(game.lengthHours));
  const psn = matchedPsnGame(game);
  if (psn) values.push(psnProgressBadge(psn));
  if (game.coop) values.push(`<span class="coop-pill">Coop</span>`);
  if (game.replayCount) values.push(replayBadge(game.replayCount));
  if (game.platinum) values.push(`<span class="platinum-pill">${trophyIcon()} Completed</span>`);
  return values;
}

function matchedPsnGame(game) {
  const title = normalizeTitleForMatch(game.title);
  if (!title) return null;
  return (state.psnActivity.games || []).find((psnGame) => {
    const psnTitle = normalizeTitleForMatch(psnGame.title);
    return psnTitle && (psnTitle === title || psnTitle.includes(title) || title.includes(psnTitle));
  }) || null;
}

function latestTrophiesForGame(game, limit = 3) {
  const title = normalizeTitleForMatch(game.title);
  if (!title) return [];
  return (state.psnActivity.achievements || [])
    .filter((achievement) => {
      const gameTitle = normalizeTitleForMatch(achievement.game || achievement.title || "");
      return gameTitle && (gameTitle === title || gameTitle.includes(title) || title.includes(gameTitle));
    })
    .slice(0, limit);
}

function cardTrophiesFor(game) {
  const psn = matchedPsnGame(game);
  const cacheKey = psn?.npCommunicationId || "";
  const cached = cacheKey ? state.cardTrophies[cacheKey] : null;
  if (psn && !cached) loadCardTrophies(game, psn);
  const trophies = cached?.trophies?.length ? cached.trophies : latestTrophiesForGame(game, 3);
  if (!trophies.length && cached?.loading) return `<div class="card-trophy-head">${trophyIcon()}<span>Loading trophies...</span></div>`;
  if (!trophies.length) return "";
  return `
    <div class="card-trophy-head">${trophyIcon()}<span>Latest trophies</span></div>
    <div class="card-trophy-list">
      ${trophies.map((trophy) => `
        <a class="card-trophy trophy-${escapeHtml(trophyTone(trophy.type || trophy.rarity))}" href="${escapeHtml(trophy.url || state.psnActivity.sourceUrl || "#")}" target="_blank" rel="noreferrer" title="${escapeHtml([trophy.title, trophy.earnedAt].filter(Boolean).join(" · "))}">
          <img src="${escapeHtml(trophy.icon || platformLogo("PS5"))}" alt="">
          <span>${escapeHtml(trophy.title || "Trophy")}</span>
        </a>
      `).join("")}
    </div>
  `;
}

async function loadCardTrophies(game, psn) {
  const cacheKey = psn?.npCommunicationId;
  if (!cacheKey || state.cardTrophies[cacheKey]) return;
  state.cardTrophies[cacheKey] = { loading: true, trophies: [] };
  try {
    const params = new URLSearchParams({
      id: cacheKey,
      service: psn.npServiceName || "trophy",
    });
    const response = await fetch(`/api/trophies?${params}`);
    if (!response.ok) throw new Error("Card trophies failed");
    const data = await response.json();
    const trophies = (Array.isArray(data.trophies) ? data.trophies : [])
      .filter((trophy) => trophy.earned && trophy.earnedAt)
      .sort((a, b) => String(b.earnedAt || "").localeCompare(String(a.earnedAt || "")))
      .slice(0, 3);
    state.cardTrophies[cacheKey] = { loading: false, trophies };
  } catch {
    state.cardTrophies[cacheKey] = { loading: false, trophies: [] };
  }
  updateCardTrophyStrips(game.id);
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

function psnProgressBadge(game) {
  const progress = progressValue(game.game);
  return `
    <span class="psn-progress-pill" title="${escapeHtml([game.title, game.game].filter(Boolean).join(" · "))}">
      ${trophyIcon()}
      <em style="--progress:${progress}%"></em>
      <strong>${progress}%</strong>
    </span>
  `;
}

function completedBadges(game) {
  return [
    game.platform ? platformBadge(game.platform) : "",
    game.digital ? `<span class="digital-pill">Digital</span>` : "",
    game.coop ? `<span class="coop-pill">Coop</span>` : "",
    game.replayCount ? replayBadge(game.replayCount) : "",
    game.platinum ? `<span class="platinum-pill">${trophyIcon()} Completed</span>` : "",
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
  if (state.filters.sort === "time") {
    return direction * (((a.lengthHours ?? Number.POSITIVE_INFINITY) - (b.lengthHours ?? Number.POSITIVE_INFINITY))
      || stringCompare(a.title, b.title));
  }
  return direction * stringCompare(a.title, b.title);
}

function comparePlayingGames(a, b) {
  return Number(Boolean(a.coop)) - Number(Boolean(b.coop))
    || playingStartSortValue(a) - playingStartSortValue(b)
    || stringCompare(a.title, b.title);
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
  return `
    <span class="platform-badge ${cls}" title="${escapeHtml(platform)}">
      <span class="platform-icon">
        <img src="${escapeHtml(logo)}" alt="" width="18" height="18" decoding="async">
      </span>
      <span class="platform-label">${escapeHtml(platform)}</span>
      ${count == null ? "" : `<span class="platform-count">${count}</span>`}
    </span>
  `;
}

function ownerBadge(owner) {
  return `<span class="owner-pill owner-${escapeHtml(owner.toLowerCase())}">${escapeHtml(owner)}</span>`;
}

function statusBadge(status) {
  return `<span class="status-pill ${escapeHtml(statusType(status))}">${escapeHtml(status)}</span>`;
}

function replayBadge(count) {
  return `<span class="replay-pill">Replay ${escapeHtml(count)}</span>`;
}

function pencilIcon() {
  return `
    <svg class="pencil-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 20h4l11-11a2.8 2.8 0 0 0-4-4L4 16v4Z"></path>
      <path d="M13.5 6.5l4 4"></path>
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
      <rect x="4" y="5" width="6" height="6"></rect>
      <rect x="14" y="5" width="6" height="6"></rect>
      <rect x="4" y="13" width="6" height="6"></rect>
      <rect x="14" y="13" width="6" height="6"></rect>
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
  if (value.includes("switch")) return "assets/platforms/switch.png";
  if (/\bps\d+\b/.test(value) || value.includes("playstation")) return "assets/platforms/playstation.png";
  if (value.includes("xbox")) return "assets/platforms/xbox.png";
  if (value.includes("pc")) return "assets/platforms/steam.png";
  return "assets/Icon.png";
}

function platformClass(platform) {
  const value = platform.toLowerCase();
  if (value.includes("switch")) return "platform-nintendo";
  if (/\bps\d+\b/.test(value) || value.includes("playstation")) return "platform-playstation";
  if (value.includes("xbox")) return "platform-xbox";
  if (value.includes("pc")) return "platform-pc";
  return "platform-generic";
}

function timeBadge(hours) {
  return `<span class="time-pill" style="${timeStyle(hours)}"><strong>${escapeHtml(hours)}</strong><span>hrs</span></span>`;
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
  return owners.length ? owners : ["Xavi"];
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
  const normalized = normalizeTag(owner);
  if (normalized === "xavi") return "Xavi";
  if (normalized === "judy") return "Judy";
  if (normalized === "jordi") return "Jordi";
  return "";
}

function ownerInputValues(value) {
  const owners = listFrom(value).map(canonicalOwner).filter(Boolean);
  return owners.length ? owners : ["Xavi"];
}

function canonicalPlatform(value) {
  const text = String(value || "").trim();
  const normalized = normalizeTag(text);
  const aliases = {
    playstation2: "PS2",
    ps2: "PS2",
    playstation3: "PS3",
    ps3: "PS3",
    playstation4: "PS4",
    ps4: "PS4",
    playstation5: "PS5",
    ps5: "PS5",
    nintendoswitch: "Switch",
    switch: "Switch",
    nintendoswitch2: "Switch 2",
    switch2: "Switch 2",
    steam: "PC",
    pc: "PC",
  };
  return aliases[normalized] || text;
}

function normalizeGameRecords(games) {
  return Array.isArray(games) ? games.map(normalizeGameRecord) : [];
}

function normalizeGameRecord(game) {
  const normalized = { ...game };
  normalized.digital = Boolean(normalized.digital);
  normalized.coop = Boolean(normalized.coop);
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

function storeLinksFor(game) {
  const links = storeLinksWithFallbacks(game);
  return [
    storeButton("PlayStation", links.playstation, "store-playstation", platformLogo("PS5")),
    storeButton("Nintendo", links.nintendo, "store-nintendo", platformLogo("Switch")),
    storeButton("Steam", links.steam, "store-steam", platformLogo("PC")),
  ].join("");
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
  return {
    playstation: links.playstation || `https://www.playstation.com/es-es/search/?q=${q}`,
    nintendo: links.nintendo || `https://www.nintendo.com/es-es/Buscar/Buscar-299117.html?q=${q}&f=147394-86`,
    steam: links.steam || `https://store.steampowered.com/search/?term=${q}`,
  };
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
      "PSN Guide",
      psnProfilesGuideUrl(game, title),
      "guide-psnprofiles",
      "https://www.google.com/s2/favicons?domain=psnprofiles.com&sz=64"
    ));
  }
  links.push(
    guideButton("Neoseeker", neoseekerGuideUrl(game, title), "guide-neoseeker", "https://www.google.com/s2/favicons?domain=neoseeker.com&sz=64"),
    guideButton("RPG Site", rpgSiteGuideUrl(game, title), "guide-rpgsite", "https://www.google.com/s2/favicons?domain=rpgsite.net&sz=64")
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
    const label = hasPrice ? price.price : "- €";
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
  if (game.digital) {
    return [
      { store: "Nintendo España", url: `https://www.nintendo.com/es-es/Buscar/Buscar-299117.html?q=${q}&f=147394-86` },
      { store: "PlayStation España", url: `https://www.playstation.com/es-es/search/?q=${q}` },
      { store: "Steam", url: `https://store.steampowered.com/search/?term=${q}` },
    ];
  }
  return [
    { store: "Amazon.es", url: `https://www.amazon.es/s?k=${q}` },
    { store: "Xtralife", url: `https://www.xtralife.com/buscar/${q}` },
    { store: "GAME.es", url: `https://www.game.es/buscar/${q}` },
    { store: "Playasia", url: playasiaSearchUrl(game.title, game.platform) },
  ];
}

function retailQuery(title, platform) {
  return encodeURIComponent(`${retailTitle(title)} ${platform}`.trim());
}

function playasiaSearchUrl(title, platform) {
  return `https://www.play-asia.com/en/search/${retailTitle(`${title} ${platform}`.trim()).split(/\s+/).map(encodeURIComponent).join("+")}`;
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
  return game.digital ? DIGITAL_PROVIDERS : PHYSICAL_PROVIDERS;
}

function storeIcon(store) {
  if (store === "Amazon.es") return "assets/stores/amazon.ico";
  if (store === "Xtralife") return "assets/stores/xtralife.ico";
  if (store === "GAME.es") return "assets/stores/game.ico";
  if (store === "Playasia") return "assets/stores/playasia.ico";
  if (store === "Nintendo España") return platformLogo("Switch");
  if (store === "PlayStation España") return platformLogo("PS5");
  if (store === "Steam") return platformLogo("PC");
  return "";
}

function releaseStatus(game) {
  if (game.releaseDate) {
    const release = new Date(`${game.releaseDate}T00:00:00`);
    if (Number.isNaN(release.getTime()) || release.getFullYear() < 1990) return game.releaseText || "???";
    if (game.section === "upcoming") return `Releases ${game.releaseDate}`;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return release <= today ? "" : `Releases ${game.releaseDate}`;
  }
  if (game.releaseText && game.section === "upcoming") return game.releaseText;
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
  el.fields.coop.checked = Boolean(game.coop);
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
  el.fields.cover.value = game.cover || "";
  el.fields.notes.value = game.notes || "";
  syncDialogPriceVisibility();
  el.dialog.showModal();
  syncScrollLock();
}

function blankGame() {
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
    coop: false,
    platinum: false,
    playing: false,
    replayCount: 0,
    startedAt: "",
    genres: [],
    developer: "",
    publisher: "",
    igdbUrl: "",
    trailerUrl: "",
    storeLinks: { playstation: "", nintendo: "", steam: "" },
    owners: ["Xavi"],
    preorderStore: "",
    preferredStore: "",
    cover: "",
    prices: [],
    order: nextOrder("wanted"),
    completedAt: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
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
    coop: el.fields.coop.checked,
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
    storeLinks: {
      playstation: el.fields.playstationUrl.value.trim(),
      nintendo: el.fields.nintendoUrl.value.trim(),
      steam: el.fields.steamUrl.value.trim(),
    },
    cover: el.fields.cover.value.trim(),
    notes: el.fields.notes.value.trim(),
    order: existing?.section === section ? existing.order : nextOrder(section),
    updatedAt: new Date().toISOString(),
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
  el.pricesButton.hidden = el.fields.section.value === "backlog";
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

function moveToBacklog(id) {
  const game = getGame(id);
  game.section = "backlog";
  game.preorderStore = "";
  game.prices = [];
  game.order = nextOrder("backlog");
  game.updatedAt = new Date().toISOString();
  upsertGame(game);
}

function startPlaying(id) {
  const game = getGame(id);
  if (!game || game.completedAt) return;
  game.section = "backlog";
  game.playing = true;
  game.startedAt = game.startedAt || todayDate();
  game.updatedAt = new Date().toISOString();
  upsertGame(game);
}

function completeGame(id) {
  const game = getGame(id);
  if (!game?.playing) return;
  game.startedAt = game.startedAt || todayDate();
  game.completedAt = todayDate();
  game.playing = false;
  game.updatedAt = new Date().toISOString();
  upsertGame(game);
}

function completeGameWithTrophy(id) {
  const game = getGame(id);
  if (!game?.playing) return;
  game.startedAt = game.startedAt || todayDate();
  game.completedAt = game.completedAt || todayDate();
  game.playing = false;
  game.platinum = true;
  game.updatedAt = new Date().toISOString();
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
  game.updatedAt = new Date().toISOString();
  upsertGame(game);
}

function deleteCurrentGame() {
  if (state.editingId) deleteGame(state.editingId);
  el.dialog.close();
}

function deleteGame(id) {
  const game = getGame(id);
  game.deletedAt = new Date().toISOString();
  game.updatedAt = game.deletedAt;
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
  [...list.querySelectorAll(".game-card")].forEach((card, index) => {
    const game = getGame(card.dataset.id);
    if (game) game.order = index;
  });
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
  const password = prompt("Editor password");
  if (!password) return false;
  const ok = await verifyPassword(password);
  if (!ok) {
    alert("Wrong password.");
    return false;
  }
  state.canEdit = true;
  sessionStorage.setItem(SESSION_KEY, "true");
  sessionStorage.setItem(`${SESSION_KEY}:password`, password);
  render();
  return true;
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

async function refreshCurrentPrices() {
  const title = el.fields.title.value.trim();
  if (!title) return;
  const savedGame = await saveCurrentFormGame();
  if (savedGame.section === "backlog") return;
  el.pricesButton.textContent = "Refreshing...";
  try {
    const data = await fetchPrices(savedGame.title, savedGame.platform, savedGame.digital);
    const game = getGame(savedGame.id);
    if (game) {
      game.prices = data.prices || [];
      upsertGame(game);
    }
    alert(`Found ${data.prices?.length || 0} price links.`);
  } catch {
    alert("Price refresh will work once the Cloudflare function is hosted.");
  } finally {
    el.pricesButton.textContent = "Refresh Prices";
  }
}

async function refreshPricesForGame(id) {
  const game = getGame(id);
  if (!game) return;
  persistLocal();
  if (state.canEdit) await persistCloud();
  if (game.section === "backlog") {
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
    game.prices = data.prices || game.prices;
    game.updatedAt = new Date().toISOString();
    upsertGame(game);
  } catch {
    alert("Price refresh needs the Cloudflare function or the local fetch script.");
  }
}

async function refreshAllPrices() {
  if (!state.canEdit) return;
  const games = activeGames().filter((game) => game.section !== "backlog" && game.title);
  if (!games.length) {
    alert("No Available now or To Release games to refresh.");
    return;
  }

  const originalHtml = el.fetchPricesButton.innerHTML;
  el.fetchPricesButton.disabled = true;
  let updated = 0;
  let failed = 0;

  for (const [index, game] of games.entries()) {
    el.fetchPricesButton.innerHTML = `${euroIcon()}<span class="button-label">Prices ${index + 1}/${games.length}</span>`;
    el.fetchPricesButton.title = `Prices ${index + 1}/${games.length}`;
    el.fetchPricesButton.setAttribute("aria-label", el.fetchPricesButton.title);
    game.prices = priceProvidersForGame(game).map((store) => ({
      ...fallbackPriceLinks(game).find((item) => item.store === store),
      checkedAt: "",
    }));
    try {
      const data = await fetchPrices(game.title, game.platform, game.digital);
      game.prices = data.prices || game.prices;
      game.updatedAt = new Date().toISOString();
      updated += 1;
    } catch {
      failed += 1;
    }
  }

  persistLocal();
  persistCloud();
  el.fetchPricesButton.disabled = false;
  el.fetchPricesButton.innerHTML = originalHtml;
  el.fetchPricesButton.title = "Fetch New Prices";
  el.fetchPricesButton.setAttribute("aria-label", "Fetch New Prices");
  alert(`Updated prices for ${updated} games${failed ? `, ${failed} failed` : ""}.`);
}

async function fetchPrices(title, platform, digital = false) {
  const params = new URLSearchParams({ title, platform });
  if (digital) params.set("digital", "1");
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
