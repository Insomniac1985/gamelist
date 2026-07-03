export const FONT_OPTIONS = [
  { value: "", label: "Default", family: "Cascadia Code" },
  { value: "antique", label: "Antique Olive Nord", family: "Antique Olive Nord" },
  { value: "georgia", label: "Georgia Bold", family: "Georgia Bold" },
  { value: "pokemon", label: "Pokemon GBA", family: "Pokemon GBA" },
  { value: "pixel", label: "04B 30", family: "04B 30" },
  { value: "michroma", label: "Michroma", family: "Michroma" },
  { value: "minecraft", label: "Minecraft", family: "Minecraft" },
  { value: "mata", label: "Spider-man or PS3", family: "Mata Regular" },
];

const DEFAULT_THEME = {
  mainColor: "#ff0039",
  mainColorReset: true,
  gradient: false,
  uppercaseTitles: false,
  gradientColor: "#005cff",
  accentColor: "#79f2ce",
  accentColorReset: true,
  accent3: "#ee32b3",
  extraColor: "#7c5cff",
  mode: "dark",
  backgroundImage: "",
  disableGlow: false,
  glowPrimary: "main",
  glowSecondary: "accent",
  bigLogo: false,
  accentFont: "",
  gamelistIcon: "",
  shelfIcon: "",
  appIcon: "",
  ownerColors: [],
};

const PRESETS = {
  shabii: {},
  kash: {
    mainColor: "#005cff",
    mainColorReset: false,
    gradient: true,
    gradientColor: "#ffb8dc",
    accentColor: "#ffb8dc",
    accentColorReset: false,
    shelfIcon: "assets/kh_icon.png",
    gamelistIcon: "assets/kh_icon.png",
    appIcon: "assets/kh_app-icon.png",
    bigLogo: true,
  },
};

export function normalizeThemeSettings(settings = {}) {
  const legacy = PRESETS[settings.theme] || {};
  const raw = { ...DEFAULT_THEME, ...legacy, ...(settings.customTheme || {}) };
  const ownerColors = Array.isArray(raw.ownerColors) ? raw.ownerColors : [];
  return {
    ...raw,
    mainColor: hexColor(raw.mainColor, DEFAULT_THEME.mainColor),
    gradientColor: hexColor(raw.gradientColor, DEFAULT_THEME.gradientColor),
    accentColor: hexColor(raw.accentColor, DEFAULT_THEME.accentColor),
    accent3: hexColor(raw.accent3, DEFAULT_THEME.accent3),
    extraColor: hexColor(raw.extraColor, DEFAULT_THEME.extraColor),
    mainColorReset: raw.mainColorReset !== false,
    accentColorReset: raw.accentColorReset !== false,
    gradient: Boolean(raw.gradient),
    uppercaseTitles: Boolean(raw.uppercaseTitles),
    mode: raw.mode === "light" ? "light" : "dark",
    disableGlow: Boolean(raw.disableGlow),
    glowPrimary: glowSource(raw.glowPrimary, DEFAULT_THEME.glowPrimary),
    glowSecondary: glowSource(raw.glowSecondary, DEFAULT_THEME.glowSecondary),
    bigLogo: Boolean(raw.bigLogo),
    accentFont: FONT_OPTIONS.some((font) => font.value === raw.accentFont) ? raw.accentFont : "",
    backgroundImage: safeImage(raw.backgroundImage),
    gamelistIcon: safeImage(raw.gamelistIcon),
    shelfIcon: safeImage(raw.shelfIcon),
    appIcon: safeImage(raw.appIcon),
    ownerColors: ownerColors
      .map((item) => ({ name: cleanOwnerName(item?.name), color: hexColor(item?.color, "") }))
      .filter((item) => item.name && item.color)
      .slice(0, 24),
  };
}

