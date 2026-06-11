const STORAGE_KEY = "gamelist:v1";
const LEGACY_STORAGE_KEY = "buylist-tracker:v6";
const SESSION_KEY = "gamelist-editor";
const PROVIDERS = ["Amazon.es", "Xtralife", "GAME.es", "Playasia"];
const PSN_PROFILE_USER = "ShabiiEXE";
const STATUS_OPTIONS = [
  "To Collect",
  "Scarce",
  "Waiting for Physical",
];
let titleLookupTimer = 0;

const state = {
  games: [],
  psnActivity: { achievements: [], games: [], sourceUrl: "" },
  filters: { query: "", platform: "all", tag: "all", sort: "time", direction: "asc", preordered: false },
  editingId: "",
  pendingDescription: "",
  canEdit: sessionStorage.getItem(SESSION_KEY) === "true",
  draggingId: "",
  mobileSection: "backlog",
  historyYear: String(new Date().getFullYear()),
  releaseCalendarOffset: 0,
};

const el = {
  playingSection: document.querySelector("#playingSection"),
  playingCount: document.querySelector("#playingCount"),
  playingList: document.querySelector(".playing-list"),
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
  preorderedFilter: document.querySelector("#preorderedFilter"),
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
  document.body.classList.toggle("can-edit", state.canEdit);
  bindEvents();
  await loadData();
  await pullCloudData();
  render();
  refreshAchievements();
  refreshUnreleasedGamesOnOpen();
  refreshMissingDescriptionsOnOpen();
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
  el.loginButton.addEventListener("click", toggleEditMode);
  el.addButton.addEventListener("click", () => openEditor());
  el.syncButton.addEventListener("click", syncNow);
  el.fetchDataButton?.addEventListener("click", refreshAllGameData);
  el.fetchPricesButton.addEventListener("click", refreshAllPrices);
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
  el.preorderedFilter.addEventListener("change", (event) => {
    state.filters.preordered = event.target.checked;
    render();
  });
  el.detailCloseButton.addEventListener("click", () => el.detailDialog.close());
  el.detailDialog.addEventListener("click", (event) => {
    if (event.target === el.detailDialog) el.detailDialog.close();
  });
  el.detailDialog.addEventListener("close", syncScrollLock);
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
  el.fields.title.addEventListener("input", queueTitleLookup);
  el.pricesButton.addEventListener("click", refreshCurrentPrices);
  el.coverUpload.addEventListener("change", handleCoverUpload);
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
  persistLocal();
}

async function pullCloudData() {
  try {
    const response = await fetch("/api/sync");
    if (!response.ok) return;
    const data = await response.json();
    if (Array.isArray(data.games) && data.games.length) {
      state.games = normalizeGameRecords(data.games);
      persistLocal(false);
    }
  } catch {
    // Static local preview has no Cloudflare function. Local data stays authoritative.
  }
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
  el.sortFilter.value = state.filters.sort;
  el.sortDirectionButton.textContent = state.filters.direction === "asc" ? "↑" : "↓";
  el.sortDirectionButton.title = state.filters.direction === "asc" ? "Sort ascending" : "Sort descending";
  el.sortDirectionButton.setAttribute("aria-label", el.sortDirectionButton.title);
  el.sortDirectionButton.classList.toggle("desc", state.filters.direction === "desc");
  el.preorderedFilter.checked = state.filters.preordered;
  el.platformFilter.classList.toggle("is-active", state.filters.platform !== "all");
  el.tagFilter.classList.toggle("is-active", state.filters.tag !== "all");
}

function syncScrollLock() {
  document.body.classList.toggle("dialog-open", el.dialog.open || el.detailDialog.open || el.historyDialog.open || el.releaseDialog.open);
}

function renderPlayingSection() {
  const games = activeGames().filter((game) => game.playing);
  games.sort(comparePlayingGames);
  el.playingSection.hidden = !games.length;
  el.playingCount.textContent = `${games.length} ${games.length === 1 ? "game" : "games"}`;
  el.playingList.innerHTML = "";
  games.forEach((game) => el.playingList.appendChild(cardFor(game, { staticCard: true })));
}

