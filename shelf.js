const SESSION_KEY = "gamelist-editor";
const VIEW_KEY = "shelf:view-mode:v2";
const LAYOUT_KEY = "shelf:layout:v2";
const LOCAL_DRAFT_KEY = "shelf:draft-data:v2";
const DEFAULT_LAYOUT = ["kpis", "filters", "library"];
const MODULE_NAMES = { kpis: "Collection highlights", filters: "Search and filters", library: "Physical library" };
const PLATFORM_OPTIONS = [
  "Nintendo Switch", "Nintendo Switch 2", "Sony PlayStation 5", "Sony PlayStation 4",
  "Sony PlayStation 2", "Sony PlayStation", "Nintendo 3DS", "Nintendo DS", "Nintendo 64",
];
const COUNTRY_OPTIONS = [
  ["United Kingdom", "🇬🇧 United Kingdom"], ["Spain", "🇪🇸 Spain"], ["United States of America", "🇺🇸 United States"],
  ["Japan", "🇯🇵 Japan"], ["Taiwan", "🇹🇼 Taiwan"], ["France", "🇫🇷 France"], ["Germany", "🇩🇪 Germany"],
  ["Australia", "🇦🇺 Australia"], ["China", "🇨🇳 China"], ["World", "🌐 World"],
];

const state = {
  sourceGames: [],
  additions: [],
  overrides: {},
  games: [],
  canEdit: sessionStorage.getItem(SESSION_KEY) === "true",
  editingId: "",
  lookupResults: [],
  filters: { query: "", platform: "all", region: "all", condition: "all", sort: "platform" },
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
  sort: document.querySelector("#sortFilter"),
  view: document.querySelector("#viewToggleButton"),
  clear: document.querySelector("#clearFilters"),
  login: document.querySelector("#loginButton"),
  addButton: document.querySelector("#addGameButton"),
  layoutButton: document.querySelector("#layoutButton"),
  modules: document.querySelector("#shelfModules"),
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
  addDialog: document.querySelector("#addDialog"),
  addForm: document.querySelector("#addGameForm"),
  addClose: document.querySelector("#addClose"),
  addCancel: document.querySelector("#addCancel"),
  lookupInput: document.querySelector("#lookupInput"),
  lookupButton: document.querySelector("#lookupButton"),
  lookupResults: document.querySelector("#lookupResults"),
  fields: {
    title: document.querySelector("#titleInput"), platform: document.querySelector("#platformInput"),
    country: document.querySelector("#countryInput"), ownership: document.querySelector("#ownershipInput"),
    playStatus: document.querySelector("#playStatusInput"), price: document.querySelector("#priceInput"),
    publisher: document.querySelector("#publisherInput"), developer: document.querySelector("#developerInput"),
    genre: document.querySelector("#genreInput"), cover: document.querySelector("#coverInput"), notes: document.querySelector("#notesInput"),
  },
  layoutDialog: document.querySelector("#layoutDialog"),
  layoutForm: document.querySelector("#layoutForm"),
  layoutClose: document.querySelector("#layoutClose"),
  layoutList: document.querySelector("#layoutList"),
  authDialog: document.querySelector("#authDialog"),
  authForm: document.querySelector("#authForm"),
  authClose: document.querySelector("#authClose"),
  authCancel: document.querySelector("#authCancel"),
  authPassword: document.querySelector("#authPasswordInput"),
  authError: document.querySelector("#authError"),
};

init();

async function init() {
  populateEditorOptions();
  bindEvents();
  const [source, shelfData, auth] = await Promise.all([
    fetch("data/collection-games.json").then((response) => response.json()),
    fetch("/api/shelf", { cache: "no-store" }).then((response) => response.ok ? response.json() : null).catch(() => null),
    fetch("/api/auth", { cache: "no-store" }).then((response) => response.ok).catch(() => false),
  ]);
  state.sourceGames = source.games || [];
  const draft = loadDraft();
  state.additions = draft.games || shelfData?.games || [];
  state.overrides = draft.overrides || shelfData?.overrides || {};
  state.canEdit = state.canEdit || auth;
  state.updatedAt = shelfData?.updatedAt || source.generatedAt || "";
  rebuildGames();
  renderAll();
}