export function resolveSiteTheme(settings = {}, page = "gamelist") {
  const theme = normalizeThemeSettings(settings);
  const owner = cleanOwnerName(settings.defaultOwner) || "Owner";
  const isShelf = page === "shelf";
  const mainColor = theme.mainColorReset ? DEFAULT_THEME.mainColor : theme.mainColor;
  const accentColor = theme.accentColorReset ? DEFAULT_THEME.accentColor : theme.accentColor;
  const accent3 = theme.accent3 || DEFAULT_THEME.accent3;
  return {
    ...theme,
    owner,
    title: `${owner}'s ${isShelf ? "Shelf" : "Gamelist"}`,
    shortName: isShelf ? "Shelf" : "Gamelist",
    mainColor,
    accentColor,
    accent3,
    icon: theme[isShelf ? "shelfIcon" : "gamelistIcon"] || defaultThemeIcon(isShelf ? "shelf" : "gamelist", mainColor, theme.mainColorReset),
    appIcon: theme.appIcon || defaultThemeIcon("app", mainColor, theme.mainColorReset),
  };
}

export function applySiteTheme(settings = {}, options = {}) {
  const page = options.page || "gamelist";
  const theme = resolveSiteTheme(settings, page);
  const root = document.documentElement;
  const body = document.body;
  root.dataset.initialTheme = settings.theme === "kash" ? "kash" : "custom";
  root.classList.toggle("theme-kash", settings.theme === "kash");
  root.classList.toggle("theme-light", theme.mode === "light");
  root.classList.toggle("theme-no-glow", theme.disableGlow);
  root.classList.toggle("theme-gradient", theme.gradient);
  root.classList.toggle("theme-uppercase-titles", theme.uppercaseTitles);
  root.classList.toggle("theme-big-logo", theme.bigLogo);
  root.classList.toggle("theme-font-pokemon", theme.accentFont === "pokemon");
  body?.classList.toggle("theme-kash", settings.theme === "kash");
  body?.classList.toggle("theme-light", theme.mode === "light");
  body?.classList.toggle("theme-no-glow", theme.disableGlow);
  body?.classList.toggle("theme-gradient", theme.gradient);
  body?.classList.toggle("theme-uppercase-titles", theme.uppercaseTitles);
  body?.classList.toggle("theme-big-logo", theme.bigLogo);
  body?.classList.toggle("theme-font-pokemon", theme.accentFont === "pokemon");
  root.style.setProperty("--accent", theme.mainColor);
  root.style.setProperty("--accent-2", theme.accentColor);
  root.style.setProperty("--accent-3", theme.accent3);
  root.style.setProperty("--extra-color", theme.extraColor);
  root.style.setProperty("--title-gradient-start", theme.gradient ? theme.gradientColor : theme.mainColor);
  root.style.setProperty("--title-gradient-end", theme.mainColor);
  root.style.setProperty("--glow-primary", colorMix(themeColorBySource(theme, theme.glowPrimary), 0.22));
  root.style.setProperty("--glow-secondary", colorMix(themeColorBySource(theme, theme.glowSecondary), 0.14));
  root.style.setProperty("--default-backdrop-image", theme.mode === "light" ? "url(\"assets/backdrop_light.png\")" : "url(\"assets/backdrop.png\")");
  root.style.setProperty("--custom-backdrop-image", theme.backgroundImage ? `url("${cssEscape(theme.backgroundImage)}")` : "var(--default-backdrop-image)");
  root.style.setProperty("--display-title-font", fontFamily(theme.accentFont));
  document.title = theme.title;
  document.querySelector("meta[name='theme-color']")?.setAttribute("content", theme.mainColor);
  document.querySelector("meta[name='apple-mobile-web-app-title']")?.setAttribute("content", theme.shortName);
  document.querySelector("link[rel='icon']")?.setAttribute("href", theme.icon);
  document.querySelector("link[rel='apple-touch-icon']")?.setAttribute("href", theme.appIcon);
  const manifest = document.querySelector("link[rel='manifest']");
  if (manifest) manifest.setAttribute("href", themedManifestUrl(theme));
  const brandMark = document.querySelector(".brand-mark");
  const brandText = document.querySelector(".brand span:last-child");
  if (brandMark) brandMark.src = theme.icon;
  if (brandText) brandText.textContent = theme.title;
  applyOwnerStyle(theme.ownerColors);
  warmThemeImages(theme);
  tintDefaultThemeIcons(settings, theme, page);
  return theme;
}

