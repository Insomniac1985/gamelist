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
  appIcon: "assets/app-Icon.png",
  appIconMonochrome: "assets/app-Icon-monochrome.png",
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
    appIconMonochrome: "assets/kh_app-icon-monochrome.png",
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
    appIconMonochrome: safeImage(raw.appIconMonochrome),
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
  const isSpanish = String(settings.language || "").toLowerCase().startsWith("es");
  const mainColor = theme.mainColorReset ? DEFAULT_THEME.mainColor : theme.mainColor;
  const accentColor = theme.accentColorReset ? DEFAULT_THEME.accentColor : theme.accentColor;
  const accent3 = theme.accent3 || DEFAULT_THEME.accent3;
  return {
    ...theme,
    owner,
    title: isSpanish ? `${isShelf ? "Estantería" : "Juegos"} de ${owner}` : `${owner}'s ${isShelf ? "Shelf" : "Gamelist"}`,
    shortName: isSpanish ? (isShelf ? "Estantería" : "Juegos") : (isShelf ? "Shelf" : "Gamelist"),
    mainColor,
    accentColor,
    accent3,
    // Kash's brand marks are chosen by the configured username, not by a
    // theme preset or any legacy custom image values.
    icon: owner.toLowerCase() === "kash"
      ? PRESETS.kash[isShelf ? "shelfIcon" : "gamelistIcon"]
      : (theme[isShelf ? "shelfIcon" : "gamelistIcon"] || defaultThemeIcon(isShelf ? "shelf" : "gamelist", mainColor, theme.mainColorReset)),
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
  root.classList.toggle("theme-font-default", !theme.accentFont);
  root.classList.toggle("theme-font-antique", theme.accentFont === "antique");
  root.classList.toggle("theme-font-pokemon", theme.accentFont === "pokemon");
  root.classList.toggle("theme-font-michroma", theme.accentFont === "michroma");
  root.classList.toggle("theme-font-mata", theme.accentFont === "mata");
  body?.classList.toggle("theme-kash", settings.theme === "kash");
  body?.classList.toggle("theme-light", theme.mode === "light");
  body?.classList.toggle("theme-no-glow", theme.disableGlow);
  body?.classList.toggle("theme-gradient", theme.gradient);
  body?.classList.toggle("theme-uppercase-titles", theme.uppercaseTitles);
  body?.classList.toggle("theme-big-logo", theme.bigLogo);
  body?.classList.toggle("theme-font-default", !theme.accentFont);
  body?.classList.toggle("theme-font-antique", theme.accentFont === "antique");
  body?.classList.toggle("theme-font-pokemon", theme.accentFont === "pokemon");
  body?.classList.toggle("theme-font-michroma", theme.accentFont === "michroma");
  body?.classList.toggle("theme-font-mata", theme.accentFont === "mata");
  root.style.setProperty("--accent", theme.mainColor);
  root.style.setProperty("--accent-1", theme.accentColor);
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
    icons: [
      {
        src: absoluteAsset(theme.appIcon),
        sizes: "400x400",
        type: "image/png",
        purpose: "any maskable",
      },
      {
        src: absoluteAsset(theme.appIconMonochrome),
        sizes: "400x400",
        type: "image/png",
        purpose: "monochrome",
      },
    ],
  };

  return `data:application/manifest+json,${encodeURIComponent(JSON.stringify(manifest))}`;
}

export function themeSettingsButton(settings, escapeHtml = htmlEscape, translate = identityTranslate) {
  const theme = resolveSiteTheme(settings);
  return `
    <article class="settings-layout-card settings-theme-card" data-layout-key="theme">
      <div class="settings-theme-select">
        <span>${escapeHtml(translate("Theme"))}</span>
        <button class="settings-theme-edit-button" type="button" data-theme-editor>
          <span>${escapeHtml(translate("Edit theme"))}</span>
        </button>
      </div>
    </article>
  `;
}