function bindEvents() {
  el.search.addEventListener("input", () => { state.filters.query = el.search.value.trim().toLowerCase(); renderLibrary(); });
  el.platform.addEventListener("change", () => { state.filters.platform = el.platform.value; renderLibrary(); });
  el.region.addEventListener("change", () => { state.filters.region = el.region.value; renderLibrary(); });
  el.condition.addEventListener("change", () => { state.filters.condition = el.condition.value; renderLibrary(); });
  el.sort.addEventListener("change", () => { state.filters.sort = el.sort.value; renderLibrary(); });
  el.view.addEventListener("click", toggleView);
  el.clear.addEventListener("click", clearFilters);
  el.login.addEventListener("click", toggleEditMode);
  el.addButton.addEventListener("click", () => openEditor());
  el.layoutButton.addEventListener("click", openLayout);
  el.scrollTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  window.addEventListener("scroll", () => el.scrollTop.classList.toggle("visible", window.scrollY > 420), { passive: true });
  window.addEventListener("storage", (event) => { if (event.key === "gamelist-editor-signal") refreshSharedAuth(); });
  window.addEventListener("focus", refreshSharedAuth);

  el.shelf.addEventListener("click", handleShelfClick);
  el.detailActions.addEventListener("click", handleDetailAction);
  el.detailClose.addEventListener("click", () => closeDialog(el.detailDialog));
  el.detailDialog.addEventListener("click", (event) => { if (event.target === el.detailDialog) closeDialog(el.detailDialog); });

  el.addClose.addEventListener("click", () => closeDialog(el.addDialog));
  el.addCancel.addEventListener("click", () => closeDialog(el.addDialog));
  el.addDialog.addEventListener("click", (event) => { if (event.target === el.addDialog) closeDialog(el.addDialog); });
  el.addForm.addEventListener("submit", saveEditor);
  el.lookupButton.addEventListener("click", lookupGame);
  el.lookupInput.addEventListener("keydown", (event) => { if (event.key === "Enter") { event.preventDefault(); lookupGame(); } });
  el.lookupResults.addEventListener("click", chooseLookupResult);

  el.layoutClose.addEventListener("click", () => closeDialog(el.layoutDialog));
  el.layoutDialog.addEventListener("click", (event) => { if (event.target === el.layoutDialog) closeDialog(el.layoutDialog); });
  el.layoutForm.addEventListener("submit", saveLayout);
  el.layoutList.addEventListener("click", handleLayoutMove);

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
  el.footerVersion.textContent = `Shelf v2 · ${state.sourceGames.length} source games${state.additions.length ? ` · ${state.additions.length} added` : ""}`;
}

function renderStats() {
  const value = state.games.reduce((sum, game) => sum + (Number(game.price) || 0), 0);
  const complete = state.games.filter((game) => /cib|new/i.test(game.ownership || "")).length;
  const regions = new Set(state.games.map((game) => game.country).filter(Boolean)).size;
  el.stats.innerHTML = [
    [state.games.length, "Physical games", "stat-backlog"],
    [new Set(state.games.map((game) => game.platform)).size, "Consoles", "stat-available"],
    [complete, "Complete", "stat-release"],
    [`€${Math.round(value).toLocaleString("en")}`, `${regions} regions · value`, "stat-done"],
  ].map(([valueText, label, className]) => `<div class="stat glass ${className}"><strong>${escapeHtml(valueText)}</strong><span>${escapeHtml(label)}</span></div>`).join("");
}

function renderFilters() {
  const platforms = countValues(state.games.map((game) => game.platform));
  const countries = countValues(state.games.map((game) => game.country));
  el.platform.innerHTML = `<option value="all">All consoles (${state.games.length})</option>${platforms.map(([value, count]) => `<option value="${escapeHtml(value)}">${escapeHtml(shortPlatform(value))} (${count})</option>`).join("")}`;
  el.region.innerHTML = `<option value="all">All regions (${state.games.length})</option>${countries.map(([value, count]) => `<option value="${escapeHtml(value)}">${flagFor(value)} ${escapeHtml(regionName(value))} (${count})</option>`).join("")}`;
  el.platform.value = state.filters.platform;
  el.region.value = state.filters.region;
}

function renderLibrary() {
  const games = filteredGames();
  el.count.textContent = `${games.length} ${games.length === 1 ? "game" : "games"}`;
  el.shelf.innerHTML = games.map(gameCard).join("");
  el.empty.hidden = games.length > 0;
}

