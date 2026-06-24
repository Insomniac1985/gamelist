export function createGameCardShell(doc = document) {
  const template = doc.createElement("template");
  template.innerHTML = `<article class="game-card glass" draggable="false"><div class="card-trailer" aria-hidden="true"></div><button class="icon-button trailer-toggle" type="button" title="Pause trailer" aria-label="Pause trailer" hidden></button><button class="cover-button" type="button"><img alt=""></button><div class="game-main"><div class="title-line"><div class="title-wrap"><h3></h3><div class="title-owners"></div></div><button class="icon-button edit-action" type="button" title="Edit" aria-label="Edit"><svg class="pencil-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4l11-11a2.8 2.8 0 0 0-4-4L4 16v4Z"></path><path d="M13.5 6.5l4 4"></path></svg></button></div><div class="studio-line"></div><div class="meta"></div><div class="play-dates"></div><div class="chips"></div><div class="card-trophies"></div><div class="card-actions"><button class="ghost-button price-refresh-action" type="button">Prices</button><button class="ghost-button bought-action" type="button">Got it</button><button class="primary-button complete-action" type="button">Finished</button><button class="ghost-button backlog-action" type="button" title="Backlog" aria-label="Move back to backlog"><svg class="back-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M10 6 4 12l6 6"></path><path d="M4 12h10a6 6 0 0 1 6 6"></path></svg><span class="action-label">Backlog</span></button><button class="ghost-button trophy-action" type="button" title="Completed" aria-label="Completed"><svg class="trophy-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4h8v4a4 4 0 0 1-8 0V4Z"></path><path d="M8 6H5a3 3 0 0 0 3 3"></path><path d="M16 6h3a3 3 0 0 1-3 3"></path><path d="M12 12v4"></path><path d="M9 20h6"></path><path d="M10 16h4v4h-4z"></path></svg></button><button class="danger-button icon-only-button delete-action" type="button" title="Delete" aria-label="Delete"><svg class="trash-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18"></path><path d="M8 6V4h8v2"></path><path d="M19 6l-1 14H6L5 6"></path><path d="M10 11v5"></path><path d="M14 11v5"></path></svg></button></div></div><p class="notes"></p><div class="prices"></div></article>`;
  return template.content.firstElementChild;
}

export function mountActivitySlider(section, ids) {
  if (!section) return;
  section.innerHTML = `<div class="column-head"><div><h2>Currently Playing</h2></div><div class="playing-head-actions"><span id="${ids.count}"></span><button class="icon-button playing-slider-button" id="${ids.previous}" type="button" title="Previous playing game" aria-label="Previous playing game">←</button><button class="icon-button playing-slider-button" id="${ids.next}" type="button" title="Next playing game" aria-label="Next playing game">→</button></div></div><div class="playing-panel"><div class="card-list playing-list" id="${ids.list}"${ids.dataSection ? ` data-section="${ids.dataSection}"` : ""}></div></div><div class="playing-finished" id="${ids.finished}" hidden><span class="achievement-subtitle">Last finished games</span><div class="playing-finished-list" id="${ids.finishedList}"></div></div>`;
}

export function finishedGameMarkup({ id, title, cover, completedClass = "", badges = "", dateText = "", progress = null, dataName = "id", escape }) {
  return `<button class="achievement-game playing-finished-game ${completedClass}" type="button" data-${dataName}="${escape(id)}" aria-label="${escape(`Open ${title}`)}"><img src="${escape(cover)}" alt="" loading="lazy" decoding="async"><div><strong class="${completedClass ? "completed-achievements-title" : ""}">${escape(title)}</strong>${badges ? `<span class="playing-finished-tags">${badges}</span>` : ""}<span>${escape(dateText)}</span>${progress != null ? `<em style="--progress:${progress}%"></em>` : ""}</div></button>`;
}

export function achievementCardMarkup({ index, tone, href, game, title, icon, meta, escape, localGame = "" }) {
  return `<a class="achievement-card ${index === 0 ? "latest" : ""} trophy-${escape(tone)}" href="${escape(href || "#")}" ${href && href !== "#" ? `target="_blank" rel="noreferrer"` : ""}${localGame ? ` data-achievement-game="${escape(localGame)}"` : ""}><img class="achievement-icon" src="${escape(icon)}" alt=""><div><strong>${escape(title)}</strong>${game ? `<span class="achievement-game-name">${escape(game)}</span>` : ""}<span class="achievement-card-meta playing-finished-tags">${meta}</span></div></a>`;
}