export function themeSettingsContent(settings = {}, translate = identityTranslate) {
  const draft = normalizeThemeSettings(settings);
  const ownerRows = draft.ownerColors.length ? draft.ownerColors : [{ name: "", color: "#ff9ed2" }];
  return `
    <div class="theme-inline-content">
      <section class="theme-editor-grid">
        ${colorField("mainColor", "Main color", draft.mainColor, false, false, "theme-main-color", translate)}
        ${colorField("accentColor", "Accent color", draft.accentColor, false, false, "theme-accent-color", translate)}
        ${colorField("gradientColor", "Gradient color", draft.gradientColor, false, false, "theme-gradient-color", translate)}
        ${colorField("extraColor", "Extra color", draft.extraColor, false, false, "theme-extra-color", translate)}
        <div class="theme-editor-row theme-selects-row">
          <label class="settings-detail-compact theme-mode-field"><span>${htmlEscape(translate("Theme"))}</span><select name="mode"><option value="dark" ${draft.mode === "dark" ? "selected" : ""}>${htmlEscape(translate("Dark"))}</option><option value="light" ${draft.mode === "light" ? "selected" : ""}>${htmlEscape(translate("Light (WIP)"))}</option></select></label>
          <label class="settings-detail-compact theme-font-field"><span>${htmlEscape(translate("Title font"))}</span><select name="accentFont" style="font-family:&quot;${htmlEscape(FONT_OPTIONS.find((font) => font.value === draft.accentFont)?.family || "Cascadia Code")}&quot;">${FONT_OPTIONS.map((font) => `<option value="${htmlEscape(font.value)}" style="font-family:&quot;${htmlEscape(font.family)}&quot;" ${draft.accentFont === font.value ? "selected" : ""}>${htmlEscape(font.label)}</option>`).join("")}</select></label>
        </div>
        <div class="theme-editor-row theme-controls-row">
          <label class="check-filter toggle-check theme-check"><input name="bigLogo" type="checkbox" ${draft.bigLogo ? "checked" : ""}><span>${htmlEscape(translate("Big logo"))}</span></label>
          <label class="check-filter toggle-check theme-check"><input name="gradient" type="checkbox" ${draft.gradient ? "checked" : ""}><span>${htmlEscape(translate("Gradient titles"))}</span></label>
          <label class="check-filter toggle-check theme-check"><input name="uppercaseTitles" type="checkbox" ${draft.uppercaseTitles ? "checked" : ""}><span>${htmlEscape(translate("Uppercase Titles"))}</span></label>
          <label class="check-filter toggle-check theme-check"><input name="disableGlow" type="checkbox" ${draft.disableGlow ? "" : "checked"}><span>${htmlEscape(translate("Background glows"))}</span></label>
        </div>
        <div class="theme-editor-row theme-glow-row" ${draft.disableGlow ? "hidden" : ""}>
          <label class="settings-detail-compact"><span>${htmlEscape(translate("Background Glow 1"))}</span>${glowSelect("glowPrimary", draft.glowPrimary, translate)}</label>
          <label class="settings-detail-compact"><span>${htmlEscape(translate("Background Glow 2"))}</span>${glowSelect("glowSecondary", draft.glowSecondary, translate)}</label>
        </div>
      </section>
      <section class="settings-section">
        <h3 class="theme-owner-colors-title">${htmlEscape(translate("Custom Owner Colors"))}</h3>
        <div class="theme-owner-table">
          <div class="theme-owner-head"><span>${htmlEscape(translate("Owner"))}</span><span>${htmlEscape(translate("Main color"))}</span><span></span><span></span></div>
          <div data-owner-rows>${ownerRows.map((owner) => ownerRow(owner, translate)).join("")}</div>
          <button class="ghost-button theme-owner-add-button" type="button" data-owner-add><span>${htmlEscape(translate("Add owner color"))}</span><span class="button-icon" aria-hidden="true"><svg class="plus-icon" viewBox="0 0 24 24"><path d="M12 5v14"></path><path d="M5 12h14"></path></svg></span></button>
        </div>
      </section>
    </div>
  `;
}

export function bindThemeSettingsContent(root, translate = identityTranslate) {
  bindThemeEditorControls(root, translate);
}

export function readThemeSettingsContent(root, settings = {}) {
  const draft = normalizeThemeSettings(settings);
  return normalizeThemeSettings({ ...settings, customTheme: readThemeForm(root, draft) });
}