function filteredGames() {
  return state.games.filter((game) => {
    const haystack = `${game.title} ${game.platform} ${game.publisher} ${game.developer} ${game.genre} ${game.notes}`.toLowerCase();
    return (state.filters.platform === "all" || game.platform === state.filters.platform)
      && (state.filters.region === "all" || game.country === state.filters.region)
      && conditionMatches(game, state.filters.condition)
      && (!state.filters.query || haystack.includes(state.filters.query));
  }).sort(sorter(state.filters.sort));
}

function gameCard(game) {
  const cover = coverUrl(game.cover || "");
  const issueClass = game.ownership === "Loose" ? "condition-loose" : game.notes ? "condition-issue" : "condition-good";
  const studio = [game.developer, game.publisher && game.publisher !== game.developer ? game.publisher : ""].filter(Boolean).join(" · ");
  return `<article class="game-card glass${cover ? " has-art" : ""}" data-id="${escapeHtml(game.id)}"${cover ? ` style="--card-art:url('${escapeCss(cover)}')"` : ""}>
    <div class="physical-case ${caseClass(game.platform)}" data-case-label="${escapeHtml(caseLabel(game.platform))}">
      <button class="cover-button" type="button" data-action="details" aria-label="View ${escapeHtml(game.title)}">
        <img src="${escapeHtml(cover || platformFallback(game.platform))}" alt="${escapeHtml(game.title)} cover" loading="lazy" decoding="async">
      </button>
    </div>
    <div class="game-main">
      <div class="title-line"><div class="title-wrap"><h3>${escapeHtml(game.title)}</h3></div></div>
      <div class="studio-line">${escapeHtml(studio || game.genre || "Physical edition")}</div>
      <div class="meta"><span class="region-flag" title="${escapeHtml(game.country)}">${flagFor(game.country)}</span><span class="chip accent">${escapeHtml(shortPlatform(game.platform))}</span>${game.price != null ? `<span class="chip">€${Number(game.price).toFixed(0)}</span>` : ""}</div>
      <div class="chips"><span class="chip ${issueClass}">${escapeHtml(game.ownership || "Owned")}</span>${game.playStatus ? `<span class="chip play-status">${escapeHtml(game.playStatus)}</span>` : ""}${game.genre ? `<span class="chip genre">${escapeHtml(firstGenre(game.genre))}</span>` : ""}</div>
      <div class="card-actions"><button class="ghost-button" type="button" data-action="details">Details</button>${state.canEdit ? `<button class="ghost-button editor-only" type="button" data-action="edit">Edit</button>` : ""}</div>
    </div>
  </article>`;
}

function handleShelfClick(event) {
  const card = event.target.closest("[data-id]");
  const action = event.target.closest("[data-action]")?.dataset.action;
  if (!card || !action) return;
  const game = state.games.find((item) => item.id === card.dataset.id);
  if (!game) return;
  if (action === "edit") openEditor(game);
  else openDetails(game);
}