export function achievementDashboardMarkup({ completedCount, completedBreakdown = "", trophyTotal, trophyBreakdown = "", level, levelLabel, counts, sourceUrl, trophyIconHtml, barHeight, escape }) {
  return `<div class="achievement-summary"><button class="achievement-kpi platinum-highlight ${completedCount ? "has-platinum" : ""}" type="button" data-action="platinums"><strong class="kpi-with-icon">${trophyIconHtml}${escape(String(completedCount))}</strong><span>COMPLETED</span>${completedBreakdown}</button><a class="achievement-kpi trophy-kpi" href="${escape(sourceUrl)}" target="_blank" rel="noreferrer"><strong>${escape(String(trophyTotal))}</strong><span>TROPHIES</span>${trophyBreakdown}</a><a class="achievement-kpi" href="${escape(sourceUrl)}" target="_blank" rel="noreferrer"><strong>${escape(String(level))}</strong><span>${levelLabel}</span></a><div class="rarity-graph" aria-label="Trophy rarity graph">${counts.map(([type, count]) => `<span class="rarity-bar rarity-${escape(type.toLowerCase())}" title="${escape(`${type}: ${count}`)}"><em style="--bar:${barHeight(count, counts)}%"></em><small>${escape(type)}</small><strong>${escape(String(count))}</strong></span>`).join("")}</div></div>`;
}

export function achievementPanelMarkup({ psn = {}, steam = {}, xbox = {}, trophyIconHtml, platformBadge, platformLogo, trophyTone, escape }) {
  const sourceUrl = psn.sourceUrl || "https://www.playstation.com/";
  const psnAchievements = Array.isArray(psn.achievements) ? psn.achievements : [];
  const steamAchievements = Array.isArray(steam.achievements) ? steam.achievements : [];
  const xboxAchievements = Array.isArray(xbox.achievements) ? xbox.achievements : [];
  const achievements = [...psnAchievements, ...steamAchievements, ...xboxAchievements]
    .sort((a, b) => earnedTime(b) - earnedTime(a) || String(a.title || "").localeCompare(String(b.title || "")))
    .slice(0, 6);
  const activitySources = ["PSN", steamAchievements.length ? "Steam" : "", xboxAchievements.length ? "Xbox" : ""].filter(Boolean);
  if (!achievements.length) {
    const fallbackText = psn.needsSetup
      ? "Set PSN_NPSSO in Cloudflare to show recent PSN trophy activity here."
      : psn.authError
        ? "PSN token needs refreshing. Update PSN_NPSSO in Cloudflare."
        : psn.blocked
          ? "The public tracker is blocking embedded scraping, but your profile is one click away."
          : "No recent achievement activity found yet.";
    return {
      sourceUrl,
      activityLabel: `${activitySources.join(" + ")} activity`,
      html: `<a class="achievement-fallback" href="${escape(sourceUrl)}" target="_blank" rel="noreferrer"><img src="${escape(platformLogo("PS5"))}" alt=""><div><strong>Achievement activity</strong><span>${escape(fallbackText)}</span></div></a>`,
    };
  }
  const trophies = psn.summary?.trophies || {};
  const psnCompleted = Number(trophies.platinum || 0);
  const pcCompleted = Number(steam.completed?.length || 0);
  const xboxCompleted = Number(xbox.completed?.length || 0);
  const completed = psnCompleted + pcCompleted + xboxCompleted;
  const counts = [["Platinum", psnCompleted], ["Gold", Number(trophies.gold || 0)], ["Silver", Number(trophies.silver || 0)], ["Bronze", Number(trophies.bronze || 0)]];
  const psnTotal = counts.reduce((sum, [, count]) => sum + count, 0);
  const total = psnTotal + Number(steam.totalEarned || 0) + Number(xbox.totalEarned || 0);
  const breakdown = (rows) => `<span class="kpi-breakdown" aria-hidden="true">${rows.map(([value, totalValue, platform]) => `<small class="kpi-breakdown-pill kpi-breakdown-${escape(normalizeTitle(platform))}"><strong>${escape(String(value))}</strong> out of ${escape(String(totalValue))} on ${escape(platform)}</small>`).join("")}</span>`;
  const games = Array.isArray(psn.games) ? psn.games.slice(0, 3) : [];
  const average = games.length ? Math.round(games.reduce((sum, game) => sum + progressFromText(game.game), 0) / games.length) : 0;
  const dashboard = achievementDashboardMarkup({
    completedCount: completed,
    completedBreakdown: breakdown([[pcCompleted, completed, "PC"], [xboxCompleted, completed, "Xbox"], [psnCompleted, completed, "PlayStation"]]),
    trophyTotal: total,
    trophyBreakdown: breakdown([[steam.totalEarned || 0, total, "PC"], [xbox.totalEarned || 0, total, "Xbox"], [psnTotal, total, "PlayStation"]]),
    level: psn.summary?.level || average || 0,
    levelLabel: psn.summary?.level ? `LEVEL <small>${escape(String(psn.summary.progress || 0))}% next</small>` : "LATEST GAME AVG",
    counts, sourceUrl, trophyIconHtml, barHeight: sharedTrophyBarHeight, escape,
  });
  const cards = achievements.map((item, index) => {
    const platform = item.source === "steam" ? "Steam" : String(item.platform || (item.source === "xbox" ? "Xbox" : "PlayStation")).trim() || "PlayStation";
    return achievementCardMarkup({ index, tone: trophyTone(item.rarity), href: item.url || sourceUrl, game: item.game || "", title: item.title || (item.source === "steam" ? "Achievement unlocked" : "Trophy unlocked"), icon: item.icon || platformLogo(item.source === "steam" ? "Steam" : item.source === "xbox" ? "Xbox" : "PS5"), meta: `${platformBadge(platform)}${item.earnedAt ? `<span class="achievement-earned-date">${escape(item.earnedAt)}</span>` : ""}`, escape });
  }).join("");
  return { sourceUrl, activityLabel: `${activitySources.join(" + ")} activity`, html: `${dashboard}<span class="achievement-subtitle trophy-subtitle">Latest Achievements</span>${cards}` };
}

