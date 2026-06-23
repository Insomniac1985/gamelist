const SESSION_KEY = "gamelist-editor";
const SITE_VERSION = "v156";
const VERSION_STORAGE_KEY = "gamelist:site-version";
const VIEW_KEY = "shelf:view-mode:v2";
const LAYOUT_KEY = "shelf:layout:v2";
const LOCAL_DRAFT_KEY = "shelf:draft-data:v2";
const DEFAULT_LAYOUT = ["playing", "latestFinished", "trophies", "kpis", "filters", "library"];
const DEFAULT_HIDDEN_MODULES = ["playing", "latestFinished", "trophies"];
const MODULE_NAMES = { playing: "Playing carousel", latestFinished: "Last finished carousel", trophies: "Trophy card", kpis: "Collection highlights", filters: "Search and filters", library: "Shelf" };
const PLATFORM_OPTIONS = [
  "Nintendo Switch", "Nintendo Switch 2", "Sony PlayStation 5", "Sony PlayStation 4",
  "Sony PlayStation 2", "Sony PlayStation", "Nintendo 3DS", "Nintendo DS", "Nintendo 64",
];
const COUNTRY_OPTIONS = [
  ["United Kingdom", "United Kingdom"], ["Spain", "Spain"], ["United States of America", "United States"],
  ["Japan", "Japan"], ["Taiwan", "Taiwan"], ["France", "France"], ["Germany", "Germany"],
  ["Australia", "Australia"], ["China", "China"], ["World", "World"],
];

const state = {
  sourceGames: [],
  additions: [],
  overrides: {},
  games: [],
  gamelistGames: [],
  gamelistSettings: {},
  trophyActivity: null,
  canEdit: sessionStorage.getItem(SESSION_KEY) === "true",
  editingId: "",
  lookupResults: [],
  filters: { query: "", platform: "all", region: "all", condition: "all", category: "all", tab: "all", sort: "platform" },
  viewMode: localStorage.getItem(VIEW_KEY) === "list" ? "list" : "grid",
  layout: loadLayout(),
};

const el = {
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
  view: document.querySelector("#viewToggleButton"),
  clear: document.querySelector("#clearFilters"),
  login: document.querySelector("#loginButton"),
  addButton: document.querySelector("#addGameButton"),
  layoutButton: document.querySelector("#layoutButton"),
  modules: document.querySelector("#shelfModules"),
  tabs: document.querySelector("#shelfTabs"),
  playingCarousel: document.querySelector("#playingCarousel"),
  finishedCarousel: document.querySelector("#finishedCarousel"),
  trophyCard: document.querySelector("#shelfTrophyCard"),
  footerUpdate: document.querySelector("#footerDataUpdate"),
  footerVersion: document.querySelector("#footerVersion"),
  scrollTop: document.querySelector("#scrollTopButton"),
  detailDialog: document.querySelector("#detailDialog"),
  detailClose: document.querySelector("#detailClose"),
  detailTitle: document.querySelector("#detailTitle"),
  detailEyebrow: document.querySelector("#detailEyebrow"),
  detailCover: document.querySelector("#detailCover"),
  detailChips: document.querySelector("#detailChips"),
  detailList: document.querySelector("#detailList"),
  detailNote: document.querySelector("#detailNote"),
  detailActions: document.querySelector("#detailActions"),
  detailCondition: document.querySelector("#detailCondition"), detailLinks: document.querySelector("#detailLinks"),
  detailGuideLinks: document.querySelector("#detailGuideLinks"), detailStorePrices: document.querySelector("#detailStorePrices"),
  fetchValue: document.querySelector("#fetchValueButton"), detailPriceSummary: document.querySelector("#detailPriceSummary"),
  detailPriceGraph: document.querySelector("#detailPriceGraph"), detailTrophies: document.querySelector("#shelfDetailTrophies"),
  detailTrophyCount: document.querySelector("#shelfTrophyCount"), detailTrophyList: document.querySelector("#shelfTrophyList"),
  addDialog: document.querySelector("#addDialog"),
  addForm: document.querySelector("#addGameForm"),
  addClose: document.querySelector("#addClose"),
  addCancel: document.querySelector("#addCancel"),
  lookupInput: document.querySelector("#lookupInput"),
  lookupButton: document.querySelector("#lookupButton"),
  lookupResults: document.querySelector("#lookupResults"),
  fields: {
    title: document.querySelector("#titleInput"), platform: document.querySelector("#platformInput"),
    country: document.querySelector("#countryInput"), price: document.querySelector("#priceInput"),
    owners: document.querySelector("#ownersInput"), category: document.querySelector("#categoryInput"),
    releaseDate: document.querySelector("#releaseDateInput"), trophyName: document.querySelector("#trophyNameInput"),
    websites: document.querySelector("#websitesInput"),
    publisher: document.querySelector("#publisherInput"), developer: document.querySelector("#developerInput"),
    genre: document.querySelector("#genreInput"), cover: document.querySelector("#coverInput"), notes: document.querySelector("#notesInput"),
    coverProject: document.querySelector("#coverProjectInput"),
  },
  coverProjectButton: document.querySelector("#coverProjectButton"),
  conditionFields: { game: document.querySelector("#conditionGameInput"), manual: document.querySelector("#conditionManualInput"), box: document.querySelector("#conditionBoxInput"), other: document.querySelector("#conditionOtherInput"), sealed: document.querySelector("#conditionSealedInput") },
  layoutDialog: document.querySelector("#layoutDialog"),
  layoutForm: document.querySelector("#layoutForm"),
  layoutClose: document.querySelector("#layoutClose"),
  layoutList: document.querySelector("#layoutList"),
  deleteShelfButton: document.querySelector("#deleteShelfButton"),
  deleteShelfDialog: document.querySelector("#deleteShelfDialog"), deleteShelfForm: document.querySelector("#deleteShelfForm"),
  deleteShelfClose: document.querySelector("#deleteShelfClose"), deleteShelfCancel: document.querySelector("#deleteShelfCancel"),
  deleteShelfPassword: document.querySelector("#deleteShelfPassword"), deleteShelfError: document.querySelector("#deleteShelfError"),
  deleteShelfConfirm: document.querySelector("#deleteShelfConfirm"),
  authDialog: document.querySelector("#authDialog"),
  authForm: document.querySelector("#authForm"),
  authClose: document.querySelector("#authClose"),
  authCancel: document.querySelector("#authCancel"),
  authPassword: document.querySelector("#authPasswordInput"),
  authError: document.querySelector("#authError"),
};