async function refreshAchievements() {
  el.achievementProfileLink.href = `https://psnprofiles.com/${encodeURIComponent(PSN_PROFILE_USER)}`;
  try {
    const response = await fetch(`/api/achievements?user=${encodeURIComponent(PSN_PROFILE_USER)}`);
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
        <span>${escapeHtml([item.game, item.rarity, item.earnedAt].filter(Boolean).join(" · "))}</span>
      </div>
    </a>
  `).join("");
  const dashboard = achievementDashboard(achievements, games, sourceUrl, data.summary);
  const gameCards = games.length ? `
    <div class="achievement-games">
      <span class="achievement-subtitle">Lastest PlayStation games</span>
      <div class="achievement-game-list">
        ${games.map((game) => achievementGameCard(game, sourceUrl)).join("")}
      </div>
    </div>
  ` : "";
  el.achievementPanel.innerHTML = `${dashboard}${trophyCards}${gameCards}`;
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
        <span>Platinums${latestPlatinum ? ` · Latest ${escapeHtml(latestPlatinum.game || latestPlatinum.title || "")}` : ""}</span>
      </a>
      <div class="achievement-kpi">
        <strong>${escapeHtml(String(summary?.level || average || 0))}</strong>
        <span>${summary?.level ? `Level · ${summary.progress || 0}% Next` : "Latest Game Avg"}</span>
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
    stat(`Done ${currentYear}`, completedThisYear, "done", { action: "history" }),
  ].join("");
  const historyStat = el.stats.querySelector("[data-stat-action='history']");
  historyStat?.addEventListener("click", openHistoryDialog);
  historyStat?.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openHistoryDialog();
    }
  });
  for (const [section, count] of Object.entries(counts)) {
    const node = document.querySelector(`#${section}Count`);
    if (node) node.innerHTML = sectionCountLabel(section, active, count);
  }
}