export function activityCoverOverride(input) {
  const title = typeof input === "string" ? input : input?.title || input?.game || "";
  const normalized = normalizeTitle(title);
  if (normalized.includes("mandagon")) return "https://cdn2.steamgriddb.com/grid/a0ac3f221e625a1f87857b7d19c4c7d5.png";
  return "";
}

export function activityLocalGameForTitle(title, games = []) {
  const query = normalizeTitle(title);
  if (!query) return null;
  return games.map((game) => ({ game, title: normalizeTitle(game.title) })).filter(({ title: candidate }) => candidate && (candidate === query || candidate.includes(query) || query.includes(candidate))).sort((a, b) => Number(b.title === query) - Number(a.title === query) || b.title.length - a.title.length)[0]?.game || null;
}

export function activityTitleMatchScore(a, b) {
  const left = titleParts(a);
  const right = titleParts(b);
  if (!left.compact || !right.compact) return 0;
  if (left.compact === right.compact || left.phrase === right.phrase) return 100;
  if (left.acronym && (left.acronym === right.compact || right.acronym === left.compact)) return 96;
  if (left.tokens.length === right.tokens.length && left.tokens.every((token) => right.tokens.includes(token))) return 92;
  if (left.tokens.length >= 2 && left.tokens.every((token) => right.tokens.includes(token))) return 82;
  if (right.tokens.length >= 2 && right.tokens.every((token) => left.tokens.includes(token))) return 80;
  return 0;
}

export function activityAllowsPsnCardTrophies(platform) {
  const value = String(platform || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
  return !["ps1", "psone", "psx", "playstation", "playstation1", "sonyplaystation", "sonyplaystation1", "ps2", "playstation2", "sonyplaystation2"].includes(value);
}

function earnedTime(item) { const time = Date.parse(item?.rawEarnedAt || item?.earnedAt || 0); return Number.isNaN(time) ? 0 : time; }
function sharedTrophyBarHeight(count, counts) { const max = Math.max(1, ...counts.map(([, value]) => value)); if (!count) return 8; return Math.round(18 + (Math.log1p(count) / Math.log1p(max)) * 82); }
function progressFromText(value) { const match = String(value || "").match(/(\d{1,3})%/); return match ? Math.min(100, Number(match[1])) : 0; }
function normalizeTitle(value) { return String(value || "").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, ""); }
function titleParts(value) { const phrase = String(value || "").toLowerCase().replace(/&/g, " and ").replace(/\btrophies\b/g, " ").replace(/\bxii\b/g, "12").replace(/\bxi\b/g, "11").replace(/\bviii\b/g, "8").replace(/\bvii\b/g, "7").replace(/\bvi\b/g, "6").replace(/\bix\b/g, "9").replace(/\biv\b/g, "4").replace(/\biii\b/g, "3").replace(/\bii\b/g, "2").replace(/\bx\b/g, "10").replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " "); const tokens = phrase.split(" ").filter(Boolean); return { phrase, tokens, compact: tokens.join(""), acronym: tokens.map((token) => token[0]).join("") }; }