export function themedManifestUrl(theme) {
  const manifest = {
    name: theme.title,
    short_name: theme.shortName,
    description: `${theme.title} tracker.`,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: theme.mode === "light" ? "#f3f4f8" : "#0a0b0f",
    theme_color: theme.mainColor,
    icons: [{ src: absoluteAsset(theme.appIcon), sizes: "400x400", type: "image/png", purpose: "any maskable" }],
  };
  return `data:application/manifest+json,${encodeURIComponent(JSON.stringify(manifest))}`;
}

export function themeSettingsButton(settings, escapeHtml = htmlEscape) {
  const theme = resolveSiteTheme(settings);
  return `
    <article class="settings-layout-card settings-theme-card" data-layout-key="theme">
      <div class="settings-theme-select">
        <span>Theme</span>
        <button class="settings-theme-edit-button" type="button" data-theme-editor>
          <span>Edit theme</span>
        </button>
      </div>
    </article>
  `;
}

export function openThemeEditor({ settings = {}, onSave, page = "gamelist" }) {
  const dialog = ensureThemeDialog();
  const draft = structuredCloneSafe(normalizeThemeSettings(settings));
  renderThemeDialog(dialog, draft, settings, page, onSave);
  try {
    dialog.showModal();
  } catch {
    dialog.show();
  }
}

function ensureThemeDialog() {
  let dialog = document.querySelector("#themeEditorDialog");
  if (dialog) return dialog;
  dialog = document.createElement("dialog");
  dialog.id = "themeEditorDialog";
  dialog.className = "settings-dialog theme-editor-dialog";
  document.body.appendChild(dialog);
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  return dialog;
}