function stat(label, value, tone = "", options = {}) {
  const attrs = options.action
    ? ` role="button" tabindex="0" data-stat-action="${escapeHtml(options.action)}"`
    : "";
  return `<div class="stat ${tone ? `stat-${tone}` : ""} ${options.action ? "stat-action" : ""}"${attrs}><strong>${value}</strong><span>${label}</span>${options.detail || ""}</div>`;
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
    <div class="release-calendar-head">
      <h2>Next Releases</h2>
      <div class="release-calendar-actions">
        <button class="icon-button" type="button" data-calendar-shift="-1" title="Previous month" aria-label="Previous month">←</button>
        <button class="icon-button" type="button" data-calendar-shift="1" title="Next month" aria-label="Next month">→</button>
      </div>
    </div>
    <div class="release-months">
      ${months.map((month) => releaseMonthMarkup(month, releases, today)).join("")}
    </div>
  `;
  el.releaseCalendar.querySelectorAll("[data-calendar-shift]").forEach((button) => {
    button.addEventListener("click", () => {
      state.releaseCalendarOffset += Number(button.dataset.calendarShift || 0);
      renderReleaseCalendar();
    });
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
  if (!games.length) {
    list.innerHTML = `<div class="empty">No games here.</div>`;
    return;
  }
  const fragment = document.createDocumentFragment();
  games.forEach((game) => fragment.appendChild(cardFor(game)));
  list.appendChild(fragment);
  if (section === "backlog" && state.filters.sort === "custom") setupDrag(list);
}

function renderCompleted() {
  const list = document.querySelector(".completed-list");
  const games = filteredGames().filter((game) => game.completedAt);
  games.sort((a, b) => String(b.completedAt).localeCompare(String(a.completedAt)));
  list.innerHTML = games.length ? games.map((game) => `
    <div class="completed-row" data-id="${escapeHtml(game.id)}" role="button" tabindex="0" aria-label="${escapeHtml(`Open ${game.title}`)}">
      <img class="completed-cover" src="${escapeHtml(game.cover || "")}" alt="" loading="lazy" decoding="async" ${game.cover ? "" : "hidden"}>
      <div>
        <strong>${escapeHtml(game.title)}</strong>
        <span class="completed-platform">${completedBadges(game)}</span>
        <span class="completed-dates">${escapeHtml(historyRangeText(game))}</span>
        ${completedDurationLine(game)}
      </div>
      <button class="icon-button completed-edit-action" type="button" title="Edit" aria-label="Edit">${pencilIcon()}</button>
      <button class="ghost-button restore-action" type="button">Backlog</button>
    </div>
  `).join("") : `<div class="empty">Completed games will stay saved here.</div>`;
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
    <div class="history-row" data-id="${escapeHtml(game.id)}">
      <img class="completed-cover" src="${escapeHtml(game.cover || "")}" alt="" loading="lazy" decoding="async" ${game.cover ? "" : "hidden"}>
      <div>
        <strong>${escapeHtml(game.title)}</strong>
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
  if (done) return `Done ${done}`;
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
  const img = card.querySelector("img");
  img.hidden = !game.cover;
  img.src = game.cover ? coverDisplayUrl(game.cover) : "";
  img.alt = game.cover ? `${game.title} cover` : "";
  img.loading = "eager";
  img.decoding = "async";
  card.classList.toggle("has-art", Boolean(game.cover));
  if (game.cover) {
    card.style.setProperty("--card-art", `url("${cssUrl(backgroundCoverUrl(game.cover))}")`);
    setupCardParallax(card);
  }
  card.querySelector("h3").textContent = game.title;
  card.querySelector("h3").classList.toggle("owner-judy", owners.includes("Judy"));
  card.querySelector("h3").classList.toggle("owner-jordi", owners.includes("Jordi"));
  const studioLine = card.querySelector(".studio-line");
  studioLine.textContent = studioText(game);
  studioLine.hidden = !studioLine.textContent;
  card.querySelector(".meta").innerHTML = metaFor(game).join("");
  const playDates = card.querySelector(".play-dates");
  playDates.innerHTML = playDatesFor(game).join("");
  playDates.hidden = !playDates.innerHTML;
  card.querySelector(".chips").innerHTML = chipsFor(game).join("");
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
      ? `<span class="action-icon checkmark-icon" aria-hidden="true">✓</span><span class="action-label">Finished</span>`
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
    prices.innerHTML = pricesFor(game);
    priceRefreshAction.addEventListener("click", () => refreshPricesForGame(game.id));
    boughtAction.addEventListener("click", () => moveToBacklog(game.id));
  }
  card.querySelector(".edit-action").addEventListener("click", () => openEditor(game.id));
  card.querySelector(".cover-button").addEventListener("click", () => openDetail(game.id));
  card.querySelector(".delete-action").addEventListener("click", () => deleteGame(game.id));
  card.addEventListener("click", (event) => {
    if (event.target.closest("button, a")) return;
    openDetail(game.id);
  });
  return card;
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

function openDetail(id) {
  const game = getGame(id);
  if (!game) return;
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
  if (game.section === "backlog") {
    el.detailPrices.hidden = true;
    el.detailPrices.innerHTML = "";
  } else {
    el.detailPrices.hidden = false;
    el.detailPrices.innerHTML = pricesFor(game);
  }
  el.detailCover.hidden = !game.cover;
  el.detailCover.src = game.cover ? coverDisplayUrl(game.cover, "large") : "";
  el.detailCover.alt = game.cover ? `${game.title} cover` : "";
  el.detailDialog.showModal();
  syncScrollLock();
}

function sectionRank(section) {
  return { backlog: 0, upcoming: 1, wanted: 2 }[section] ?? 3;
}

function metaFor(game) {
  const values = [];
  if (game.platform) values.push(platformBadge(game.platform));
  ownerTags(game).filter((owner) => owner !== "Xavi").forEach((owner) => values.push(ownerBadge(owner)));
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
    game.coop ? `<span class="coop-pill">Coop</span>` : "",
    game.replayCount ? replayBadge(game.replayCount) : "",
    game.platinum ? `<span class="platinum-pill">${trophyIcon()} Completed</span>` : "",
  ].filter(Boolean).join("");
}

function playDatesFor(game) {
  const values = [];
  const formatDate = game.completedAt ? formatLongDate : formatShortDate;
  if (game.startedAt) values.push(`<span class="history-pill history-date-pill"><small>Started</small><strong>${escapeHtml(formatDate(game.startedAt))}</strong></span>`);
  if (game.completedAt) values.push(`<span class="history-pill history-date-pill"><small>Done</small><strong>${escapeHtml(formatDate(game.completedAt))}</strong></span>`);
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
  return sectionRank(a.section) - sectionRank(b.section)
    || stringCompare(a.title, b.title);
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
        <img src="${escapeHtml(logo)}" alt="" loading="lazy">
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

function pauseIcon() {
  return `
    <svg class="pause-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 5v14"></path>
      <path d="M16 5v14"></path>
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
  (game.genres || []).forEach((genre) => chips.push(chip(genre, "genre")));
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
  const url = coverDisplayUrl(value, "tiny");
  return url || String(value || "");
}