init();

async function init() {
  if (await checkSiteVersion()) return;
  registerServiceWorker();
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
  state.canEdit = state.canEdit || auth;
  state.updatedAt = shelfData?.updatedAt || "";
  state.gamelistGames = gamelistData?.games || [];
  state.gamelistSettings = gamelistData?.settings || {};
  loadTrophyActivity();
  rebuildGames();
  renderAll();
}

function bindEvents() {
  el.search.addEventListener("input", () => { state.filters.query = el.search.value.trim().toLowerCase(); renderLibrary(); });
  el.platform.addEventListener("change", () => { state.filters.platform = el.platform.value; renderLibrary(); });
  el.region.addEventListener("change", () => { state.filters.region = el.region.value; renderLibrary(); });
  el.condition.addEventListener("change", () => { state.filters.condition = el.condition.value; renderLibrary(); });
  el.category.addEventListener("change", () => { state.filters.category = el.category.value; renderLibrary(); });
  el.sort.addEventListener("change", () => { state.filters.sort = el.sort.value; renderLibrary(); });
  el.view.addEventListener("click", toggleView);
  el.clear.addEventListener("click", clearFilters);
  el.login.addEventListener("click", toggleEditMode);
  el.addButton.addEventListener("click", () => openEditor());
  el.layoutButton.addEventListener("click", openLayout);
  el.scrollTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  el.footerVersion.addEventListener("click", clearSiteCachesAndReload);
  window.addEventListener("scroll", () => el.scrollTop.classList.toggle("visible", window.scrollY > 420), { passive: true });
  window.addEventListener("storage", (event) => { if (event.key === "gamelist-editor-signal") refreshSharedAuth(); });
  window.addEventListener("focus", refreshSharedAuth);

  el.shelf.addEventListener("click", handleShelfClick);
  el.detailActions.addEventListener("click", handleDetailAction);
  el.fetchValue.addEventListener("click", fetchCollectionValue);
  el.tabs.addEventListener("click", (event) => { const tab = event.target.closest("[data-shelf-tab]"); if (!tab) return; state.filters.tab = tab.dataset.shelfTab; renderLibrary(); });
  el.detailClose.addEventListener("click", () => closeDialog(el.detailDialog));
  el.detailDialog.addEventListener("click", (event) => { if (event.target === el.detailDialog) closeDialog(el.detailDialog); });

  el.addClose.addEventListener("click", () => closeDialog(el.addDialog));
  el.addCancel.addEventListener("click", () => closeDialog(el.addDialog));
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
  el.deleteShelfButton.addEventListener("click", openDeleteShelfDialog);
  el.deleteShelfClose.addEventListener("click", () => closeDialog(el.deleteShelfDialog));
  el.deleteShelfCancel.addEventListener("click", () => closeDialog(el.deleteShelfDialog));
  el.deleteShelfDialog.addEventListener("click", (event) => { if (event.target === el.deleteShelfDialog) closeDialog(el.deleteShelfDialog); });
  el.deleteShelfForm.addEventListener("submit", deletePhysicalGamesList);

  el.authClose.addEventListener("click", () => closeDialog(el.authDialog));
  el.authCancel.addEventListener("click", () => closeDialog(el.authDialog));
  el.authDialog.addEventListener("click", (event) => { if (event.target === el.authDialog) closeDialog(el.authDialog); });
  el.authForm.addEventListener("submit", submitAuth);
}

function rebuildGames() {
  const source = state.sourceGames.map((game) => ({ ...game, ...(state.overrides[game.id] || {}), sourceRecord: true }));
  state.games = [...source, ...state.additions.map((game) => ({ ...game, sourceRecord: false }))];
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
  el.addButton.hidden = !state.canEdit;
  el.layoutButton.hidden = !state.canEdit;
  el.login.innerHTML = state.canEdit
    ? `<svg class="pause-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14"></path></svg><span class="button-label">Stop Editing</span>`
    : `<svg class="pencil-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4l11-11a2.8 2.8 0 0 0-4-4L4 16v4Z"></path><path d="M13.5 6.5l4 4"></path></svg>`;
  el.login.title = state.canEdit ? "Stop Editing" : "Edit";
  el.login.setAttribute("aria-label", el.login.title);
  el.view.title = state.viewMode === "grid" ? "Show as list" : "Show as grid";
  el.footerUpdate.textContent = state.updatedAt ? `Last edit ${formatDate(state.updatedAt)}` : "Collection imported 22 Jun 2026";
  el.footerVersion.textContent = `${SITE_VERSION} · Shelf · ${state.sourceGames.length} source games${state.additions.length ? ` · ${state.additions.length} added` : ""}`;
}