function renderThemeDialog(dialog, draft, settings, page, onSave) {
  const ownerRows = draft.ownerColors.length ? draft.ownerColors : [{ name: "", color: "#ff9ed2" }];
  dialog.innerHTML = `
    <form class="settings-modal theme-editor-modal glass" method="dialog">
      <div class="modal-head">
        <div><p class="eyebrow">Theme</p><h2>Edit theme</h2></div>
        <div class="modal-head-actions">
          <button class="primary-button modal-head-save" type="submit">Save</button>
          <button class="icon-button" type="button" data-theme-close title="Close" aria-label="Close">×</button>
        </div>
      </div>
      <section class="theme-editor-grid">
        ${colorField("mainColor", "Main color", draft.mainColor, false, false, "theme-main-color")}
        ${colorField("accentColor", "Accent color", draft.accentColor, false, false, "theme-accent-color")}
        ${colorField("gradientColor", "Gradient color", draft.gradientColor, false, false, "theme-gradient-color")}
        ${colorField("extraColor", "Extra color", draft.extraColor, false, false, "theme-extra-color")}
        <div class="theme-editor-row theme-controls-row">
          <label class="settings-detail-compact theme-mode-field"><span>Theme</span><select name="mode"><option value="dark" ${draft.mode === "dark" ? "selected" : ""}>Dark</option><option value="light" ${draft.mode === "light" ? "selected" : ""}>Light (WIP)</option></select></label>
          <label class="settings-detail-compact theme-font-field"><span>Title font</span><select name="accentFont" style="font-family:${htmlEscape(FONT_OPTIONS.find((font) => font.value === draft.accentFont)?.family || "Cascadia Code")}">${FONT_OPTIONS.map((font) => `<option value="${htmlEscape(font.value)}" style="font-family:${htmlEscape(font.family)}" ${draft.accentFont === font.value ? "selected" : ""}>${htmlEscape(font.label)}</option>`).join("")}</select></label>
          <label class="check-filter toggle-check theme-check"><input name="gradient" type="checkbox" ${draft.gradient ? "checked" : ""}><span>Gradient titles</span></label>
          <label class="check-filter toggle-check theme-check"><input name="uppercaseTitles" type="checkbox" ${draft.uppercaseTitles ? "checked" : ""}><span>Uppercase Titles</span></label>
          <label class="check-filter toggle-check theme-check"><input name="disableGlow" type="checkbox" ${draft.disableGlow ? "" : "checked"}><span>Background glows</span></label>
        </div>
        <div class="theme-editor-row theme-glow-row" ${draft.disableGlow ? "hidden" : ""}>
          <label class="settings-detail-compact"><span>Glow 1</span>${glowSelect("glowPrimary", draft.glowPrimary)}</label>
          <label class="settings-detail-compact"><span>Glow 2</span>${glowSelect("glowSecondary", draft.glowSecondary)}</label>
        </div>
        <div class="theme-editor-separator" role="presentation"></div>
        <div class="theme-editor-row theme-icon-row">
          ${imageField("gamelistIcon", "Gamelist icon", draft.gamelistIcon)}
          ${imageField("shelfIcon", "Shelf icon", draft.shelfIcon)}
        </div>
        <label class="check-filter toggle-check theme-check theme-big-logo-row"><input name="bigLogo" type="checkbox" ${draft.bigLogo ? "checked" : ""}><span>Big logo</span></label>
        <div class="theme-editor-row theme-media-row">
          ${imageField("appIcon", "Game app icon", draft.appIcon)}
          ${imageField("backgroundImage", "Custom Background", draft.backgroundImage)}
        </div>
      </section>
      <section class="settings-section">
        <h3>Custom Owner Colors</h3>
        <div class="theme-owner-table">
          <div class="theme-owner-head"><span>Owner</span><span>Main color</span><span>Pick</span><span></span></div>
          <div data-owner-rows>${ownerRows.map(ownerRow).join("")}</div>
          <button class="ghost-button" type="button" data-owner-add>Add owner color</button>
        </div>
      </section>
      <div class="modal-actions"><button class="primary-button" type="submit">Save</button></div>
    </form>
  `;
  const form = dialog.querySelector("form");
  dialog.querySelector("[data-theme-close]")?.addEventListener("click", () => dialog.close());
  form.querySelector("[name='accentFont']")?.addEventListener("change", (event) => {
    event.currentTarget.style.fontFamily = FONT_OPTIONS.find((font) => font.value === event.currentTarget.value)?.family || "Cascadia Code";
  });
  form.querySelector("[name='disableGlow']")?.addEventListener("change", (event) => {
    form.querySelector(".theme-glow-row")?.toggleAttribute("hidden", !event.currentTarget.checked);
  });
  form.querySelector("[data-owner-add]")?.addEventListener("click", () => {
    const rows = form.querySelector("[data-owner-rows]");
    rows.insertAdjacentHTML("beforeend", ownerRow({ name: "", color: "#79f2ce" }));
  });
  form.addEventListener("click", (event) => {
    const remove = event.target.closest("[data-owner-remove]");
    if (remove) remove.closest(".theme-owner-row")?.remove();
  });
  form.querySelectorAll("[data-image-input]").forEach((input) => {
    input.addEventListener("change", async () => {
      const file = input.files?.[0];
      if (!file) return;
      const compressed = await compressImageFile(file, input.dataset.imageInput === "backgroundImage" ? 1800 : 512);
      const text = form.querySelector(`[name="${input.dataset.imageInput}"]`);
      if (text) text.value = compressed;
    });
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const nextTheme = normalizeThemeSettings({ ...settings, customTheme: readThemeForm(form, draft) });
    await onSave?.({ ...settings, theme: "custom", customTheme: nextTheme });
    dialog.close();
  });
}

function colorField(name, label, value, reset, hasReset, className = "") {
  return `
    <div class="theme-color-field ${htmlEscape(className)}">
      <label><span>${htmlEscape(label)}</span><input name="${name}" value="${htmlEscape(value)}" pattern="#?[0-9a-fA-F]{6}" inputmode="text"></label>
      <input class="theme-color-picker" type="color" data-color-for="${name}" value="${htmlEscape(value)}" onchange="this.form.elements['${name}'].value=this.value">
    </div>
  `;
}

function glowSelect(name, value) {
  const options = [
    ["main", "Main"],
    ["accent", "Accent"],
    ["gradient", "Gradient"],
    ["extra", "Extra Color"],
  ];
  return `<select name="${name}">${options.map(([source, label]) => `<option value="${source}" ${value === source ? "selected" : ""}>${label}</option>`).join("")}</select>`;
}

function imageField(name, label, value) {
  return `
    <label class="settings-detail-compact theme-image-field">
      <span>${htmlEscape(label)}</span>
      <input name="${name}" value="${htmlEscape(value || "")}" placeholder="Upload or paste URL">
      <input type="file" accept="image/*" data-image-input="${name}">
    </label>
  `;
}

