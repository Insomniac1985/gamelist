const STORAGE_KEY = "gamelist:v1";
const LEGACY_STORAGE_KEY = "buylist-tracker:v6";
const SESSION_KEY = "gamelist-editor";
const PROVIDERS = ["Amazon.es", "Xtralife", "GAME.es"];
const STATUS_OPTIONS = [
  "To Collect",
  "Scarce",
  "Waiting for Physical",
];
let titleLookupTimer = 0;

const state = {
  games: [],
  filters: { query: "", platform: "all", tag: "all", sort: "time", direction: "asc", preordered: false },
  editingId: "",
  pendingDescription: "",
  canEdit: sessionStorage.getItem(SESSION_KEY) === "true",
  draggingId: "",
  mobileSection: "backlog",
  historyYear: String(new Date().getFullYear()),
};

const el = {
  playingSection: document.querySelector("#playingSection"),
  playingCount: document.querySelector("#playingCount"),
  playingList: document.querySelector(".playing-list"),
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
  detailTitle: document.querySelector("#detailTitle"),
  detailStudio: document.querySelector("#detailStudio"),
  detailMeta: document.querySelector("#detailMeta"),
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
  el.fetchDataButton.addEventListener("click", refreshAllGameData);
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
  el.dialog.addEventListener("close", syncScrollLock);
  el.mobileTabs.forEach((button) => button.addEventListener("click", () => {
    state.mobileSection = button.dataset.mobileSection;
    render();
  }));
  el.fields.section.addEventListener("change", syncDialogPriceVisibility);
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
  el.loginButton.innerHTML = state.canEdit ? "View" : pencilIcon();
  el.loginButton.title = state.canEdit ? "View" : "Edit";
  el.loginButton.setAttribute("aria-label", el.loginButton.title);
  el.addButton.hidden = !state.canEdit;
  el.fetchDataButton.hidden = !state.canEdit;
  el.fetchPricesButton.hidden = !state.canEdit;
  renderFilters();
  renderPlayingSection();
  renderStats();
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
  document.body.classList.toggle("dialog-open", el.dialog.open || el.detailDialog.open || el.historyDialog.open);
}

function renderPlayingSection() {
  const games = activeGames().filter((game) => game.playing);
  games.sort(comparePlayingGames);
  el.playingSection.hidden = !games.length;
  el.playingCount.textContent = `${games.length} ${games.length === 1 ? "game" : "games"}`;
  el.playingList.innerHTML = "";
  games.forEach((game) => el.playingList.appendChild(cardFor(game, { staticCard: true })));
}

function renderStats() {
  const active = activeGames();
  const total = active.length || 1;
  const currentYear = String(new Date().getFullYear());
  const completedThisYear = completedGamesForYear(currentYear).length;
  const counts = {
    wanted: active.filter((game) => game.section === "wanted").length,
    upcoming: active.filter((game) => game.section === "upcoming").length,
    backlog: active.filter((game) => game.section === "backlog").length,
    completed: state.games.filter((game) => game.completedAt && !game.deletedAt).length,
  };
  const platformStats = statGroup("Platforms", topCounts(active, (game) => game.platform), total);
  el.stats.innerHTML = [
    stat("Backlog", counts.backlog, "backlog"),
    stat("To Release", counts.upcoming, "release"),
    stat("Available", counts.wanted, "available"),
    stat(`Done ${currentYear}`, completedThisYear, "done", { action: "history" }),
    platformStats,
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
    if (node) node.textContent = `${count} ${count === 1 ? "game" : "games"}`;
  }
}

function stat(label, value, tone = "", options = {}) {
  const attrs = options.action ? ` role="button" tabindex="0" data-stat-action="${escapeHtml(options.action)}"` : "";
  return `<div class="stat ${tone ? `stat-${tone}` : ""} ${options.action ? "stat-action" : ""}"${attrs}><strong>${value}</strong><span>${label}</span></div>`;
}

function statGroup(label, counts, total) {
  const body = counts.length
    ? counts.map(([name, count]) => {
      const share = Math.round((count / total) * 100);
      return `
        <span class="stat-platform" title="${escapeHtml(`${name}: ${count} games · ${share}%`)}">
          ${platformBadge(name, count)}
        </span>
      `;
    }).join("")
    : `<span class="stat-platform" title="None: 0 games · 0%"><span class="platform-badge platform-generic"><span class="platform-label">None</span></span><small>0</small></span>`;
  return `<div class="stat stat-wide stat-group"><strong>${escapeHtml(label)}</strong><div>${body}</div></div>`;
}