function renderStats() {
  const value = state.games.reduce((sum, game) => sum + (Number(game.price) || 0), 0);
  el.stats.innerHTML = [
    [state.games.length, "Physical games", "stat-backlog"],
    [new Set(state.games.map((game) => game.platform)).size, "Platforms", "stat-available"],
    [`€${Math.round(value).toLocaleString("en")}`, "Estimated value", "stat-done"],
  ].map(([valueText, label, className]) => `<div class="stat glass ${className}"><strong>${escapeHtml(valueText)}</strong><span>${escapeHtml(label)}</span></div>`).join("");
}

function renderFilters() {
  const platforms = countValues(state.games.map((game) => game.platform));
  const countries = countValues(state.games.map((game) => game.country));
  const categories = countValues(state.games.map((game) => game.category || "Game"));
  el.platform.innerHTML = `<option value="all">All consoles (${state.games.length})</option>${platforms.map(([value, count]) => `<option value="${escapeHtml(value)}">${escapeHtml(shortPlatform(value))} (${count})</option>`).join("")}`;
  el.region.innerHTML = `<option value="all">All regions (${state.games.length})</option>${countries.map(([value, count]) => `<option value="${escapeHtml(value)}">${escapeHtml(regionName(value))} (${count})</option>`).join("")}`;
  el.category.innerHTML = `<option value="all">All categories (${state.games.length})</option>${categories.map(([value, count]) => `<option value="${escapeHtml(value)}">${escapeHtml(value)} (${count})</option>`).join("")}`;
  el.platform.value = state.filters.platform;
  el.region.value = state.filters.region;
  el.category.value = state.filters.category;
}

function renderLibrary() {
  const games = filteredGames();
  const gamelistCount = state.games.filter((game) => game.source === "gamelist" || (game.tags || []).includes("Gamelist")).length;
  el.tabs.hidden = !gamelistCount;
  el.tabs.innerHTML = gamelistCount ? `<button class="${state.filters.tab === "all" ? "active" : ""}" data-shelf-tab="all" type="button">All</button><button class="${state.filters.tab === "gamelist" ? "active" : ""}" data-shelf-tab="gamelist" type="button">Gamelist <span>${gamelistCount}</span></button>` : "";
  el.count.textContent = `${games.length} ${games.length === 1 ? "game" : "games"}`;
  el.shelf.innerHTML = games.map(gameCard).join("");
  el.shelf.querySelectorAll(".game-card.has-art").forEach(setupShelfParallax);
  el.empty.hidden = games.length > 0;
}

function filteredGames() {
  return state.games.filter((game) => {
    const haystack = `${game.title} ${game.platform} ${game.publisher} ${game.developer} ${game.genre} ${game.notes} ${(game.tags || []).join(" ")} ${(game.owners || []).join(" ")}`.toLowerCase();
    return (state.filters.platform === "all" || game.platform === state.filters.platform)
      && (state.filters.region === "all" || game.country === state.filters.region)
      && conditionMatches(game, state.filters.condition)
      && (state.filters.category === "all" || (game.category || "Game") === state.filters.category)
      && (state.filters.tab === "all" || game.source === "gamelist" || (game.tags || []).includes("Gamelist"))
      && (!state.filters.query || haystack.includes(state.filters.query));
  }).sort(sorter(state.filters.sort));
}

function gameCard(game) {
  const fallbackCover = coverUrl(game.cover || "") || platformFallback(game.platform);
  const projectCover = coverProjectUrl(game.coverProject || "");
  const cover = projectCover || fallbackCover;
  const wrapClass = projectCover ? " has-wrap" : "";
  const condition = conditionLabel(game);
  const issueClass = condition === "Loose" ? "condition-loose" : condition === "Sealed" ? "condition-sealed" : "condition-good";
  const studio = [game.developer, game.publisher && game.publisher !== game.developer ? game.publisher : ""].filter(Boolean).join(" · ");
  const owners = (game.owners || []).map((owner) => `<span class="owner-pill owner-${normalize(owner)}">${escapeHtml(owner)}</span>`).join("");
  return `<article class="game-card glass${cover ? " has-art" : ""}" data-id="${escapeHtml(game.id)}" role="button" tabindex="0"${cover ? ` style="--card-art:url('${escapeCss(cover)}')"` : ""}>
    <div class="cover-showcase ${coverClass(game.platform)}${wrapClass}" style="--cover-art:url('${escapeCss(cover)}')">
      <button class="cover-button" type="button" data-action="details" aria-label="View ${escapeHtml(game.title)}">
        <img src="${escapeHtml(cover)}" data-cover-fallback="${escapeHtml(fallbackCover)}" alt="${escapeHtml(game.title)} cover" loading="lazy" decoding="async">
      </button>
    </div>
    <div class="game-main">
      <div class="title-line"><div class="title-wrap"><h3>${escapeHtml(game.title)}</h3></div></div>
      <div class="studio-line">${escapeHtml(studio || game.genre || "Physical edition")}</div>
      <div class="meta"><span class="region-flag" title="${escapeHtml(game.country)}">${flagIcon(game.country)}</span>${platformBadge(game.platform)}</div>
      <div class="chips"><span class="chip ${issueClass}">${escapeHtml(condition)}</span>${owners}${(game.tags || []).map((tag) => `<span class="chip">${escapeHtml(tag)}</span>`).join("")}${game.genre ? `<span class="chip genre">${escapeHtml(firstGenre(game.genre))}</span>` : ""}</div>
      <div class="card-actions">${state.canEdit ? `<button class="icon-button editor-only" type="button" data-action="edit" title="Edit" aria-label="Edit">${pencilIcon()}</button>` : ""}</div>
    </div>
  </article>`;
}