function coverDisplayUrl(value, size = "card") {
  const replacement = size === "tiny" ? "t_thumb" : "t_cover_big";
  return String(value || "").replace(
    /images\.igdb\.com\/igdb\/image\/upload\/[^/]+\//,
    `images.igdb.com/igdb/image/upload/${replacement}/`
  );
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
      <img src="${escapeHtml(icon)}" alt="">
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

function pricesFor(game) {
  const prices = normalizedPrices(game);
  const best = prices.filter((price) => price.numericPrice).sort((a, b) => a.numericPrice - b.numericPrice)[0];
  return prices.map((price) => {
    const hasPrice = Boolean(price.price);
    const label = hasPrice ? price.price : "- €";
    const cls = ["price-link", best?.store === price.store && hasPrice ? "best" : "", hasPrice ? "has-price" : "missing-price"].filter(Boolean).join(" ");
    return `
      <a class="${cls}" href="${escapeHtml(price.url)}" target="_blank" rel="noreferrer" title="${escapeHtml(price.store)}" aria-label="${escapeHtml(`${price.store}: ${label}`)}">
        <img class="store-icon" src="${escapeHtml(storeIcon(price.store))}" alt="">
        <strong>${escapeHtml(label)}</strong>
      </a>
    `;
  }).join("");
}

function fallbackPriceLinks(game) {
  const q = retailQuery(game.title, game.platform);
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
  return PROVIDERS.map((store) => {
    const price = existing.get(store);
    return price || fallbackPriceLinks(game).find((item) => item.store === store);
  });
}

function storeIcon(store) {
  if (store === "Amazon.es") return "assets/stores/amazon.ico";
  if (store === "Xtralife") return "assets/stores/xtralife.ico";
  if (store === "GAME.es") return "assets/stores/game.ico";
  if (store === "Playasia") return "assets/stores/playasia.ico";
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
  await saveCurrentFormGame();
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
    const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
    const data = await response.json();
    renderLookupResults(data.results || []);
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
  const query = el.fields.title.value.trim();
  if (query.length < 3) return;
  titleLookupTimer = setTimeout(async () => {
    el.lookupInput.value = query;
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
      if (result.releaseDate && result.releaseDate !== game.releaseDate) {
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
  const response = await fetch(`/api/search?q=${encodeURIComponent(title)}`);
  if (!response.ok) return null;
  const data = await response.json();
  return data.results?.[0] || null;
}

async function refreshCurrentPrices() {
  const title = el.fields.title.value.trim();
  if (!title) return;
  const savedGame = await saveCurrentFormGame();
  if (savedGame.section === "backlog") return;
  el.pricesButton.textContent = "Refreshing...";
  try {
    const data = await fetchPrices(savedGame.title, savedGame.platform);
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
  game.prices = PROVIDERS.map((store) => ({
    ...fallbackPriceLinks(game).find((item) => item.store === store),
    checkedAt: "",
  }));
  persistLocal();
  try {
    const data = await fetchPrices(game.title, game.platform);
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
    el.fetchPricesButton.innerHTML = `<span class="button-label">Prices ${index + 1}/${games.length}</span>`;
    game.prices = PROVIDERS.map((store) => ({
      ...fallbackPriceLinks(game).find((item) => item.store === store),
      checkedAt: "",
    }));
    try {
      const data = await fetchPrices(game.title, game.platform);
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
  alert(`Updated prices for ${updated} games${failed ? `, ${failed} failed` : ""}.`);
}

async function fetchPrices(title, platform) {
  const response = await fetch(`/api/prices?title=${encodeURIComponent(title)}&platform=${encodeURIComponent(platform)}`);
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