export function openThemeEditor({ settings = {}, onSave, page = "gamelist", translate = identityTranslate }) {
  const dialog = ensureThemeDialog();
  const draft = structuredCloneSafe(normalizeThemeSettings(settings));
  renderThemeDialog(dialog, draft, settings, page, onSave, translate);
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

function renderThemeDialog(dialog, draft, settings, page, onSave, translate = identityTranslate) {
  const ownerRows = draft.ownerColors.length ? draft.ownerColors : [{ name: "", color: "#ff9ed2" }];
  dialog.innerHTML = `
    <form class="settings-modal theme-editor-modal glass" method="dialog">
      <div class="modal-head">
        <div><p class="eyebrow">${htmlEscape(translate("Theme"))}</p><h2>${htmlEscape(translate("Edit theme"))}</h2></div>
        <div class="modal-head-actions">
          <button class="primary-button modal-head-save" type="submit">${htmlEscape(translate("Save"))}</button>
          <button class="icon-button" type="button" data-theme-close title="${htmlEscape(translate("Close"))}" aria-label="${htmlEscape(translate("Close"))}">×</button>
        </div>
      </div>
      <section class="theme-editor-grid">
        ${colorField("mainColor", "Main color", draft.mainColor, false, false, "theme-main-color", translate)}
        ${colorField("accentColor", "Accent color", draft.accentColor, false, false, "theme-accent-color", translate)}
        ${colorField("gradientColor", "Gradient color", draft.gradientColor, false, false, "theme-gradient-color", translate)}
        ${colorField("extraColor", "Extra color", draft.extraColor, false, false, "theme-extra-color", translate)}
        <div class="theme-editor-row theme-selects-row">
          <label class="settings-detail-compact theme-mode-field"><span>${htmlEscape(translate("Theme"))}</span><select name="mode"><option value="dark" ${draft.mode === "dark" ? "selected" : ""}>${htmlEscape(translate("Dark"))}</option><option value="light" ${draft.mode === "light" ? "selected" : ""}>${htmlEscape(translate("Light (WIP)"))}</option></select></label>
          <label class="settings-detail-compact theme-font-field"><span>${htmlEscape(translate("Title font"))}</span><select name="accentFont" style="font-family:&quot;${htmlEscape(FONT_OPTIONS.find((font) => font.value === draft.accentFont)?.family || "Cascadia Code")}&quot;">${FONT_OPTIONS.map((font) => `<option value="${htmlEscape(font.value)}" style="font-family:&quot;${htmlEscape(font.family)}&quot;" ${draft.accentFont === font.value ? "selected" : ""}>${htmlEscape(font.label)}</option>`).join("")}</select></label>
        </div>
        <div class="theme-editor-row theme-controls-row">
          <label class="check-filter toggle-check theme-check"><input name="bigLogo" type="checkbox" ${draft.bigLogo ? "checked" : ""}><span>${htmlEscape(translate("Big logo"))}</span></label>
          <label class="check-filter toggle-check theme-check"><input name="gradient" type="checkbox" ${draft.gradient ? "checked" : ""}><span>${htmlEscape(translate("Gradient titles"))}</span></label>
          <label class="check-filter toggle-check theme-check"><input name="uppercaseTitles" type="checkbox" ${draft.uppercaseTitles ? "checked" : ""}><span>${htmlEscape(translate("Uppercase Titles"))}</span></label>
          <label class="check-filter toggle-check theme-check"><input name="disableGlow" type="checkbox" ${draft.disableGlow ? "" : "checked"}><span>${htmlEscape(translate("Background glows"))}</span></label>
        </div>
        <div class="theme-editor-row theme-glow-row" ${draft.disableGlow ? "hidden" : ""}>
          <label class="settings-detail-compact"><span>${htmlEscape(translate("Background Glow 1"))}</span>${glowSelect("glowPrimary", draft.glowPrimary, translate)}</label>
          <label class="settings-detail-compact"><span>${htmlEscape(translate("Background Glow 2"))}</span>${glowSelect("glowSecondary", draft.glowSecondary, translate)}</label>
        </div>
      </section>
      <section class="settings-section">
        <h3 class="theme-owner-colors-title">${htmlEscape(translate("Custom Owner Colors"))}</h3>
        <div class="theme-owner-table">
          <div class="theme-owner-head"><span>${htmlEscape(translate("Owner"))}</span><span>${htmlEscape(translate("Main color"))}</span><span></span><span></span></div>
          <div data-owner-rows>${ownerRows.map((owner) => ownerRow(owner, translate)).join("")}</div>
          <button class="ghost-button theme-owner-add-button" type="button" data-owner-add><span>${htmlEscape(translate("Add owner color"))}</span><span class="button-icon" aria-hidden="true"><svg class="plus-icon" viewBox="0 0 24 24"><path d="M12 5v14"></path><path d="M5 12h14"></path></svg></span></button>
        </div>
      </section>
      <div class="modal-actions"><button class="primary-button" type="submit">${htmlEscape(translate("Save"))}</button></div>
    </form>
  `;
  const form = dialog.querySelector("form");
  dialog.querySelector("[data-theme-close]")?.addEventListener("click", () => dialog.close());
  bindThemeEditorControls(form, translate);
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const nextTheme = normalizeThemeSettings({ ...settings, customTheme: readThemeForm(form, draft) });
    await onSave?.({ ...settings, theme: "custom", customTheme: nextTheme });
    dialog.close();
  });
}