function openDetails(game) {
  el.detailDialog.dataset.id = game.id;
  el.detailTitle.textContent = game.title;
  el.detailEyebrow.textContent = `${flagFor(game.country)} ${game.country} · ${shortPlatform(game.platform)}`;
  el.detailCover.src = coverUrl(game.cover || "") || platformFallback(game.platform);
  el.detailCover.alt = `${game.title} cover`;
  el.detailChips.innerHTML = [game.ownership, game.playStatus, game.genre].filter(Boolean).map((value, index) => `<span class="chip ${index === 0 ? "accent" : index === 2 ? "genre" : ""}">${escapeHtml(value)}</span>`).join("");
  const details = [
    ["Console", shortPlatform(game.platform)], ["Region", `${flagFor(game.country)} ${game.country}`],
    ["Publisher", game.publisher], ["Developer", game.developer], ["Value", game.price != null ? `€${Number(game.price).toFixed(2)}` : "—"],
    ["Metacritic", game.metacritic || "—"], ["Added", game.createdAt || "—"],
  ];
  el.detailList.innerHTML = details.map(([term, value]) => `<dt>${escapeHtml(term)}</dt><dd>${escapeHtml(value || "—")}</dd>`).join("");
  el.detailNote.hidden = !game.notes;
  el.detailNote.textContent = game.notes || "";
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
  const values = game || { platform: "Nintendo Switch", country: "United Kingdom", ownership: "CIB+", playStatus: "Backlog" };
  for (const [key, input] of Object.entries(el.fields)) input.value = values[key] ?? "";
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
    region: regionFor(el.fields.country.value), ownership: el.fields.ownership.value, playStatus: el.fields.playStatus.value,
    price: numberOrNull(el.fields.price.value), publisher: el.fields.publisher.value.trim(), developer: el.fields.developer.value.trim(),
    genre: el.fields.genre.value.trim(), cover: rawCoverUrl(el.fields.cover.value.trim()), notes: el.fields.notes.value.trim(),
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
    const response = await fetch("/api/shelf", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
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
  state.filters = { query: "", platform: "all", region: "all", condition: "all", sort: state.filters.sort };
  el.search.value = "";
  el.condition.value = "all";
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
    return { order: [...order, ...DEFAULT_LAYOUT.filter((key) => !order.includes(key))], hidden: Array.isArray(value.hidden) ? value.hidden.filter((key) => DEFAULT_LAYOUT.includes(key)) : [] };
  } catch { return { order: [...DEFAULT_LAYOUT], hidden: [] }; }
}

function loadDraft() { try { return JSON.parse(localStorage.getItem(LOCAL_DRAFT_KEY) || "{}"); } catch { return {}; } }
function stripRuntimeFields(game) { const { sourceRecord, ...clean } = game; return clean; }
function numberOrNull(value) { const number = Number(value); return Number.isFinite(number) && value !== "" ? number : null; }
function firstGenre(value) { return String(value).split(",")[0].trim(); }
function rawCoverUrl(value) { try { const url = new URL(value, location.origin); return url.searchParams.get("src") || value; } catch { return value; } }
function coverUrl(value) { return value.includes("howlongtobeat.com/games/") ? `/api/cover?src=${encodeURIComponent(value)}` : value; }
function platformFallback(platform) { const key = normalize(platform); if (key.includes("switch")) return "assets/platforms/switch.png"; if (key.includes("3ds")) return "assets/platforms/3ds.png"; if (key.includes("ds")) return "assets/platforms/nds.png"; if (key.includes("64")) return "assets/platforms/n64.png"; return "assets/platforms/playstation.png"; }
function caseClass(platform) { const value = shortPlatform(platform).toLowerCase().replace(/\s+/g, ""); return `case-${value === "switch2" ? "switch2" : value}`; }
function caseLabel(platform) { return shortPlatform(platform).toUpperCase(); }
function shortPlatform(value) { return ({ "Sony PlayStation": "PS1", "Sony PlayStation 2": "PS2", "Sony PlayStation 4": "PS4", "Sony PlayStation 5": "PS5", "Nintendo Switch": "Switch", "Nintendo Switch 2": "Switch 2", "Nintendo DS": "DS", "Nintendo 3DS": "3DS", "Nintendo 64": "N64" })[value] || value; }
function flagFor(country) { return ({ "United Kingdom": "🇬🇧", Spain: "🇪🇸", "United States of America": "🇺🇸", Japan: "🇯🇵", Taiwan: "🇹🇼", France: "🇫🇷", Germany: "🇩🇪", Australia: "🇦🇺", China: "🇨🇳", World: "🌐" })[country] || "🏳️"; }
function regionName(country) { return country === "United States of America" ? "United States" : country; }
function regionFor(country) { if (country === "Japan") return "Japan"; if (country === "Taiwan") return "Taiwan"; if (country === "United States of America") return "USA"; if (["United Kingdom", "Spain", "France", "Germany"].includes(country)) return country === "Spain" ? "Spain" : "Europe"; return country || "Other"; }
function countValues(values) { const map = new Map(); values.filter(Boolean).forEach((value) => map.set(value, (map.get(value) || 0) + 1)); return [...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])); }
function conditionMatches(game, condition) { if (condition === "all") return true; if (condition === "complete") return /cib/i.test(game.ownership || ""); if (condition === "boxed") return /boxed/i.test(game.ownership || ""); if (condition === "loose") return game.ownership === "Loose"; if (condition === "new") return game.ownership === "New"; if (condition === "issues") return Boolean(game.notes); return true; }
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
