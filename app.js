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
  filters: { query: "", platform: "all", tag: "all", sort: "title", direction: "asc", preordered: false },
  editingId: "",
  pendingDescription: "",
  canEdit: sessionStorage.getItem(SESSION_KEY) === "true",
  draggingId: "",
  mobileSection: "wanted",
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
  detailTitle: document.querySelector("#detailTitle"),
  detailStudio: document.querySelector("#detailStudio"),
  detailMeta: document.querySelector("#detailMeta"),
  detailChips: document.querySelector("#detailChips"),
  detailDescription: document.querySelector("#detailDescription"),
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
    preorderStore: document.querySelector("#preorderStoreInput"),
    preferredStore: document.querySelector("#preferredStoreInput"),
    owners: document.querySelector("#ownersInput"),
    statuses: document.querySelector("#statusesInput"),
    digital: document.querySelector("#digitalInput"),
    playing: document.querySelector("#playingInput"),
    genres: document.querySelector("#genresInput"),
    developer: document.querySelector("#developerInput"),
    publisher: document.querySelector("#publisherInput"),
    cover: document.querySelector("#coverInput"),
    notes: document.querySelector("#notesInput"),
  },
};

init();

async function init() {
  document.body.classList.toggle("can-edit", state.canEdit);
  bindEvents();
  await loadData();
  await pullCloudData();
  refreshUnreleasedGamesOnOpen();
  refreshMissingDescriptionsOnOpen();
  render();
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
  el.loginButton.textContent = state.canEdit ? "Viewing" : "Edit";
  el.addButton.hidden = !state.canEdit;
  el.fetchDataButton.hidden = !state.canEdit;
  el.fetchPricesButton.hidden = !state.canEdit;
  renderFilters();
  renderPlayingSection();
  renderStats();
  renderMobileTabs();
  renderSection("wanted");
  renderSection("upcoming");
  renderSection("backlog");
  renderCompleted();
  el.sortDirectionButton.textContent = state.filters.direction === "asc" ? "↑" : "↓";
  el.sortDirectionButton.title = state.filters.direction === "asc" ? "Sort ascending" : "Sort descending";
  el.sortDirectionButton.setAttribute("aria-label", el.sortDirectionButton.title);
  el.sortDirectionButton.classList.toggle("desc", state.filters.direction === "desc");
  el.preorderedFilter.checked = state.filters.preordered;
}

function renderPlayingSection() {
  const games = activeGames().filter((game) => game.playing);
  games.sort((a, b) => sectionRank(a.section) - sectionRank(b.section) || compareGames(a, b, a.section));
  el.playingSection.hidden = !games.length;
  el.playingCount.textContent = `${games.length} ${games.length === 1 ? "game" : "games"}`;
  el.playingList.innerHTML = "";
  games.forEach((game) => el.playingList.appendChild(cardFor(game, { staticCard: true })));
}

function renderStats() {
  const active = activeGames();
  const counts = {
    wanted: active.filter((game) => game.section === "wanted").length,
    upcoming: active.filter((game) => game.section === "upcoming").length,
    backlog: active.filter((game) => game.section === "backlog").length,
    completed: state.games.filter((game) => game.completedAt && !game.deletedAt).length,
  };
  const platformStats = statGroup("Platforms", topCounts(active, (game) => game.platform));
  const categoryStats = statGroup("Categories", topCounts(active, (game) => game.genres || []));
  el.stats.innerHTML = [
    stat("Available", counts.wanted),
    stat("To Release", counts.upcoming),
    stat("Backlog", counts.backlog),
    stat("Done", counts.completed),
    platformStats,
    categoryStats,
  ].join("");
  for (const [section, count] of Object.entries(counts)) {
    const node = document.querySelector(`#${section}Count`);
    if (node) node.textContent = `${count} ${count === 1 ? "game" : "games"}`;
  }
}

function stat(label, value) {
  return `<div class="stat"><strong>${value}</strong><span>${label}</span></div>`;
}

function statGroup(label, counts) {
  const body = counts.length
    ? counts.map(([name, count]) => `<span>${escapeHtml(name)} <strong>${count}</strong></span>`).join("")
    : `<span>None <strong>0</strong></span>`;
  return `<div class="stat stat-wide"><strong>${escapeHtml(label)}</strong><div>${body}</div></div>`;
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
  games.forEach((game) => list.appendChild(cardFor(game)));
  if (section === "backlog" && state.filters.sort === "custom") setupDrag(list);
}