function handleShelfClick(event) {
  const card = event.target.closest("[data-id]");
  const action = event.target.closest("[data-action]")?.dataset.action;
  if (!card) return;
  const game = state.games.find((item) => item.id === card.dataset.id);
  if (!game) return;
  if (action === "edit") openEditor(game);
  else openDetails(game);
}

function openDetails(game) {
  el.detailDialog.dataset.id = game.id;
  el.detailTitle.textContent = game.title;
  el.detailEyebrow.textContent = `${game.country} · ${shortPlatform(game.platform)}`;
  const fallbackCover = coverUrl(game.cover || "") || platformFallback(game.platform);
  const projectCover = coverProjectUrl(game.coverProject || "");
  el.detailCover.src = projectCover || fallbackCover;
  el.detailCover.dataset.coverFallback = fallbackCover;
  el.detailCover.parentElement.classList.toggle("has-wrap", Boolean(projectCover));
  el.detailCover.alt = `${game.title} cover`;
  el.detailChips.innerHTML = [conditionLabel(game), game.category || "Game", ...(game.tags || []), ...(game.owners || [])].filter(Boolean).map((value, index) => `<span class="chip ${index === 0 ? "accent" : ""}">${escapeHtml(value)}</span>`).join("");
  const details = [
    ["Platform", platformBadge(game.platform), true], ["Region", `${flagIcon(game.country, true)}<span>${escapeHtml(game.country)}</span>`, true],
    ["Publisher", game.publisher], ["Developer", game.developer], ["Release", game.releaseDate || "—"], ["Categories", game.genre || game.category || "Game"], ["Added", game.createdAt || "—"],
  ];
  el.detailList.innerHTML = details.map(([term, value, raw]) => `<dt>${escapeHtml(term)}</dt><dd>${raw ? value : escapeHtml(value || "—")}</dd>`).join("");
  el.detailNote.hidden = !game.notes;
  el.detailNote.textContent = game.notes || "";
  el.detailCondition.innerHTML = ["game", "manual", "box", "other", "sealed"].map((key) => `<span class="fancy-check ${conditionValue(game, key) ? "checked" : ""}"><i>${conditionValue(game, key) ? "✓" : ""}</i>${escapeHtml(key[0].toUpperCase() + key.slice(1))}</span>`).join("");
  const links = websiteLinks(game);
  el.detailLinks.innerHTML = links.map((link) => `<a href="${escapeHtml(link)}" target="_blank" rel="noreferrer">${escapeHtml(linkLabel(link))}</a>`).join("");
  el.detailGuideLinks.innerHTML = guideLinks(game).map(([label, link]) => `<a href="${escapeHtml(link)}" target="_blank" rel="noreferrer">${escapeHtml(label)}</a>`).join("");
  loadStorePrices(game);
  renderPriceDetails(game);
  loadShelfTrophies(game);
  el.detailActions.innerHTML = state.canEdit ? `<button class="ghost-button" type="button" data-detail-action="edit">Edit game</button>${game.sourceRecord ? `<button class="ghost-button" type="button" data-detail-action="reset">Reset changes</button>` : `<button class="danger-button" type="button" data-detail-action="delete">Delete</button>`}` : "";
  openDialog(el.detailDialog);
}

function handleDetailAction(event) {
  const action = event.target.closest("[data-detail-action]")?.dataset.detailAction;
  const game = state.games.find((item) => item.id === el.detailDialog.dataset.id);
  if (!action || !game || !state.canEdit) return;
  if (action === "edit") { closeDialog(el.detailDialog); openEditor(game); }
  if (action === "reset") resetGame(game);
  if (action === "delete") deleteGame(game);
}

function openEditor(game = null) {
  if (!state.canEdit) return openAuth();
  state.editingId = game?.id || "";
  state.lookupResults = [];
  el.lookupResults.innerHTML = "";
  el.lookupInput.value = game?.title || "";
  const values = game || { platform: "Nintendo Switch", country: "United Kingdom", game: true, box: true, manual: true, category: "Game" };
  for (const [key, input] of Object.entries(el.fields)) input.value = values[key] ?? "";
  el.fields.owners.value = (values.owners || []).join(", ");
  el.fields.websites.value = websiteLinks(values).join(", ");
  Object.entries(el.conditionFields).forEach(([key, input]) => { input.checked = conditionValue(values, key); });
  syncConditionInputs();
  el.addForm.querySelector(".modal-head h2").textContent = game ? "Edit physical game" : "Add physical game";
  el.addForm.querySelector("button[type='submit']").textContent = game ? "Save changes" : "Add to Shelf";
  openDialog(el.addDialog);
}