function bindThemeEditorControls(root, translate) {
  root.querySelector("[name='accentFont']")?.addEventListener("change", (event) => {
    event.currentTarget.style.fontFamily = `"${FONT_OPTIONS.find((font) => font.value === event.currentTarget.value)?.family || "Cascadia Code"}"`;
  });
  root.querySelector("[name='disableGlow']")?.addEventListener("change", (event) => {
    root.querySelector(".theme-glow-row")?.toggleAttribute("hidden", !event.currentTarget.checked);
  });
  root.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-glow-trigger]");
    const option = event.target.closest("[data-glow-option]");
    if (option) {
      const picker = option.closest("[data-glow-select]");
      const source = option.dataset.glowOption;
      const value = picker?.querySelector("[data-glow-value]");
      if (picker && value) {
        value.value = source;
        picker.querySelector("[data-glow-current]").textContent = option.querySelector("[data-glow-option-label]").textContent;
        picker.querySelectorAll("[data-glow-option]").forEach((item) => item.setAttribute("aria-checked", String(item === option)));
        picker.querySelector("[data-glow-options]").hidden = true;
        picker.classList.remove("is-open");
        picker.querySelector("[data-glow-trigger]").setAttribute("aria-expanded", "false");
        updateGlowPickerColors(root);
      }
      return;
    }
    if (trigger) {
      const picker = trigger.closest("[data-glow-select]");
      const options = picker?.querySelector("[data-glow-options]");
      if (!picker || !options) return;
      root.querySelectorAll("[data-glow-options]").forEach((list) => {
        if (list !== options) {
          list.hidden = true;
          list.closest("[data-glow-select]")?.classList.remove("is-open");
        }
      });
      options.hidden = !options.hidden;
      picker.classList.toggle("is-open", !options.hidden);
      trigger.setAttribute("aria-expanded", String(!options.hidden));
      return;
    }
    root.querySelectorAll("[data-glow-options]").forEach((list) => {
      list.hidden = true;
      list.closest("[data-glow-select]")?.classList.remove("is-open");
    });
    root.querySelectorAll("[data-glow-trigger]").forEach((button) => button.setAttribute("aria-expanded", "false"));
  });
  root.addEventListener("input", (event) => {
    if (["mainColor", "accentColor", "gradientColor", "extraColor"].includes(event.target.name)) updateGlowPickerColors(root);
  });
  root.addEventListener("change", (event) => {
    if (event.target.matches("[data-color-for]")) updateGlowPickerColors(root);
  });
  updateGlowPickerColors(root);
  root.querySelector("[data-owner-add]")?.addEventListener("click", () => {
    root.querySelector("[data-owner-rows]")?.insertAdjacentHTML("beforeend", ownerRow({ name: "", color: "#79f2ce" }, translate));
  });
  root.addEventListener("click", (event) => {
    const remove = event.target.closest("[data-owner-remove]");
    if (remove) remove.closest(".theme-owner-row")?.remove();
  });
}

function colorField(name, label, value, reset, hasReset, className = "", translate = identityTranslate) {
  return `
    <div class="theme-color-field ${htmlEscape(className)}">
      <label><span>${htmlEscape(translate(label))}</span><input name="${name}" value="${htmlEscape(value)}" pattern="#?[0-9a-fA-F]{6}" inputmode="text"></label>
      <input class="theme-color-picker" type="color" data-color-for="${name}" value="${htmlEscape(value)}" onchange="this.form.elements['${name}'].value=this.value">
    </div>
  `;
}