function renderCompleted() {
  const list = document.querySelector(".completed-list");
  const games = filteredGames().filter((game) => game.completedAt);
  games.sort((a, b) => String(b.completedAt).localeCompare(String(a.completedAt)));
  list.innerHTML = games.length ? games.map((game) => `
    <div class="completed-row" data-id="${escapeHtml(game.id)}">
      <div>
        <strong>${escapeHtml(game.title)}</strong>
        <span>${escapeHtml(game.platform || "")}</span>
      </div>
      <button class="ghost-button restore-action" type="button">Backlog</button>
    </div>
  `).join("") : `<div class="empty">Completed games will stay saved here.</div>`;
  list.querySelectorAll(".restore-action").forEach((button) => {
    button.addEventListener("click", () => restoreCompletedToBacklog(button.closest(".completed-row").dataset.id));
  });
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
      game.playing ? "playing" : "",
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
  img.src = game.cover || "";
  img.alt = game.cover ? `${game.title} cover` : "";
  card.classList.toggle("has-art", Boolean(game.cover));
  if (game.cover) card.style.setProperty("--card-art", `url("${cssUrl(game.cover)}")`);
  card.querySelector(".cover-button span").hidden = Boolean(game.cover);
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
  if (game.section === "backlog") prices.remove();
  else prices.innerHTML = pricesFor(game);
  card.querySelector(".edit-action").addEventListener("click", () => openEditor(game.id));
  card.querySelector(".cover-button").addEventListener("click", () => openEditor(game.id));
  card.querySelector(".price-refresh-action").hidden = game.section === "backlog";
  card.querySelector(".price-refresh-action").addEventListener("click", () => refreshPricesForGame(game.id));
  card.querySelector(".bought-action").hidden = game.section === "backlog";
  card.querySelector(".bought-action").addEventListener("click", () => moveToBacklog(game.id));
  card.querySelector(".complete-action").hidden = game.section !== "backlog";
  card.querySelector(".complete-action").addEventListener("click", () => completeGame(game.id));
  card.querySelector(".delete-action").addEventListener("click", () => deleteGame(game.id));
  card.addEventListener("click", (event) => {
    if (event.target.closest("button, a")) return;
    openDetail(game.id);
  });
  return card;
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
  el.detailDescription.textContent = game.description || "No description yet.";
  el.detailCover.hidden = !game.cover;
  el.detailCover.src = game.cover || "";
  el.detailCover.alt = game.cover ? `${game.title} cover` : "";
  el.detailDialog.showModal();
}

function sectionRank(section) {
  return { wanted: 0, upcoming: 1, backlog: 2 }[section] ?? 3;
}