async function lookupGame() {
  const query = el.lookupInput.value.trim();
  if (!query) return;
  el.lookupButton.disabled = true;
  el.lookupButton.textContent = "Fetching…";
  el.lookupResults.innerHTML = `<div class="lookup-loading">Searching game databases…</div>`;
  try {
    const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
    const data = response.ok ? await response.json() : { results: [] };
    state.lookupResults = (data.results || []).slice(0, 8);
    el.lookupResults.innerHTML = state.lookupResults.length ? state.lookupResults.map((result, index) => {
      const platforms = (result.platforms || [result.platform]).filter(Boolean);
      return `<button class="lookup-result" type="button" data-result-index="${index}"><img src="${escapeHtml(coverUrl(result.cover || "") || "assets/Icon.png")}" alt=""><span><strong>${escapeHtml(result.title)}</strong><small>${escapeHtml(platforms.join(" · ") || "Platform unknown")}</small></span><span>Use this</span></button>`;
    }).join("") : `<div class="lookup-loading">No close match found. You can still enter the details manually.</div>`;
  } catch {
    el.lookupResults.innerHTML = `<div class="lookup-loading">Lookup is unavailable right now. Manual entry still works.</div>`;
  } finally {
    el.lookupButton.disabled = false;
    el.lookupButton.textContent = "Fetch info";
  }
}

function chooseLookupResult(event) {
  const button = event.target.closest("[data-result-index]");
  if (!button) return;
  const result = state.lookupResults[Number(button.dataset.resultIndex)];
  if (!result) return;
  el.fields.title.value = result.title || el.fields.title.value;
  el.fields.platform.value = bestCollectionPlatform(result.platforms || [result.platform], el.fields.platform.value);
  el.fields.publisher.value = result.publisher || "";
  el.fields.developer.value = result.developer || "";
  el.fields.genre.value = (result.genres || []).join(", ");
  el.fields.cover.value = result.cover || "";
  el.fields.releaseDate.value = result.releaseDate || "";
  el.fields.websites.value = Object.values(result.storeLinks || {}).filter(Boolean).join(", ");
  el.fields.category.value = (result.genres || [])[0] || "Game";
  el.lookupResults.innerHTML = `<div class="lookup-selected">Using ${escapeHtml(result.title)}. You can change any field, including its cover.</div>`;
}

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
    owners: splitValues(el.fields.owners.value), category: el.fields.category.value.trim() || "Game",
    releaseDate: el.fields.releaseDate.value, trophyName: el.fields.trophyName.value.trim(), websites: splitValues(el.fields.websites.value),
    coverProject: el.fields.coverProject.value.trim(),
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
}

async function deleteGame(game) {
  if (game.sourceRecord) return;
  state.additions = state.additions.filter((item) => item.id !== game.id);
  await persistShelf();
  rebuildGames();
  renderAll();
  closeDialog(el.detailDialog);
}