function glowSelect(name, value, translate = identityTranslate) {
  const options = [
    ["main", "Main"],
    ["accent", "Accent"],
    ["gradient", "Gradient"],
    ["extra", "Extra Color"],
  ];
  const selected = options.find(([source]) => source === value) || options[0];
  return `<div class="theme-glow-select" data-glow-select><input type="hidden" name="${name}" data-glow-value value="${selected[0]}"><button class="theme-glow-trigger" type="button" data-glow-trigger aria-haspopup="true" aria-expanded="false"><span class="theme-glow-swatch" data-glow-current-swatch aria-hidden="true"></span><span data-glow-current>${htmlEscape(translate(selected[1]))}</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5"></path></svg></button><div class="theme-glow-options" data-glow-options hidden>${options.map(([source, label]) => `<button class="theme-glow-option" type="button" role="menuitemradio" aria-checked="${source === selected[0]}" data-glow-option="${source}"><span class="theme-glow-swatch" data-glow-swatch aria-hidden="true"></span><span data-glow-option-label>${htmlEscape(translate(label))}</span></button>`).join("")}</div></div>`;
}

function updateGlowPickerColors(root) {
  const colors = {
    main: root.querySelector("[name='mainColor']")?.value || "#ff0039",
    accent: root.querySelector("[name='accentColor']")?.value || "#79f2ce",
    gradient: root.querySelector("[name='gradientColor']")?.value || "#ff00a2",
    extra: root.querySelector("[name='extraColor']")?.value || "#3300ff",
  };
  root.querySelectorAll("[data-glow-select]").forEach((picker) => {
    const color = colors[picker.querySelector("[data-glow-value]")?.value] || colors.main;
    picker.querySelector("[data-glow-current-swatch]").style.backgroundColor = color;
    picker.querySelectorAll("[data-glow-swatch]").forEach((swatch) => {
      swatch.style.backgroundColor = colors[swatch.closest("[data-glow-option]")?.dataset.glowOption] || colors.main;
    });
  });
}

function ownerRow(owner, translate = identityTranslate) {
  return `
    <div class="theme-owner-row">
      <input name="ownerName" value="${htmlEscape(owner.name || "")}" placeholder="${htmlEscape(translate("Owner"))}">
      <input name="ownerColor" value="${htmlEscape(owner.color || "#79f2ce")}" pattern="#?[0-9a-fA-F]{6}">
      <input class="theme-color-picker" type="color" value="${htmlEscape(owner.color || "#79f2ce")}" onchange="this.previousElementSibling.value=this.value">
      <button class="icon-button" type="button" data-owner-remove title="${htmlEscape(translate("Remove"))}" aria-label="${htmlEscape(translate("Remove"))}">×</button>
    </div>
  `;
}

function readThemeForm(form, draft) {
  const field = (name) => form.querySelector(`[name="${name}"]`);
  const value = (name) => field(name)?.value || "";
  const checked = (name) => Boolean(field(name)?.checked);
  const ownerNames = [...form.querySelectorAll("[name='ownerName']")];
  const ownerColors = [...form.querySelectorAll("[name='ownerColor']")];
  return normalizeThemeSettings({
    customTheme: {
      ...draft,
      mainColor: normalizeHex(value("mainColor")) || draft.mainColor,
      mainColorReset: checked("mainColorReset"),
      gradient: checked("gradient"),
      uppercaseTitles: checked("uppercaseTitles"),
      gradientColor: normalizeHex(value("gradientColor")) || draft.gradientColor,
      accentColor: normalizeHex(value("accentColor")) || draft.accentColor,
      accentColorReset: checked("accentColorReset"),
      extraColor: normalizeHex(value("extraColor")) || draft.extraColor,
      mode: value("mode") === "light" ? "light" : "dark",
      disableGlow: !checked("disableGlow"),
      glowPrimary: value("glowPrimary") || draft.glowPrimary,
      glowSecondary: value("glowSecondary") || draft.glowSecondary,
      bigLogo: checked("bigLogo"),
      accentFont: value("accentFont"),
      ownerColors: ownerNames.map((input, index) => ({ name: input.value, color: ownerColors[index]?.value || "" })),
    },
  });
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
      .owner-color-card-${slug} {
        background: linear-gradient(135deg, ${fill}, ${faint} 42%, rgba(255, 255, 255, 0.05)),  rgb(255 255 255 / 1%) !important;
        border-color: ${border} !important;
      }
      .owner-color-card-${slug}:hover {
        border-color: color-mix(in srgb, var(--accent) 50%, transparent) !important;
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

function identityTranslate(key) {
  return key;
}