function topCounts(games, mapper) {
  const counts = new Map();
  games.forEach((game) => {
    const values = [mapper(game)].flat().filter(Boolean);
    values.forEach((value) => counts.set(value, (counts.get(value) || 0) + 1));
  });
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || stringCompare(a[0], b[0])).slice(0, 5);
}

function renderMobileTabs() {
  el.mobileTabs.forEach((button) => {
    const active = button.dataset.mobileSection === state.mobileSection;
    button.classList.toggle("active", active);
  });
  document.body.dataset.mobileSection = state.mobileSection;
}

function renderFilters() {
  const active = state.games.filter((game) => !game.deletedAt);
  const platforms = unique(active.map((game) => game.platform).filter(Boolean));
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
    <div class="completed-row" data-id="${escapeHtml(game.id)}">
      <img class="completed-cover" src="${escapeHtml(game.cover || "")}" alt="" loading="lazy" decoding="async" ${game.cover ? "" : "hidden"}>
      <div>
        <strong>${escapeHtml(game.title)}</strong>
        <span>${escapeHtml(game.platform || "")}</span>
        <span class="completed-dates">${escapeHtml(historyRangeText(game))}</span>
        <div class="completed-date-edit">
          <label><span>Start</span><input class="completed-start-input" type="date" value="${escapeHtml(dateOnly(game.startedAt))}"></label>
          <label><span>Done</span><input class="completed-end-input" type="date" value="${escapeHtml(dateOnly(game.completedAt))}"></label>
        </div>
      </div>
      <button class="ghost-button completed-edit-action" type="button">Edit</button>
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
    row.querySelector(".completed-start-input").addEventListener("change", (event) => updateCompletedDate(row.dataset.id, "startedAt", event.target.value));
    row.querySelector(".completed-end-input").addEventListener("change", (event) => updateCompletedDate(row.dataset.id, "completedAt", event.target.value));
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
        <span>${escapeHtml(historyRangeText(game))}</span>
      </div>
      <button class="ghost-button history-edit-action" type="button">Edit</button>
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
  const start = formatShortDate(game.startedAt);
  const done = formatShortDate(game.completedAt);
  if (start && done) return `${start} -> ${done}`;
  if (done) return `Done ${done}`;
  if (start) return `Started ${start}`;
  return "No dates";
}