export function completedCardMarkup({ title, cover = "", trophyIcon, trophyName, platform, earnedAt, actionAttribute = "", escape, cssEscape }) {
  const artStyle = cover ? ` style="--platinum-art:url('${cssEscape(cover)}')"` : "";
  const artClass = cover ? " has-platinum-art" : "";
  return `<button class="platinum-card platinum-card-button${artClass}" type="button" ${actionAttribute}${artStyle}>${cover ? `<span class="platinum-art-layer" aria-hidden="true"></span>` : ""}<span class="platinum-icon-wrap"><img class="platinum-icon" src="${escape(trophyIcon)}" alt="${escape(trophyName)}">${cover ? `<img class="platinum-cover-preview" src="${escape(cover)}" alt="">` : ""}</span><div class="platinum-main"><strong>${escape(trophyName)}</strong><span class="platinum-game">${escape(title)}</span><span class="platinum-earned">${escape([platform, earnedAt].filter(Boolean).join(" · "))}</span></div></button>`;
}

export function horizontalCarouselState(list) {
  const max = Math.max(0, list.scrollWidth - list.clientWidth - 1);
  const overflow = max > 2;
  return { max, overflow, atStart: !overflow || list.scrollLeft <= 2, atEnd: !overflow || list.scrollLeft >= max };
}

export function syncViewModeButton(button, mode, { gridIcon, linesIcon }) {
  const showingGrid = mode === "grid";
  button.innerHTML = showingGrid ? gridIcon() : linesIcon();
  button.title = showingGrid ? "Grid view" : "List view";
  button.setAttribute("aria-label", button.title);
  button.classList.toggle("active", mode === "list");
}

export function slideHorizontalCarousel(list, direction, selector = ".game-card") {
  const card = list.querySelector(selector);
  const gap = Number.parseFloat(getComputedStyle(list).columnGap) || 0;
  list.scrollBy({ left: direction * (card ? card.getBoundingClientRect().width + gap : list.clientWidth), behavior: "smooth" });
}

export function comparePlayingGames(a, b) {
  return Number(Boolean(b.stream)) - Number(Boolean(a.stream))
    || Number(Boolean(a.coop)) - Number(Boolean(b.coop))
    || playingStartSortValue(a) - playingStartSortValue(b)
    || String(a.title || "").localeCompare(String(b.title || ""), undefined, { sensitivity: "base" });
}

export function finishedDurationText(startValue, doneValue) {
  const start = dateOnly(startValue);
  const done = dateOnly(doneValue);
  if (!start || !done) return "";
  const [startYear, startMonth, startDay] = start.split("-").map(Number);
  const [doneYear, doneMonth, doneDay] = done.split("-").map(Number);
  const startDate = new Date(startYear, startMonth - 1, startDay);
  const doneDate = new Date(doneYear, doneMonth - 1, doneDay);
  if (!Number.isFinite(startDate.getTime()) || !Number.isFinite(doneDate.getTime()) || doneDate < startDate) return "";
  let years = doneYear - startYear;
  let cursor = addYearsClamped(startDate, years);
  if (cursor > doneDate) {
    years -= 1;
    cursor = addYearsClamped(startDate, years);
  }
  let months = 0;
  while (months < 11) {
    const next = addMonthsClamped(cursor, 1);
    if (next > doneDate) break;
    cursor = next;
    months += 1;
  }
  let days = Math.round((doneDate - cursor) / 86400000);
  if (!years && !months && !days) days = 1;
  return [
    years ? plural(years, "year") : "",
    months ? plural(months, "month") : "",
    days ? plural(days, "day") : "",
  ].filter(Boolean).join(" ");
}