function metaFor(game) {
  const values = [];
  if (game.platform) values.push(platformBadge(game.platform));
  const release = releaseStatus(game);
  if (release) values.push(`<span class="release-pill">${escapeHtml(release)}</span>`);
  if (game.lengthHours) values.push(timeBadge(game.lengthHours));
  if (game.playing) values.push(`<span class="playing-pill">Playing</span>`);
  if (game.digital) values.push(`<span class="digital-pill">Digital</span>`);
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

function compareReleaseDates(a, b) {
  return releaseSortValue(a) - releaseSortValue(b);
}

function releaseSortValue(game) {
  return game.releaseDate ? new Date(`${game.releaseDate}T00:00:00`).getTime() : Number.POSITIVE_INFINITY;
}

function stringCompare(a = "", b = "") {
  return a.localeCompare(b, undefined, { sensitivity: "base" });
}

function platformBadge(platform) {
  const cls = platformClass(platform);
  const logo = platformLogo(platform);
  return `
    <span class="platform-badge ${cls}" title="${escapeHtml(platform)}">
      <span class="platform-icon">
        <img src="${escapeHtml(logo)}" alt="" loading="lazy">
      </span>
      <span class="platform-label">${escapeHtml(platform)}</span>
    </span>
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
  ownerTags(game).filter((owner) => owner !== "Xavi").forEach((owner) => chips.push(chip(owner, owner.toLowerCase())));
  gameStatuses(game).forEach((status) => chips.push(chip(status, statusType(status))));
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
  normalized.playing = Boolean(normalized.playing);
  normalized.description = String(normalized.description || "");
  normalized.owners = ownerTags(normalized);
  normalized.statuses = gameStatuses(normalized);
  normalized.genres = Array.isArray(normalized.genres) ? normalized.genres : [];
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
  el.fields.preorderStore.value = game.preorderStore || "";
  el.fields.preferredStore.value = game.preferredStore || "";
  el.fields.owners.value = ownerTags(game).join(", ");
  el.fields.statuses.value = gameStatuses(game).join(", ");
  el.fields.digital.checked = Boolean(game.digital);
  el.fields.playing.checked = Boolean(game.playing);
  el.fields.genres.value = (game.genres || []).join(", ");
  el.fields.developer.value = game.developer || "";
  el.fields.publisher.value = game.publisher || "";
  el.fields.cover.value = game.cover || "";
  el.fields.notes.value = game.notes || "";
  syncDialogPriceVisibility();
  el.dialog.showModal();
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
    playing: false,
    genres: [],
    developer: "",
    publisher: "",
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
  const id = el.fields.id.value || crypto.randomUUID();
  const existing = state.games.find((game) => game.id === id);
  const section = el.fields.section.value;
  const game = {
    ...(existing || blankGame()),
    id,
    title: el.fields.title.value.trim(),
    platform: el.fields.platform.value.trim(),
    section,
    releaseDate: el.fields.releaseDate.value,
    releaseText: el.fields.releaseText.value.trim(),
    lengthHours: el.fields.length.value ? Number(el.fields.length.value) : null,
    preorderStore: el.fields.preorderStore.value.trim(),
    preferredStore: el.fields.preferredStore.value.trim(),
    owners: ownerInputValues(el.fields.owners.value),
    statuses: listFrom(el.fields.statuses.value).map(canonicalStatus).filter(Boolean),
    digital: el.fields.digital.checked,
    playing: el.fields.playing.checked,
    genres: listFrom(el.fields.genres.value),
    developer: el.fields.developer.value.trim(),
    publisher: el.fields.publisher.value.trim(),
    cover: el.fields.cover.value.trim(),
    notes: el.fields.notes.value.trim(),
    description: existing?.description || state.pendingDescription || "",
    order: existing?.section === section ? existing.order : nextOrder(section),
    updatedAt: new Date().toISOString(),
  };
  if (game.section === "backlog") game.prices = [];
  await normalizeGameBeforeSave(game);
  upsertGame(game);
  el.dialog.close();
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
  game.prices = [];
  game.order = nextOrder("backlog");
  game.updatedAt = new Date().toISOString();
  upsertGame(game);
}

function completeGame(id) {
  const game = getGame(id);
  game.completedAt = new Date().toISOString();
  game.updatedAt = game.completedAt;
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
  el.lookupResults.innerHTML = `<div class="empty">Searching...</div>`;
  try {
    const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
    const data = await response.json();
    renderLookupResults(data.results || []);
  } catch {
    renderLookupResults([]);
  }
}

function renderLookupResults(results) {
  if (!results.length) {
    el.lookupResults.innerHTML = `<div class="empty">No API results yet. You can still fill the game manually.</div>`;
    return;
  }
  el.lookupResults.innerHTML = "";
  results.slice(0, 5).forEach((result) => {
    const row = document.createElement("div");
    row.className = "lookup-result";
    row.innerHTML = `
      <img src="${escapeHtml(result.cover || "")}" alt="">
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
}

function applyLookup(result) {
  el.fields.title.value = result.title || el.fields.title.value;
  el.fields.releaseDate.value = result.releaseDate || el.fields.releaseDate.value;
  el.fields.releaseText.value = result.releaseDate ? "" : (result.releaseText || el.fields.releaseText.value);
  el.fields.length.value = result.lengthHours || el.fields.length.value;
  el.fields.cover.value = result.cover || el.fields.cover.value;
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
    const result = await lookupFirstResult(game.title);
    if (!result) return;
    if (!game.releaseDate && !game.releaseText) {
      game.releaseDate = result.releaseDate || "";
      game.releaseText = result.releaseDate ? "" : (result.releaseText || "");
    }
    game.cover = game.cover || result.cover || "";
    game.description = game.description || result.description || "";
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
  const games = state.games.filter((game) => !game.deletedAt && !game.completedAt && shouldRefreshRelease(game));
  if (!games.length) return;
  let changed = false;
  for (const game of games.slice(0, 25)) {
    try {
      let localChanged = false;
      const result = await lookupFirstResult(game.title);
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

async function refreshMissingDescriptionsOnOpen() {
  const games = activeGames().filter((game) => !game.description && game.title).slice(0, 20);
  if (!games.length) return;
  let changed = false;
  for (const game of games) {
    try {
      const result = await lookupFirstResult(game.title);
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
      const result = await lookupFirstResult(game.title);
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
  const platform = el.fields.platform.value.trim();
  if (el.fields.section.value === "backlog") return;
  if (!title) return;
  el.pricesButton.textContent = "Refreshing...";
  try {
    const data = await fetchPrices(title, platform);
    const id = el.fields.id.value;
    if (id) {
      const game = getGame(id);
      if (game) {
        game.prices = data.prices || [];
        upsertGame(game);
      }
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
      const scale = Math.min(1, maxWidth / image.width);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(image.width * scale);
      canvas.height = Math.round(image.height * scale);
      const context = canvas.getContext("2d");
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/webp", 0.82));
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