async function persistShelf() {
  const payload = { games: state.additions, overrides: state.overrides };
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
  el.layoutList.className = "layout-list";
  el.layoutList.innerHTML = state.layout.order.map((key, index) => `<div class="layout-row" data-layout-key="${key}"><strong>${MODULE_NAMES[key]}</strong><label class="check-filter"><input type="checkbox" data-layout-visible value="${key}" ${state.layout.hidden.includes(key) ? "" : "checked"}><span>Show</span></label><button class="icon-button" type="button" data-layout-move="-1" ${index === 0 ? "disabled" : ""} aria-label="Move up">↑</button><button class="icon-button" type="button" data-layout-move="1" ${index === state.layout.order.length - 1 ? "disabled" : ""} aria-label="Move down">↓</button></div>`).join("");
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

function saveLayout(event) {
  event.preventDefault();
  state.layout.hidden = state.layout.order.filter((key) => !el.layoutList.querySelector(`[data-layout-visible][value="${key}"]`)?.checked);
  localStorage.setItem(LAYOUT_KEY, JSON.stringify(state.layout));
  applyLayout();
  closeDialog(el.layoutDialog);
}

function openDeleteShelfDialog() {
  el.deleteShelfPassword.value = "";
  el.deleteShelfError.hidden = true;
  closeDialog(el.layoutDialog);
  openDialog(el.deleteShelfDialog);
  requestAnimationFrame(() => el.deleteShelfPassword.focus());
}

async function deletePhysicalGamesList(event) {
  event.preventDefault();
  const password = el.deleteShelfPassword.value;
  if (!password) return;
  el.deleteShelfConfirm.disabled = true;
  el.deleteShelfConfirm.textContent = "Deleting…";
  try {
    const response = await fetch("/api/shelf", { method: "DELETE", headers: { "x-edit-password": password } });
    if (!response.ok) { el.deleteShelfError.hidden = false; return; }
    const data = await response.json();
    state.sourceGames = [];
    state.additions = [];
    state.overrides = {};
    state.updatedAt = data.updatedAt || new Date().toISOString();
    localStorage.removeItem(LOCAL_DRAFT_KEY);
    rebuildGames();
    renderAll();
    closeDialog(el.deleteShelfDialog);
  } catch {
    el.deleteShelfError.textContent = "Shelf could not be deleted. Try again.";
    el.deleteShelfError.hidden = false;
  } finally {
    el.deleteShelfConfirm.disabled = false;
    el.deleteShelfConfirm.textContent = "Delete physical games";
  }
}

function applyLayout() {
  const order = new Map(state.layout.order.map((key, index) => [key, index]));
  el.modules.querySelectorAll("[data-module]").forEach((section) => {
    section.style.order = String(order.get(section.dataset.module) ?? 99);
    section.hidden = state.layout.hidden.includes(section.dataset.module);
  });
}

function toggleView() {
  state.viewMode = state.viewMode === "grid" ? "list" : "grid";
  localStorage.setItem(VIEW_KEY, state.viewMode);
  renderChrome();
}

function clearFilters() {
  state.filters = { query: "", platform: "all", region: "all", condition: "all", category: "all", tab: "all", sort: state.filters.sort };
  el.search.value = "";
  el.condition.value = "all";
  el.category.value = "all";
  renderFilters();
  renderLibrary();
}

function openDialog(dialog) { dialog.showModal(); document.body.classList.add("dialog-open"); }
function closeDialog(dialog) { if (dialog.open) dialog.close(); document.body.classList.toggle("dialog-open", document.querySelector("dialog[open]") !== null); }

function populateEditorOptions() {
  el.fields.platform.innerHTML = PLATFORM_OPTIONS.map((platform) => `<option value="${platform}">${shortPlatform(platform)}</option>`).join("");
  el.fields.country.innerHTML = COUNTRY_OPTIONS.map(([value, label]) => `<option value="${value}">${label}</option>`).join("");
}

function loadLayout() {
  try {
    const value = JSON.parse(localStorage.getItem(LAYOUT_KEY) || "{}");
    const order = Array.isArray(value.order) ? value.order.filter((key) => DEFAULT_LAYOUT.includes(key)) : [];
    const hasSavedLayout = Array.isArray(value.order);
    return { order: [...order, ...DEFAULT_LAYOUT.filter((key) => !order.includes(key))], hidden: hasSavedLayout && Array.isArray(value.hidden) ? value.hidden.filter((key) => DEFAULT_LAYOUT.includes(key)) : [...DEFAULT_HIDDEN_MODULES] };
  } catch { return { order: [...DEFAULT_LAYOUT], hidden: [...DEFAULT_HIDDEN_MODULES] }; }
}

function loadDraft() { try { return JSON.parse(localStorage.getItem(LOCAL_DRAFT_KEY) || "{}"); } catch { return {}; } }
function setupShelfParallax(card) {
  card.addEventListener("pointermove", (event) => { if (event.pointerType === "touch") return; const rect = card.getBoundingClientRect(); const x = ((event.clientX - rect.left) / rect.width - .5) * -18; const y = ((event.clientY - rect.top) / rect.height - .5) * -18; card.style.setProperty("--art-x", `${x.toFixed(2)}px`); card.style.setProperty("--art-y", `${y.toFixed(2)}px`); });
  card.addEventListener("pointerleave", () => { card.style.setProperty("--art-x", "0px"); card.style.setProperty("--art-y", "0px"); });
}
function renderGamelistModules() {
  const playing = state.gamelistGames.filter((game) => game.playing && !game.deletedAt);
  const finished = state.gamelistGames.filter((game) => game.completedAt && !game.deletedAt).sort((a, b) => String(b.completedAt).localeCompare(String(a.completedAt))).slice(0, 12);
  el.playingCarousel.innerHTML = playing.map(gamelistMiniCard).join("");
  el.finishedCarousel.innerHTML = finished.map(gamelistMiniCard).join("");
  const playingModule = el.playingCarousel.closest("[data-module]");
  const finishedModule = el.finishedCarousel.closest("[data-module]");
  playingModule.hidden = state.layout.hidden.includes("playing") || !playing.length;
  finishedModule.hidden = state.layout.hidden.includes("latestFinished") || !finished.length;
}
function gamelistMiniCard(game) {
  const cover = coverUrl(game.cover || "") || platformFallback(game.platform);
  return `<article class="shelf-mini-card glass"><img src="${escapeHtml(cover)}" alt=""><div><strong>${escapeHtml(game.title)}</strong><span>${platformBadge(game.platform)}</span>${game.completedAt ? `<small>${escapeHtml(formatDate(game.completedAt))}</small>` : ""}</div></article>`;
}
async function loadTrophyActivity() {
  const module = el.trophyCard.closest("[data-module]");
  if (state.layout.hidden.includes("trophies")) return;
  const user = state.gamelistSettings.psnUser || "";
  el.trophyCard.innerHTML = `<span class="lookup-loading">Loading trophy activity…</span>`;
  try {
    const response = await fetch(`/api/achievements?user=${encodeURIComponent(user)}`);
    state.trophyActivity = response.ok ? await response.json() : null;
    const summary = state.trophyActivity?.summary?.trophies || {};
    const latest = (state.trophyActivity?.achievements || []).slice(0, 4);
    el.trophyCard.innerHTML = `<div class="trophy-kpis"><strong>${Number(summary.platinum || 0)}<span>Platinum</span></strong><strong>${Number(summary.gold || 0)}<span>Gold</span></strong><strong>${Number(summary.silver || 0)}<span>Silver</span></strong><strong>${Number(summary.bronze || 0)}<span>Bronze</span></strong></div><div class="trophy-latest">${latest.map((item) => `<span><img src="${escapeHtml(item.icon || "assets/platforms/playstation.png")}" alt=""><b>${escapeHtml(item.title || "Trophy")}</b><small>${escapeHtml(item.game || "")}</small></span>`).join("")}</div>`;
  } catch { el.trophyCard.innerHTML = `<span>Trophy activity is unavailable.</span>`; }
  module.hidden = state.layout.hidden.includes("trophies");
}
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
function websiteLinks(game) { return [...new Set([...(game.websites || []), ...Object.values(game.storeLinks || {})].filter(Boolean))]; }
function linkLabel(value) { try { return new URL(value).hostname.replace(/^www\./, ""); } catch { return "Website"; } }
function guideLinks(game) { return [["HowLongToBeat", `https://howlongtobeat.com/?q=${encodeURIComponent(game.title)}`], ["Neoseeker", `https://www.neoseeker.com/search/?q=${encodeURIComponent(`${game.title} guide`)}`], ["Wikipedia", `https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(game.title)}`]]; }
async function loadStorePrices(game) { el.detailStorePrices.innerHTML = `<span class="muted">Checking store prices…</span>`; try { const stores = (state.gamelistSettings.stores || ["Amazon", "GAME.es", "Xtralife", "Retro Island NY"]).join(","); const region = state.gamelistSettings.region || "ES"; const currency = state.gamelistSettings.currency || "EUR"; const response = await fetch(`/api/prices?title=${encodeURIComponent(game.title)}&platform=${encodeURIComponent(shortPlatform(game.platform))}&region=${encodeURIComponent(region)}&currency=${encodeURIComponent(currency)}&stores=${encodeURIComponent(stores)}`); const data = await response.json(); el.detailStorePrices.innerHTML = (data.prices || []).map((price) => `<a href="${escapeHtml(price.url || "#")}" target="_blank" rel="noreferrer"><span>${escapeHtml(price.store)}</span><strong>${escapeHtml(price.price || "Check store")}</strong></a>`).join("") || `<span class="muted">No store prices found.</span>`; } catch { el.detailStorePrices.innerHTML = `<span class="muted">Store prices unavailable.</span>`; } }
function renderPriceDetails(game) {
  const prices = game.collectionPrices || {};
  const rows = [["Loose", prices.loose], ["Complete", prices.complete], ["Sealed", prices.sealed]].filter(([, value]) => value != null);
  el.detailPriceSummary.innerHTML = rows.length ? `<div class="collection-price-grid">${rows.map(([label, value]) => `<span><small>${label}</small><strong>€${Number(value).toFixed(2)}</strong></span>`).join("")}</div>` : `<span class="muted">No collection value fetched yet.</span>`;
  const history = game.priceHistory || [];
  el.detailPriceGraph.innerHTML = priceGraph(history);
  el.detailPriceGraph.hidden = history.length < 2;
}
function priceGraph(history) {
  if (history.length < 2) return "";
  const values = history.map((item) => Number(item.value)).filter(Number.isFinite); const min = Math.min(...values); const max = Math.max(...values); const range = Math.max(1, max - min);
  const points = values.map((value, index) => `${20 + index * (560 / Math.max(1, values.length - 1))},${130 - ((value - min) / range) * 110}`).join(" ");
  return `<polyline points="${points}" fill="none" stroke="var(--accent)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`;
}
async function fetchCollectionValue() {
  const game = state.games.find((item) => item.id === el.detailDialog.dataset.id); if (!game) return;
  el.fetchValue.disabled = true; el.fetchValue.textContent = "Fetching…";
  try {
    const response = await fetch(`/api/collection-price?title=${encodeURIComponent(game.title)}&platform=${encodeURIComponent(shortPlatform(game.platform))}`);
    const data = await response.json();
    if (data.needsSetup || data.error) { window.open(data.searchUrl, "_blank", "noopener,noreferrer"); return; }
    game.collectionPrices = data.prices;
    const condition = conditionLabel(game); const mainValue = condition === "Sealed" ? data.prices.sealed : condition.startsWith("Complete") ? data.prices.complete : data.prices.loose;
    game.price = mainValue ?? data.mainValue;
    game.priceHistory = [...(game.priceHistory || []), { date: data.checkedAt, value: game.price }].filter((item) => item.value != null).slice(-24);
    const clean = stripRuntimeFields(game); const index = state.additions.findIndex((item) => item.id === game.id);
    if (game.sourceRecord) state.overrides[game.id] = clean; else if (index >= 0) state.additions[index] = clean;
    await persistShelf(); renderPriceDetails(game); renderStats();
  } finally { el.fetchValue.disabled = false; el.fetchValue.textContent = "Fetch value"; }
}
async function loadShelfTrophies(game) {
  const query = normalize(game.trophyName || game.title); const games = state.trophyActivity?.games || [];
  const match = games.find((item) => normalize(item.title || item.game || "").includes(query) || query.includes(normalize(item.title || item.game || "")));
  const id = match?.npCommunicationId || match?.id || "";
  if (!id) { el.detailTrophies.hidden = true; return; }
  el.detailTrophies.hidden = false; el.detailTrophyList.innerHTML = `<span>Loading trophies…</span>`;
  try { const response = await fetch(`/api/trophies?id=${encodeURIComponent(id)}&service=${encodeURIComponent(match.npServiceName || "trophy")}&user=${encodeURIComponent(state.gamelistSettings.psnUser || "")}`); const data = await response.json(); const trophies = data.trophies || []; el.detailTrophyCount.textContent = `${trophies.filter((item) => item.earned).length}/${trophies.length}`; el.detailTrophyList.innerHTML = trophies.map((item) => `<article class="detail-trophy-card ${item.earned ? "earned" : ""}"><img src="${escapeHtml(item.icon || "assets/platforms/playstation.png")}" alt=""><div><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.description || item.type)}</span></div></article>`).join(""); } catch { el.detailTrophies.hidden = true; }
}
function pencilIcon() { return `<svg class="pencil-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4l11-11a2.8 2.8 0 0 0-4-4L4 16v4Z"></path><path d="M13.5 6.5l4 4"></path></svg>`; }
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
}
function platformFallback(platform) { const key = normalize(platform); if (key.includes("switch")) return "assets/platforms/switch.png"; if (key.includes("3ds")) return "assets/platforms/3ds.png"; if (key.includes("ds")) return "assets/platforms/nds.png"; if (key.includes("64")) return "assets/platforms/n64.png"; return "assets/platforms/playstation.png"; }
function coverClass(platform) { const value = shortPlatform(platform).toLowerCase().replace(/\s+/g, ""); return `cover-${value === "switch2" ? "switch2" : value}`; }
function shortPlatform(value) { return ({ "Sony PlayStation": "PS1", "Sony PlayStation 2": "PS2", "Sony PlayStation 4": "PS4", "Sony PlayStation 5": "PS5", "Nintendo Switch": "Switch", "Nintendo Switch 2": "Switch 2", "Nintendo DS": "DS", "Nintendo 3DS": "3DS", "Nintendo 64": "N64" })[value] || value; }
function flagAsset(country) { return `assets/flags/${({ "United Kingdom": "gb", Spain: "es", "United States of America": "us", Japan: "jp", Taiwan: "tw", France: "fr", Germany: "de", Australia: "au", China: "cn", World: "world" })[country] || "world"}.svg`; }
function flagIcon(country, withClass = false) { return `<img${withClass ? ` class="detail-flag"` : ""} src="${flagAsset(country)}" alt="" width="24" height="16" decoding="async">`; }
function platformBadge(platform) { return `<span class="platform-badge ${platformClass(platform)}" title="${escapeHtml(shortPlatform(platform))}"><span class="platform-icon"><img src="${platformLogo(platform)}" alt="" width="18" height="18" decoding="async"></span><span class="platform-label">${escapeHtml(shortPlatform(platform))}</span></span>`; }
function platformLogo(platform) { const value = normalize(shortPlatform(platform)); if (value === "n64") return "assets/platforms/n64.png"; if (value === "ds") return "assets/platforms/nds.png"; if (value === "3ds") return "assets/platforms/3ds.png"; if (value.includes("switch")) return "assets/platforms/switch.png"; return "assets/platforms/playstation.png"; }
function platformClass(platform) { const value = normalize(shortPlatform(platform)); if (value === "n64") return "platform-n64"; if (value === "ds") return "platform-ds"; if (value === "3ds") return "platform-3ds"; if (value.includes("switch")) return "platform-nintendo"; if (value.includes("ps")) return "platform-playstation"; return "platform-generic"; }
function regionName(country) { return country === "United States of America" ? "United States" : country; }
function regionFor(country) { if (country === "Japan") return "Japan"; if (country === "Taiwan") return "Taiwan"; if (country === "United States of America") return "USA"; if (["United Kingdom", "Spain", "France", "Germany"].includes(country)) return country === "Spain" ? "Spain" : "Europe"; return country || "Other"; }
function countValues(values) { const map = new Map(); values.filter(Boolean).forEach((value) => map.set(value, (map.get(value) || 0) + 1)); return [...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])); }
function conditionMatches(game, condition) { const label = conditionLabel(game).toLowerCase(); if (condition === "all") return true; if (condition === "complete") return label === "complete"; if (condition === "complete-plus") return label === "complete +"; if (condition === "loose") return label === "loose"; if (condition === "sealed") return label === "sealed"; return true; }
function sorter(type) { if (type === "title") return (a, b) => a.title.localeCompare(b.title); if (type === "added") return (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0); if (type === "value") return (a, b) => (b.price || 0) - (a.price || 0); if (type === "region") return (a, b) => a.country.localeCompare(b.country) || a.title.localeCompare(b.title); return (a, b) => a.platform.localeCompare(b.platform) || a.title.localeCompare(b.title); }
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
function formatDate(value) { const date = new Date(value); return Number.isNaN(date.getTime()) ? "22 Jun 2026" : new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(date); }
function escapeCss(value) { return String(value).replace(/["'()\\]/g, "\\$&"); }
function escapeHtml(value) { return String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]); }