export function timeBadgeMarkup(hours, url = "", escape = escapeHtml) {
  const content = `<strong>${escape(hours)}</strong><span>hrs</span>`;
  const clamped = Math.max(0, Math.min(1, (Number(hours) - 7) / 53));
  const hue = Math.round(132 - (132 * clamped));
  const style = `--time-color:hsl(${hue}, 88%, 56%);--time-light:hsl(${Math.min(140, hue + 10)}, 94%, 72%);--time-dark:hsl(${Math.max(0, hue - 8)}, 82%, 39%);--time-glow:hsla(${hue}, 88%, 56%, 0.34)`;
  return url
    ? `<a class="time-pill" style="${style}" href="${escape(url)}" target="_blank" rel="noreferrer" title="HowLongToBeat">${content}</a>`
    : `<span class="time-pill" style="${style}">${content}</span>`;
}

export function guideLinksMarkup(game, { title = game?.title || "", playstation = false, escape = escapeHtml } = {}) {
  const retail = String(title || "").trim();
  if (!retail) return [];
  const slug = retail.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "");
  const known = {
    control: { psnprofiles: "https://psnprofiles.com/guide/9040-control-trophy-guide" },
    pragmata: {
      neoseeker: "https://www.neoseeker.com/pragmata/walkthrough",
      psnprofiles: "https://psnprofiles.com/guide/24998-pragmata-trophy-guide",
      rpgsite: "https://www.rpgsite.net/games/2464-pragmata/guides",
    },
  }[slug] || {};
  const direct = game?.guideLinks || {};
  const valid = (value) => /^https?:\/\//i.test(String(value || "").trim()) ? String(value).trim() : "";
  const button = (label, url, cls, icon) => `<a class="guide-button ${cls}" href="${escape(url)}" target="_blank" rel="noreferrer"><img src="${escape(icon)}" alt="" width="18" height="18" decoding="async"><span>${escape(label)}</span></a>`;
  const links = [];
  if (playstation) {
    const id = String(game?.psnprofilesGuideId || game?.psnGuideId || "").trim();
    const url = known.psnprofiles || valid(direct.psnprofiles) || valid(game?.psnprofilesGuideUrl || game?.psnGuideUrl) || (/^\d+$/.test(id) ? `https://psnprofiles.com/guide/${encodeURIComponent(id)}` : `https://www.google.com/search?q=${encodeURIComponent(`site:psnprofiles.com/guide ${retail} trophy guide`)}`);
    links.push(button("PSNProfiles", url, "guide-psnprofiles", "assets/sites/psnprofiles.png"));
  }
  const neoseeker = known.neoseeker || valid(direct.neoseeker) || `https://www.neoseeker.com/${slug}/walkthrough`;
  const rpgId = String(game?.rpgsiteGameId || "").trim();
  const rpgsite = known.rpgsite || valid(direct.rpgsite) || (rpgId ? `https://www.rpgsite.net/games/${encodeURIComponent(rpgId)}-${slug}/guides` : `https://www.rpgsite.net/search?terms=${encodeURIComponent(`${retail} guide`)}`);
  links.push(button("Neoseeker", neoseeker, "guide-neoseeker", "assets/sites/neoseeker.png"));
  links.push(button("RPG Site", rpgsite, "guide-rpgsite", "assets/sites/rpgsite.png"));
  return links;
}

export function storeButtonsMarkup(stores = [], escape = escapeHtml) {
  return stores.filter((store) => store?.url).map((store) => `<a class="store-button ${store.cls || ""}" href="${escape(store.url)}" target="_blank" rel="noreferrer">${store.icon ? `<img src="${escape(store.icon)}" alt="" width="18" height="18" decoding="async">` : ""}${escape(store.label)}</a>`).join("");
}