function ownerRow(owner) {
  return `
    <div class="theme-owner-row">
      <input name="ownerName" value="${htmlEscape(owner.name || "")}" placeholder="Owner">
      <input name="ownerColor" value="${htmlEscape(owner.color || "#79f2ce")}" pattern="#?[0-9a-fA-F]{6}">
      <input class="theme-color-picker" type="color" value="${htmlEscape(owner.color || "#79f2ce")}" onchange="this.previousElementSibling.value=this.value">
      <button class="icon-button" type="button" data-owner-remove title="Remove" aria-label="Remove">×</button>
    </div>
  `;
}

function readThemeForm(form, draft) {
  const value = (name) => form.elements[name]?.value || "";
  const ownerNames = [...form.querySelectorAll("[name='ownerName']")];
  const ownerColors = [...form.querySelectorAll("[name='ownerColor']")];
  return normalizeThemeSettings({
    customTheme: {
      ...draft,
      mainColor: normalizeHex(value("mainColor")) || draft.mainColor,
      mainColorReset: Boolean(form.elements.mainColorReset?.checked),
      gradient: Boolean(form.elements.gradient?.checked),
      uppercaseTitles: Boolean(form.elements.uppercaseTitles?.checked),
      gradientColor: normalizeHex(value("gradientColor")) || draft.gradientColor,
      accentColor: normalizeHex(value("accentColor")) || draft.accentColor,
      accentColorReset: Boolean(form.elements.accentColorReset?.checked),
      extraColor: normalizeHex(value("extraColor")) || draft.extraColor,
      mode: value("mode") === "light" ? "light" : "dark",
      disableGlow: !Boolean(form.elements.disableGlow?.checked),
      glowPrimary: value("glowPrimary") || draft.glowPrimary,
      glowSecondary: value("glowSecondary") || draft.glowSecondary,
      bigLogo: Boolean(form.elements.bigLogo?.checked),
      accentFont: value("accentFont"),
      backgroundImage: value("backgroundImage"),
      gamelistIcon: value("gamelistIcon"),
      shelfIcon: value("shelfIcon"),
      appIcon: value("appIcon"),
      ownerColors: ownerNames.map((input, index) => ({ name: input.value, color: ownerColors[index]?.value || "" })),
    },
  });
}