function updateCompletedDate(id, key, value) {
  if (!state.canEdit) return;
  const game = getGame(id);
  if (!game) return;
  game[key] = value;
  if (key === "completedAt" && !value) {
    game.section = "backlog";
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
      && (state.filters.platform === "all" || game.platform === state.filters.platform)
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
  card.querySelector(".chips").innerHTML = chipsFor(game).join("");
  const description = card.querySelector(".notes");
  description.textContent = shortDescription(game.description || "");
  description.hidden = !description.textContent;
  const prices = card.querySelector(".prices");
  const priceRefreshAction = card.querySelector(".price-refresh-action");
  const boughtAction = card.querySelector(".bought-action");
  if (game.section === "backlog") {
    prices.remove();
    priceRefreshAction.remove();
    boughtAction.remove();
  } else {
    prices.innerHTML = pricesFor(game);
    priceRefreshAction.addEventListener("click", () => refreshPricesForGame(game.id));
    boughtAction.addEventListener("click", () => moveToBacklog(game.id));
  }
  card.querySelector(".edit-action").addEventListener("click", () => openEditor(game.id));
  card.querySelector(".cover-button").addEventListener("click", () => openDetail(game.id));
  card.querySelector(".complete-action").hidden = game.section !== "backlog";
  card.querySelector(".complete-action").addEventListener("click", () => completeGame(game.id));
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
  if (game.coop) values.push(`<span class="coop-pill">Coop</span>`);
  if (game.playing) values.push(`<span class="playing-pill">Playing</span>`);
  if (game.startedAt) values.push(`<span class="history-pill">Started ${escapeHtml(formatShortDate(game.startedAt))}</span>`);
  if (game.completedAt) values.push(`<span class="history-pill">Done ${escapeHtml(formatShortDate(game.completedAt))}</span>`);
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
    return direction * (stringCompare(a.platform, b.platform) || stringCompare(a.title, b.title));
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

function pencilIcon() {
  return `
    <svg class="pencil-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 20h4l11-11a2.8 2.8 0 0 0-4-4L4 16v4Z"></path>
      <path d="M13.5 6.5l4 4"></path>
    </svg>
  `;
}

function platformLogo(platform) {
  const value = platform.toLowerCase();
  if (value.includes("switch")) return "assets/platforms/switch.png?v=official";
  if (value.includes("ps5") || value.includes("ps4") || value.includes("playstation")) return "assets/platforms/playstation.png?v=official";
  if (value.includes("xbox")) return "assets/platforms/xbox.png?v=png";
  if (value.includes("pc")) return "assets/platforms/steam.png?v=official";
  return "assets/platforms/game.png?v=png";
}

function platformClass(platform) {
  const value = platform.toLowerCase();
  if (value.includes("switch")) return "platform-nintendo";
  if (value.includes("ps5") || value.includes("ps4") || value.includes("playstation")) return "platform-playstation";
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

function normalizeGameRecords(games) {
  return Array.isArray(games) ? games.map(normalizeGameRecord) : [];
}

function normalizeGameRecord(game) {
  const normalized = { ...game };
  normalized.digital = Boolean(normalized.digital);
  normalized.coop = Boolean(normalized.coop);
  normalized.playing = Boolean(normalized.playing);
  normalized.startedAt = dateOnly(normalized.startedAt);
  normalized.completedAt = dateOnly(normalized.completedAt);
  normalized.platform = String(normalized.platform || "").trim();
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
  return PROVIDERS.map((store) => {
    const price = existing.get(store);
    return price || fallbackPriceLinks(game).find((item) => item.store === store);
  });
}

function storeIcon(store) {
  if (store === "Amazon.es") return "https://www.amazon.es/favicon.ico";
  if (store === "Xtralife") return "https://www.xtralife.com/favicon.ico";
  if (store === "GAME.es") return "https://www.game.es/favicon.ico";
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

function openEditor(id = "") {
  if (!state.canEdit) return;
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
    playing: false,
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
  const playing = el.fields.playing.checked && !completedAt;
  const section = playing ? "backlog" : el.fields.section.value;
  const startedAt = el.fields.startedAt.value || (playing && !existing?.startedAt ? todayDate() : existing?.startedAt || "");
  const game = {
    ...(existing || blankGame()),
    id,
    title: el.fields.title.value.trim(),
    platform: el.fields.platform.value.trim(),
    section,
    releaseDate: el.fields.releaseDate.value,
    releaseText: el.fields.releaseText.value.trim(),
    lengthHours: el.fields.length.value ? Number(el.fields.length.value) : null,
    startedAt,
    completedAt,
    preorderStore: el.fields.preorderStore.value.trim(),
    preferredStore: el.fields.preferredStore.value.trim(),
    owners: ownerInputValues(el.fields.owners.value),
    statuses: listFrom(el.fields.statuses.value).map(canonicalStatus).filter(Boolean),
    digital: el.fields.digital.checked,
    coop: el.fields.coop.checked,
    playing,
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

function completeGame(id) {
  const game = getGame(id);
  game.startedAt = game.startedAt || todayDate();
  game.completedAt = todayDate();
  game.playing = false;
  game.updatedAt = new Date().toISOString();
  upsertGame(game);
}

function restoreCompletedToBacklog(id) {
  const game = getGame(id);
  if (!game) return;
  game.completedAt = "";
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
  const password = prompt("Editor password");
  if (!password) return;
  const ok = await verifyPassword(password);
  if (!ok) {
    alert("Wrong password.");
    return;
  }
  state.canEdit = true;
  sessionStorage.setItem(SESSION_KEY, "true");
  sessionStorage.setItem(`${SESSION_KEY}:password`, password);
  render();
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
  const games = state.games.filter((game) => !game.deletedAt && !game.completedAt && (shouldRefreshRelease(game) || shouldMoveReleasedToAvailable(game)));
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

  const originalText = el.fetchPricesButton.textContent;
  el.fetchPricesButton.disabled = true;
  let updated = 0;
  let failed = 0;

  for (const [index, game] of games.entries()) {
    el.fetchPricesButton.textContent = `Prices ${index + 1}/${games.length}`;
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
  el.fetchPricesButton.textContent = originalText;
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