export function activityTrailerUrl(value, origin = "") {
  const url = String(value || "").trim();
  if (!url) return "";
  if (/^https?:\/\/.+\.(?:mp4|webm|ogg)(?:[?#].*)?$/i.test(url)) return url;
  let videoId = url.match(/^[a-zA-Z0-9_-]{11}$/)?.[0] || "";
  if (!videoId) {
    try {
      const parsed = new URL(url);
      if (parsed.hostname.includes("youtu.be")) videoId = parsed.pathname.split("/").filter(Boolean)[0] || "";
      else if (parsed.hostname.includes("youtube.com") || parsed.hostname.includes("youtube-nocookie.com")) {
        videoId = parsed.searchParams.get("v") || "";
        if (!videoId) { const parts = parsed.pathname.split("/").filter(Boolean); const index = parts.findIndex((part) => ["embed", "shorts", "live"].includes(part)); videoId = index >= 0 ? parts[index + 1] || "" : ""; }
      }
    } catch { return url; }
  }
  if (!videoId) return url;
  const params = new URLSearchParams({ autoplay: "1", mute: "1", cc_load_policy: "0", controls: "0", disablekb: "1", enablejsapi: "1", fs: "0", iv_load_policy: "3", loop: "1", playlist: videoId, playsinline: "1", modestbranding: "1", rel: "0" });
  if (origin) params.set("origin", origin);
  return `https://www.youtube-nocookie.com/embed/${videoId}?${params}`;
}

export function activityTrailerFrameMarkup(url, escape = escapeHtml) {
  return /\.(?:mp4|webm|ogg)(?:[?#].*)?$/i.test(url)
    ? `<video src="${escape(url)}" muted autoplay loop playsinline preload="metadata" aria-hidden="true"></video>`
    : `<iframe src="${escape(url)}" title="" tabindex="-1" loading="eager" aria-hidden="true" allow="autoplay; encrypted-media; picture-in-picture"></iframe>`;
}

export function syncFocusedActivityTrailer(list, escape = escapeHtml) {
  const cards = [...list.querySelectorAll(".game-card.has-trailer")];
  if (!cards.length) return;
  const bounds = list.getBoundingClientRect();
  const center = bounds.left + bounds.width / 2;
  const focused = cards.filter((card) => { const rect = card.getBoundingClientRect(); return rect.right > bounds.left && rect.left < bounds.right; }).sort((a, b) => Math.abs((a.getBoundingClientRect().left + a.getBoundingClientRect().width / 2) - center) - Math.abs((b.getBoundingClientRect().left + b.getBoundingClientRect().width / 2) - center))[0] || null;
  cards.forEach((card) => {
    const trailer = card.querySelector(".card-trailer");
    if (!trailer) return;
    if (card === focused && !card.classList.contains("trailer-user-paused")) {
      if (!trailer.firstElementChild && trailer.dataset.src) trailer.innerHTML = activityTrailerFrameMarkup(trailer.dataset.src, escape);
      card.classList.remove("trailer-paused");
      trailer.querySelector("video")?.play().catch(() => {});
    } else {
      card.classList.add("trailer-paused");
      const video = trailer.querySelector("video");
      if (video) video.pause();
      const frame = trailer.querySelector("iframe");
      if (frame) frame.remove();
    }
  });
}

export function activityReleaseStatus(game, { includePast = false, now = new Date() } = {}) {
  if (game?.releaseDate) {
    const release = new Date(`${game.releaseDate}T00:00:00`);
    if (Number.isNaN(release.getTime()) || release.getFullYear() < 1990) return game.releaseText && (includePast || game.section === "upcoming") ? game.releaseText : game.section === "upcoming" ? "???" : "";
    const today = new Date(now); today.setHours(0, 0, 0, 0);
    if (release <= today && !includePast) return "";
    return `${release <= today ? "Released" : "Releases"} ${game.releaseDate}`;
  }
  if (game?.releaseText && (includePast || game.section === "upcoming")) return game.releaseText;
  return game?.section === "upcoming" ? "???" : "";
}

export function formatFooterDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, { day: "numeric", month: "long" }).format(date);
}

export function formatFooterDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }).format(date);
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]);
}

function addYearsClamped(date, years) {
  const year = date.getFullYear() + years;
  const month = date.getMonth();
  return new Date(year, month, Math.min(date.getDate(), new Date(year, month + 1, 0).getDate()));
}

function addMonthsClamped(date, months) {
  const target = new Date(date.getFullYear(), date.getMonth() + months, 1);
  return new Date(target.getFullYear(), target.getMonth(), Math.min(date.getDate(), new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()));
}

function playingStartSortValue(game) {
  return game.startedAt ? new Date(`${game.startedAt}T00:00:00`).getTime() : Number.POSITIVE_INFINITY;
}

function dateOnly(value) {
  if (!value) return "";
  if (typeof value === "string") {
    const iso = value.match(/\d{4}-\d{2}-\d{2}/);
    if (iso) return iso[0];
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function plural(value, label) {
  return `${value} ${label}${value === 1 ? "" : "s"}`;
}