async function compressImageFile(file, maxSize) {
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
    const scale = Math.min(1, maxSize / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/webp", maxSize > 600 ? 0.76 : 0.82);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function applyOwnerStyle(ownerColors) {
  let style = document.querySelector("#customOwnerColorStyles");
  if (!style) {
    style = document.createElement("style");
    style.id = "customOwnerColorStyles";
    document.head.appendChild(style);
  }
  style.textContent = ownerColors.map(({ name, color }) => {
    const slug = normalizeOwnerSlug(name);
    const glow = colorMix(color, 0.12);
    const fill = colorMix(color, 0.18);
    const faint = colorMix(color, 0.04);
    const border = colorMix(color, 0.36);
    return `
      .owner-color-${slug}, .owner-pill.owner-color-${slug} { color: ${color} !important; }
      .owner-pill.owner-color-${slug} {
        background: ${colorMix(color, 0.16)} !important;
        border-color: ${colorMix(color, 0.48)} !important;
      }
      .owner-color-card-${slug}, .owner-color-card-${slug}:hover {
        background: linear-gradient(135deg, ${fill}, ${faint} 42%, var(--owner-card-base)), var(--panel) !important;
        border-color: ${border} !important;
        box-shadow: 0 0 20px ${glow} !important;
      }
      .playing-finished-game.owner-color-card-${slug} strong,
      .completed-row.owner-color-card-${slug} strong { color: ${color} !important; }
    `;
  }).join("\n");
}

export function ownerColorClass(owner) {
  return `owner-color-${normalizeOwnerSlug(owner)}`;
}

export function ownerCardColorClass(owner) {
  return `owner-color-card-${normalizeOwnerSlug(owner)}`;
}

export function normalizeOwnerSlug(value) {
  return cleanOwnerName(value).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "owner";
}

function fontFamily(value) {
  const font = FONT_OPTIONS.find((item) => item.value === value);
  if (!font || !font.value) return "\"Cascadia Code\", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";
  return `"${font.family}", "Cascadia Code", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`;
}

function normalizeHex(value) {
  const raw = String(value || "").trim();
  const match = raw.match(/^#?([0-9a-fA-F]{6})$/);
  return match ? `#${match[1].toLowerCase()}` : "";
}

function glowSource(value, fallback) {
  return ["main", "accent", "gradient", "extra"].includes(value) ? value : fallback;
}

function themeColorBySource(theme, source) {
  if (source === "accent") return theme.accentColor;
  if (source === "gradient") return theme.gradientColor;
  if (source === "extra") return theme.extraColor;
  return theme.mainColor;
}

function hexColor(value, fallback) {
  return normalizeHex(value) || fallback;
}

function colorMix(hex, alpha) {
  const color = normalizeHex(hex) || "#ffffff";
  const int = Number.parseInt(color.slice(1), 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function defaultThemeIcon(kind, color, reset) {
  const defaults = { gamelist: "assets/Icon.png", shelf: "assets/Icon_shelf.png", app: "assets/app-Icon.png" };
  const fill = normalizeHex(color);
  if (reset || !fill) return defaults[kind] || defaults.gamelist;
  try {
    return localStorage.getItem(tintedIconCacheKey(kind, fill)) || defaults[kind] || defaults.gamelist;
  } catch {
    return defaults[kind] || defaults.gamelist;
  }
}

function tintDefaultThemeIcons(settings, theme, page) {
  if (theme.mainColorReset) return;
  const custom = normalizeThemeSettings(settings);
  const jobs = [];
  const pageIconKey = page === "shelf" ? "shelfIcon" : "gamelistIcon";
  const pageKind = page === "shelf" ? "shelf" : "gamelist";
  if (!custom[pageIconKey]) jobs.push({ kind: pageKind, source: pageKind === "shelf" ? "assets/Icon_shelf.png" : "assets/Icon.png", selector: "link[rel='icon']", brand: true });
  if (page === "gamelist" && !custom.appIcon) jobs.push({ kind: "app", source: "assets/app-Icon.png", selector: "link[rel='apple-touch-icon']", manifest: true });
  jobs.forEach((job) => {
    tintIcon(job.source, theme.mainColor, job.kind).then((url) => {
      if (!url) return;
      document.querySelector(job.selector)?.setAttribute("href", url);
      if (job.brand) {
        const brandMark = document.querySelector(".brand-mark");
        if (brandMark) brandMark.src = url;
      }
      if (job.manifest) {
        const manifest = document.querySelector("link[rel='manifest']");
        if (manifest) manifest.setAttribute("href", themedManifestUrl({ ...theme, appIcon: url }));
      }
    });
  });
}

async function tintIcon(source, color, kind) {
  const fill = normalizeHex(color);
  if (!fill) return "";
  const cacheKey = tintedIconCacheKey(kind, fill);
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) return cached;
    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = source;
    });
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth || image.width;
    canvas.height = image.naturalHeight || image.height;
    const context = canvas.getContext("2d");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    context.globalCompositeOperation = "source-in";
    context.fillStyle = fill;
    context.fillRect(0, 0, canvas.width, canvas.height);
    const url = canvas.toDataURL("image/png");
    localStorage.setItem(cacheKey, url);
    return url;
  } catch {
    return "";
  }
}

function tintedIconCacheKey(kind, color) {
  return `gamelist:tinted-icon:${kind}:${normalizeHex(color) || color}`;
}

function safeImage(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^data:image\/(?:png|jpe?g|webp|gif);base64,/i.test(raw)) return raw;
  if (/^(?:https?:\/\/|assets\/|\/assets\/)/i.test(raw)) return raw;
  return "";
}

function warmThemeImages(theme) {
  [theme.icon, theme.appIcon, theme.backgroundImage].filter(Boolean).forEach((src) => {
    try {
      const image = new Image();
      image.decoding = "async";
      image.src = src;
    } catch {}
  });
}

function absoluteAsset(value) {
  if (/^data:image\//.test(value)) return value;
  return value.startsWith("/") ? value : `/${value}`;
}

function cleanOwnerName(value) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, 40);
}

function structuredCloneSafe(value) {
  try {
    return structuredClone(value);
  } catch {
    return JSON.parse(JSON.stringify(value));
  }
}

function cssEscape(value) {
  return String(value).replace(/["\\]/g, "\\$&");
}

function htmlEscape(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
}
